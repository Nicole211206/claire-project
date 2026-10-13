"""Automação Limpeza & Caução: puxa as reservas do Hostaway e cria sozinha os
cards nos kanbans do módulo Limpeza & Caução da Claire.

Regras (definidas pela Nicole em 13/10/2026):
- Limpeza: só check-outs dos imóveis marcados em `nx_lc_imoveis` (os que exigem
  solicitação manual de limpeza) viram card em "A Solicitar".
- Caução: toda reserva que tem caução/depósito registrado no Hostaway vira card
  em "Aguardando Devolução", já com o valor.

Os cards entram no documento único da Claire (nx_limpeza / nx_caucao), com o
mesmo formato que o front grava (ver bloco LIMPEZA & CAUÇÃO em js/app.js).
Ids determinísticos a partir do id da reserva: rodar de novo nunca duplica, e
um card apagado na Claire vira tombstone e não é recriado.
"""

import asyncio
import copy
import logging
from datetime import date, timedelta
from typing import Any

import httpx

from . import crud
from .config import settings
from .db import SessionLocal
from .hostaway_client import CANAIS, HOSTAWAY_BASE, get_token
from .utils import iso_now, now_ms, to_number

logger = logging.getLogger(__name__)

# Faixas de id bem acima de Date.now() (~1,8e12) — não colidem com os ids
# criados pelo front nem entre si (ids de reserva do Hostaway são bem menores
# que 1e11).
ID_BASE_LIMPEZA = 8_000_000_000_000
ID_BASE_CAUCAO = 8_100_000_000_000

DIAS_ATRAS = 2       # check-outs recentes (ex.: card apagado sem querer ontem não volta, mas um que falhou volta)
DIAS_FRENTE = 7      # check-outs dos próximos 7 dias
DIAS_PROX_CHECKIN = 60  # janela pra achar o próximo check-in do mesmo imóvel
INTERVALO_SEGUNDOS = 30 * 60

STATUS_VALIDOS = {"new", "modified", "ownerstay"}
PALAVRAS_CAUCAO = ("deposit", "caução", "caucao", "damage")

TIMEOUT = httpx.Timeout(60.0)
PAGE_LIMIT = 100
MAX_PAGINAS = 50


async def _paginar(client: httpx.AsyncClient, token: str, path: str, params: dict) -> list[dict]:
    out: list[dict] = []
    vistos = set()
    offset = 0
    for _ in range(MAX_PAGINAS):
        r = await client.get(
            f"{HOSTAWAY_BASE}/{path}",
            params={**params, "limit": PAGE_LIMIT, "offset": offset},
            headers={"Authorization": f"Bearer {token}", "Cache-control": "no-cache"},
        )
        data = r.json()
        if data.get("status") == "fail":
            raise RuntimeError(f"Hostaway /{path}: {data.get('message') or data}")
        lote = data.get("result") or []
        for item in lote:
            if isinstance(item, dict) and item.get("id") not in vistos:
                vistos.add(item.get("id"))
                out.append(item)
        offset += PAGE_LIMIT
        total = data.get("count")
        if len(lote) < PAGE_LIMIT or (total is not None and offset >= total):
            break
    return out


async def buscar_listings(client: httpx.AsyncClient, token: str) -> list[dict]:
    lst = await _paginar(client, token, "listings", {})
    return [
        {
            "id": x.get("id"),
            "nome": x.get("internalListingName") or x.get("name") or "",
            "nomeExterno": x.get("name") or "",
            "endereco": x.get("address") or "",
        }
        for x in lst
    ]


def status_valido(r: dict) -> bool:
    return (r.get("status") or "").lower() in STATUS_VALIDOS


