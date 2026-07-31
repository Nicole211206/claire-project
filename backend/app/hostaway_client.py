import math
from typing import Any

import httpx

HOSTAWAY_BASE = "https://api.hostaway.com/v1"

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
