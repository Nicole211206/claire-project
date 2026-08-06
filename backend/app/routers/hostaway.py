import httpx
from fastapi import APIRouter, Depends, Query

from ..auth import auth_dependency
from ..config import settings
from ..hostaway_client import (
    HOSTAWAY_BASE,
    fetch_all_reviews,
    get_token,
    normalize_review,
    round2,
)

# Proxy pra API do Hostaway — sem persistência própria. O worker original
# (hostaway-worker.js) não checava token nenhum; aqui exige o mesmo token
# compartilhado dos demais routers (mesmo dependency de root.py/records.py/
# jarvis.py) — sem isso, qualquer site expunha dados privados de hóspede
# (comentarioInterno) e consumia a cota paga do Hostaway sem controle nenhum.
router = APIRouter(dependencies=[Depends(auth_dependency)])

TIMEOUT = httpx.Timeout(30.0)


async def _get_token(client: httpx.AsyncClient) -> str:
    return await get_token(client, settings.hostaway_account_id, settings.hostaway_api_key)


@router.get("/health")
async def health():
    return {"ok": True}


@router.get("/reviews")
async def reviews():
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        token = await _get_token(client)
        por_id, hostaway_count = await fetch_all_reviews(client, token)
    lst = [normalize_review(rv) for rv in por_id.values()]
    com_texto = sum(1 for x in lst if x["texto"] and x["texto"].strip())
    com_nota = sum(1 for x in lst if x["rating"] is not None)
    return {
        "reviews": lst,
        "total": len(lst),
        "hostawayCount": hostaway_count,
        "comTexto": com_texto,
        "comNota": com_nota,
    }


# Contagem de reservas por período de CHECK-OUT: /reservations?from=YYYY-MM-DD&to=YYYY-MM-DD
@router.get("/reservations")
async def reservations(from_: str | None = Query(None, alias="from"), to: str | None = None):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        token = await _get_token(client)
        params = {"limit": "1", "includeResources": "0"}
        if from_:
            params["departureStartDate"] = from_
        if to:
            params["departureEndDate"] = to
        r = await client.get(
            f"{HOSTAWAY_BASE}/reservations",
            params=params,
            headers={"Authorization": f"Bearer {token}", "Cache-control": "no-cache"},
        )
        data = r.json()
    # Hostaway devolve 'count' com o total que casa com o filtro
    total = data.get("count") if data.get("count") is not None else len(data.get("result") or [])
    return {"total": total}


# Estatísticas: números resumidos pra verificação rápida (resposta pequena)
@router.get("/stats")
async def stats(from_: str | None = Query(None, alias="from"), to: str | None = None):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        token = await _get_token(client)
        por_id, hostaway_count = await fetch_all_reviews(client, token)
    arr = [normalize_review(rv) for rv in por_id.values()]
    com_texto = sum(1 for x in arr if x["texto"] and x["texto"].strip())
    com_nota = sum(1 for x in arr if x["rating"] is not None)
    por_canal: dict = {}
    for x in arr:
        por_canal[x["canal"]] = por_canal.get(x["canal"], 0) + 1

    # Análise opcional por período de check-out: /stats?from=YYYY-MM-DD&to=YYYY-MM-DD
    periodo = None
    if from_ and to:
        def ref(x):
            return (x.get("checkout") or x.get("submittedAt") or x.get("data") or "")[:10]

        no_per = [x for x in arr if x["tipo"] == "guest-to-host" and from_ <= ref(x) <= to]
        reais = [x for x in no_per if x["rating"] is not None or (x["texto"] and x["texto"].strip())]
        com_nota_per = [x for x in no_per if x["rating"] is not None]
        media_nota = (sum(x["rating"] for x in com_nota_per) / len(com_nota_per)) if com_nota_per else None
        canal_per: dict = {}
        for x in reais:
            canal_per[x["canal"]] = canal_per.get(x["canal"], 0) + 1
        periodo = {
            "de": from_,
            "ate": to,
            "totalNoPeriodo": len(no_per),
            "avaliacoesReais": len(reais),
            "comNota": len(com_nota_per),
            "mediaNota_0a10": round2(media_nota) if media_nota is not None else None,
            "mediaNota_0a5": round2(media_nota / 2) if media_nota is not None else None,
            "porCanal": canal_per,
        }

    return {
        "totalBaixado": len(arr),
        "hostawayCount": hostaway_count,
        "comTexto": com_texto,
        "comNota": com_nota,
        "porCanal": por_canal,
        "periodo": periodo,
    }


# Diagnóstico: retorna avaliações cruas COM nota (rating!=null) pra ver rating vs reviewCategory
@router.get("/debug")
async def debug():
    achados = []
    offset = 0
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        token = await _get_token(client)
        for _ in range(50):
            if len(achados) >= 5:
                break
            r = await client.get(
                f"{HOSTAWAY_BASE}/reviews",
                params={"limit": 100, "offset": offset},
                headers={"Authorization": f"Bearer {token}", "Cache-control": "no-cache"},
            )
            data = r.json()
            lote = data.get("result") or []
            if not lote:
                break
            for rv in lote:
                if len(achados) >= 5:
                    break
                if rv and rv.get("rating") is not None:
                    achados.append({
                        "id": rv.get("id"),
                        "rating": rv.get("rating"),
                        "reviewCategory": rv.get("reviewCategory"),
                        "channelId": rv.get("channelId"),
                        "departureDate": rv.get("departureDate"),
                        "publicReview": (rv.get("publicReview") or "")[:40],
                    })
            offset += 100
    return {"amostras": achados}