def valor_caucao(r: dict) -> float:
    """Valor de caução/depósito da reserva. O Hostaway não tem um campo único
    pra isso: pode vir como campo direto ou como item do financeField /
    reservationFees (nome/alias contendo "deposit"/"caução")."""
    for k in ("securityDepositFee", "damageDeposit", "securityDeposit", "refundableDamageDeposit"):
        v = to_number(r.get(k))
        if v > 0:
            return round(v, 2)
    itens = []
    for k in ("financeField", "reservationFees"):
        if isinstance(r.get(k), list):
            itens += [f for f in r[k] if isinstance(f, dict)]
    for f in itens:
        if f.get("isDeleted") in (1, True):
            continue
        rotulo = " ".join(str(f.get(c) or "") for c in ("name", "alias", "title", "type", "feeType")).lower()
        if any(p in rotulo for p in PALAVRAS_CAUCAO):
            v = to_number(f.get("value") if f.get("value") is not None else f.get("amount") or f.get("total"))
            if v > 0:
                return round(v, 2)
    return 0.0


def _hora(h: Any) -> str:
    try:
        h = int(h)
    except (TypeError, ValueError):
        return ""
    return f"{h:02d}:00" if 0 <= h <= 23 else ""


def _canal(r: dict) -> str:
    return CANAIS.get(r.get("channelId")) or r.get("channelName") or ""


def aplicar(state: dict, saidas: list[dict], chegadas: list[dict]) -> tuple[dict, dict]:
    """Função pura: recebe o documento atual + reservas e devolve (novo_doc, resumo)."""
    agora = now_ms()
    tombs = {t.get("id") for t in (state.get("nx_tombstones") or []) if isinstance(t, dict)}
    limpeza = list(state.get("nx_limpeza") or [])
    caucao = list(state.get("nx_caucao") or [])
    lz_por_id = {o.get("id"): o for o in limpeza if isinstance(o, dict)}
    cc_por_id = {o.get("id"): o for o in caucao if isinstance(o, dict)}

    imoveis_cfg = {}
    for im in state.get("nx_lc_imoveis") or []:
        if isinstance(im, dict) and im.get("id") is not None and im.get("ativo", True):
            imoveis_cfg[str(im["id"])] = im

    # próximo check-in de cada imóvel marcado: menor arrivalDate >= check-out
    chegadas_por_imovel: dict[str, list[str]] = {}
    for r in chegadas:
        if status_valido(r) and r.get("arrivalDate"):
            chegadas_por_imovel.setdefault(str(r.get("listingMapId")), []).append(r["arrivalDate"])
    for v in chegadas_por_imovel.values():
        v.sort()

    def prox_checkin(listing: str, checkout: str) -> str:
        for d in chegadas_por_imovel.get(listing, []):
            if d >= checkout:
                return d
        return ""

    resumo = {"limpezaCriados": 0, "limpezaAtualizados": 0, "caucaoCriados": 0, "reservasLidas": len(saidas)}

    for r in saidas:
        rid = r.get("id")
        if rid is None:
            continue
        listing = str(r.get("listingMapId"))
        checkout = r.get("departureDate") or ""
        valida = status_valido(r)

        # ── limpeza ──
        cfg = imoveis_cfg.get(listing)
        if cfg is not None:
            lid = ID_BASE_LIMPEZA + int(rid)
            existente = lz_por_id.get(lid)
            if existente is None and valida and lid not in tombs:
                card = {
                    "id": lid,
                    "status": "a_solicitar",
                    "hospede": r.get("guestName") or "",
                    "imovelExterno": cfg.get("nome") or r.get("listingName") or "",
                    "endereco": cfg.get("endereco") or "",
                    "responsavel": cfg.get("responsavel") or "",
                    "grupoWpp": cfg.get("grupoWpp") or "",
                    "checkin": prox_checkin(listing, checkout),
                    "checkout": checkout,
                    "dataLimpeza": checkout,
                    "horaLimpeza": _hora(r.get("checkOutTime")),
                    "obs": "",
                    "dataCriacao": iso_now(),
                    "origem": "hostaway",
                    "reservaId": rid,
                    "canal": _canal(r),
                    "_ts": agora,
                }
                limpeza.insert(0, card)
                lz_por_id[lid] = card
                resumo["limpezaCriados"] += 1
            elif existente is not None and existente.get("status") == "a_solicitar":
                # Card ainda não tratado: mantém em dia o que muda no Hostaway
                # (novo check-in entrando, reserva cancelada).
                mudou = False
                novo_ci = prox_checkin(listing, checkout)
                if novo_ci and novo_ci != existente.get("checkin"):
                    existente["checkin"] = novo_ci
                    mudou = True
                cancelada = not valida
                if bool(existente.get("reservaCancelada")) != cancelada:
                    existente["reservaCancelada"] = cancelada
                    mudou = True
                if mudou:
                    existente["_ts"] = agora
                    resumo["limpezaAtualizados"] += 1

        # ── caução ──
        valor = valor_caucao(r)
        cid = ID_BASE_CAUCAO + int(rid)
        if valida and valor > 0 and cid not in cc_por_id and cid not in tombs:
            card = {
                "id": cid,
                "status": "aguardando",
                "hospede": r.get("guestName") or "",
                "imovelExterno": r.get("listingName") or "",
                "valorCaucao": valor,
                "formaPagamento": "outro",
                "dadosBancarios": None,
                "checkout": checkout,
                "dataPrevistaDevolucao": "",
                "irregularidade": False,
                "manutencaoId": None,
                "dataCriacao": iso_now(),
                "origem": "hostaway",
                "reservaId": rid,
                "canal": _canal(r),
                "_ts": agora,
            }
            caucao.insert(0, card)
            cc_por_id[cid] = card
            resumo["caucaoCriados"] += 1

    novo = dict(state)
    novo["nx_limpeza"] = limpeza
    novo["nx_caucao"] = caucao
    return novo, resumo


