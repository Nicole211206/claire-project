"""Rotas do agente de manutenções (repo manutencao-icm).

O agente NÃO usa /load nem /save: ele lê só as listas de que precisa e escreve
uma linha por vez, aqui no servidor, sem reenviar o estado inteiro. Assim nunca
sobrescreve o que a equipe estiver editando ao mesmo tempo.

Permissões: ler manutenções/sinistros/plantão/catálogo; ACRESCENTAR uma linha em
Atualizações (manutenção), em Histórico (sinistro) e uma entrada na Passagem de
turno. Não existe rota para apagar, mudar valor, "quem paga" ou fase.

Token próprio: CLAIRE_AGENTE_TOKEN (só no header X-Token, nunca na URL). Vazio =
rotas desligadas (falha fechada, ao contrário do token da tela).
"""
import hmac
import threading

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .. import crud
from ..config import settings
from ..db import get_db
from ..utils import hour_key_now, iso_now, now_ms
from .root import BACKUP_TTL_SECONDS

AUTOR = "Agente"
MAX_TEXTO = 4000
LISTAS_LEITURA = ("nx_manutencoes", "nx_sinistros", "nx_plantao", "nx_catalog")

# Uma escrita do agente por vez (ler → acrescentar → gravar).
# As rotas de escrita são `async def` DE PROPÓSITO e sem `await` lá dentro: assim
# rodam no mesmo event loop do /save e da sincronização do Hostaway (que também
# leem e gravam o documento sem ceder o loop) e nunca se intercalam com eles.
# Em `def` normal elas iriam para outra thread e uma escrita do agente poderia
# regravar o documento antigo por cima de um /save que acabou de entrar.
_trava = threading.Lock()


def agente_auth(request: Request) -> None:
    esperado = settings.claire_agente_token
    if not esperado:
        raise HTTPException(status_code=503, detail={"error": "rotas do agente desligadas"})
    recebido = request.headers.get("X-Token") or ""
    if not hmac.compare_digest(recebido, esperado):
        raise HTTPException(status_code=401, detail={"error": "nao autorizado"})


router = APIRouter(dependencies=[Depends(agente_auth)])


def _texto(body: dict) -> str:
    texto = str(body.get("texto") or "").strip()
    if not texto:
        raise HTTPException(status_code=400, detail={"error": "campo texto obrigatorio"})
    if len(texto) > MAX_TEXTO:
        raise HTTPException(status_code=400, detail={"error": f"texto acima de {MAX_TEXTO} caracteres"})
    return texto


def _chave(body: dict) -> str:
    chave = str(body.get("chave") or "").strip()
    if not chave:
        raise HTTPException(status_code=400, detail={"error": "campo chave obrigatorio (idempotencia)"})
    return chave


def _gravar(db: Session, state: dict) -> None:
    """Grava como o /save faz: snapshot da hora (se ainda não houver) e
    nx_lastSaved em STRING, para as telas abertas puxarem a mudança."""
    hora = hour_key_now()
    if crud.get_backup(db, hora) is None:
        crud.create_backup(db, hora, crud.kv_load(db), BACKUP_TTL_SECONDS)
    state["nx_lastSaved"] = str(now_ms())
    crud.put_state(db, state)


def _acrescentar(db: Session, lista: str, id_registro: str, campo: str, texto: str, chave: str):
    with _trava:
        state = crud.kv_load(db)
        registros = state.get(lista) or []
        reg = next((r for r in registros if str(r.get("id")) == str(id_registro)), None)
        if reg is None:
            return JSONResponse({"error": "registro nao encontrado"}, status_code=404)
        linhas = reg.get(campo) or []
        if any(isinstance(l, dict) and l.get("chaveAgente") == chave for l in linhas):
            return {"ok": True, "duplicado": True}
        agora = now_ms()
        linhas.append({"id": agora, "texto": texto, "data": iso_now(), "autor": AUTOR, "chaveAgente": chave})
        reg[campo] = linhas
        reg["_ts"] = agora
        state[lista] = registros
        _gravar(db, state)
        return {"ok": True, "duplicado": False}


@router.get("/saude")
def saude():
    return {"ok": True}


@router.get("/estado")
def estado(db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    return {"data": {k: state.get(k) or [] for k in LISTAS_LEITURA}}


@router.post("/manutencoes/{id}/updates")
async def manutencao_update(id: str, body: dict = Body(...), db: Session = Depends(get_db)):
    return _acrescentar(db, "nx_manutencoes", id, "updates", _texto(body), _chave(body))


@router.post("/sinistros/{id}/historico")
async def sinistro_historico(id: str, body: dict = Body(...), db: Session = Depends(get_db)):
    return _acrescentar(db, "nx_sinistros", id, "historico", _texto(body), _chave(body))


@router.post("/plantao")
async def plantao(body: dict = Body(...), db: Session = Depends(get_db)):
    chave = _chave(body)
    situacao = str(body.get("situacao") or "").strip()[:200]
    detalhes = str(body.get("detalhes") or "").strip()[:MAX_TEXTO]
    if not situacao:
        raise HTTPException(status_code=400, detail={"error": "campo situacao obrigatorio"})
    with _trava:
        state = crud.kv_load(db)
        itens = state.get("nx_plantao") or []
        if any(i.get("chaveAgente") == chave for i in itens):
            return {"ok": True, "duplicado": True}
        agora = now_ms()
        itens.insert(0, {
            "id": agora, "data": str(body.get("data") or iso_now()[:10]), "imovel": str(body.get("imovel") or ""),
            "situacao": situacao, "detalhes": detalhes, "status": "pendente", "dataPrazo": "",
            "updates": [], "lembretes": [], "autor": AUTOR, "chaveAgente": chave, "_ts": agora,
        })
        state["nx_plantao"] = itens
        _gravar(db, state)
        return {"ok": True, "duplicado": False}
