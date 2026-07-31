import math
import time
from typing import Any

import httpx

from .config import settings

HOSTAWAY_BASE = settings.hostaway_base_url

# Fallback caso a resposta do Hostaway não traga expires_in: o token dura
# ~24 meses (confirmado pela própria API), então esse valor só entra em jogo
# se o campo vier ausente — não é o caminho normal.
FALLBACK_TOKEN_TTL_SECONDS = 24 * 30 * 24 * 3600

# Margem de segurança: renova um pouco antes do vencimento real, pra nunca
# usar um token que expirou entre o cache-hit e a chamada de fato à API.
TOKEN_SAFETY_MARGIN_SECONDS = 24 * 3600

# Cache em memória do processo — o token dura meses, não faz sentido pedir
# um novo a cada request. Reseta sozinho quando o serviço reinicia (barato:
# só refaz 1 chamada extra no próximo /reviews).
_token_cache: dict[str, Any] = {"token": None, "expires_at": 0.0}

# Mapa de canais do Hostaway (channelId -> nome).
CANAIS = {
    2000: "Direct", 2002: "HomeAway", 2005: "Airbnb", 2007: "Booking.com",
    2009: "Expedia", 2010: "Booking.com", 2013: "Vrbo", 2015: "Site Próprio",
    2018: "Airbnb",  # canal majoritário de Airbnb na conta WeCare
}

PAGE_LIMIT = 100
MAX_PAGINAS = 300  # teto de segurança, igual ao worker original


def _js_round(x: float) -> float:
    """Math.round() do JS: sempre arredonda .5 pra cima (Python round() usa banker's rounding)."""
    return math.floor(x + 0.5) if x >= 0 else math.ceil(x - 0.5)


def round2(x: float) -> float:
    return _js_round(x * 100) / 100


async def get_token(client: httpx.AsyncClient, account_id: str, api_key: str) -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    body = {
        "grant_type": "client_credentials",
        "client_id": account_id,
        "client_secret": api_key,
        "scope": "general",
    }
    r = await client.post(
        f"{HOSTAWAY_BASE}/accessTokens",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Cache-control": "no-cache"},
    )
    d = r.json()
    token = d.get("access_token")
    if not token:
        raise RuntimeError(f"Falha ao obter token do Hostaway: {d}")

    ttl = d.get("expires_in") or FALLBACK_TOKEN_TTL_SECONDS
    _token_cache["token"] = token
    _token_cache["expires_at"] = now + ttl - TOKEN_SAFETY_MARGIN_SECONDS
    return token


async def fetch_all_reviews(client: httpx.AsyncClient, token: str) -> tuple[dict[Any, dict], int | None]:
    """Paginação robusta: dedup por ID + usa o 'count' oficial do Hostaway pra saber quando parar."""
    offset = 0
    hostaway_count = None
    por_id: dict[Any, dict] = {}
    for _ in range(MAX_PAGINAS):
        r = await client.get(
            f"{HOSTAWAY_BASE}/reviews",
            params={"limit": PAGE_LIMIT, "offset": offset},
            headers={"Authorization": f"Bearer {token}", "Cache-control": "no-cache"},
        )
        data = r.json()
        if hostaway_count is None and data.get("count") is not None:
            hostaway_count = data["count"]
        lote = data.get("result") or []
        if not lote:
            break
        for rv in lote:
            if rv and rv.get("id") is not None:
                por_id[rv["id"]] = rv
        offset += PAGE_LIMIT
        if hostaway_count is not None and offset >= hostaway_count:
            break
    return por_id, hostaway_count


def rating_de_categorias(rv: dict) -> float | None:
    """Quando o rating principal vem vazio, calcula a média das sub-notas por categoria (escala 0-10)."""
    cats = rv.get("reviewCategory") or rv.get("reviewCategories") or []
    if not isinstance(cats, list) or not cats:
        return None
    nums = []
    for c in cats:
        if not isinstance(c, dict):
            continue
        v = c.get("rating") if c.get("rating") is not None else c.get("value")
        if v is None:
            continue
        try:
            nums.append(float(v))
        except (TypeError, ValueError):
            continue
    if not nums:
        return None
    return sum(nums) / len(nums)


def normalize_review(rv: dict) -> dict:
    status = (rv.get("status") or "").lower()
    rating_bruto = rv.get("rating") if rv.get("rating") is not None else rating_de_categorias(rv)
    publicada = status == "published" or rv.get("isPublished") is True or rv.get("isPublished") == 1
    return {
        "id": rv.get("id"),
        "rating": round2(rating_bruto) if rating_bruto is not None else None,
        "texto": rv.get("publicReview") or "",  # comentário externo (público)
        "comentarioInterno": rv.get("privateFeedback") or "",  # comentário interno (privado)
        "hospede": rv.get("guestName") or "",
        "imovel": rv.get("listingName") or "",
        "canalId": rv.get("channelId") or None,
        "canal": CANAIS.get(rv.get("channelId")) or rv.get("channelName") or "Outro",
        "data": rv.get("submittedAt") or rv.get("insertedOn") or rv.get("departureDate") or "",
        "checkout": rv.get("departureDate") or "",  # data de check-out (se disponível)
        "checkin": rv.get("arrivalDate") or "",
        "submittedAt": rv.get("submittedAt") or "",
        "publicada": publicada,
        "status": rv.get("status") or "",
        "tipo": rv.get("type") or "",  # guest-to-host | host-to-guest
        "reservaId": rv.get("reservationId") or None,
    }