async def sincronizar() -> dict:
    hoje = date.today()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        token = await get_token(client, settings.hostaway_account_id, settings.hostaway_api_key)
        saidas = await _paginar(client, token, "reservations", {
            "departureStartDate": (hoje - timedelta(days=DIAS_ATRAS)).isoformat(),
            "departureEndDate": (hoje + timedelta(days=DIAS_FRENTE)).isoformat(),
            "includeResources": 1,
        })
        chegadas = await _paginar(client, token, "reservations", {
            "arrivalStartDate": (hoje - timedelta(days=DIAS_ATRAS)).isoformat(),
            "arrivalEndDate": (hoje + timedelta(days=DIAS_PROX_CHECKIN)).isoformat(),
        })

    # Daqui pra baixo não tem await: ler, mesclar e gravar o documento acontece
    # sem ceder o event loop, então nenhum POST /save entra no meio.
    db = SessionLocal()
    try:
        # cópia profunda: o JSON do SQLAlchemy só grava se o objeto for outro
        state = copy.deepcopy(crud.get_state(db) or {})
        novo, resumo = aplicar(state, saidas, chegadas)
        resumo["ultimoSync"] = iso_now()
        resumo["ok"] = True
        novo["nx_lc_status"] = resumo
        crud.put_state(db, novo)
    finally:
        db.close()
    return resumo


def _gravar_erro(msg: str):
    db = SessionLocal()
    try:
        state = crud.get_state(db)
        if state is None:
            return
        state = copy.deepcopy(state)
        state["nx_lc_status"] = {**(state.get("nx_lc_status") or {}), "ok": False, "erro": msg[:300], "ultimaTentativa": iso_now()}
        crud.put_state(db, state)
    finally:
        db.close()


async def loop_automatico():
    """Roda junto com o servidor: sincroniza 1 min depois de subir e depois a cada 30 min."""
    if not (settings.hostaway_account_id and settings.hostaway_api_key):
        logger.info("limpeza/caução: sem credenciais do Hostaway, automação desligada.")
        return
    await asyncio.sleep(60)
    while True:
        try:
            resumo = await sincronizar()
            logger.info("limpeza/caução: %s", resumo)
        except Exception as e:  # nunca derruba o servidor
            logger.warning("limpeza/caução: falha na sincronização: %s", e)
            try:
                _gravar_erro(str(e))
            except Exception:
                pass
        await asyncio.sleep(INTERVALO_SEGUNDOS)
