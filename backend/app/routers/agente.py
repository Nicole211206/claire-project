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
import re
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


# ── Agente como atendente: abrir card, preencher campos vazios, campos próprios ──
# Regras: só abre card de imóvel do catálogo; só preenche campo VAZIO (nunca troca o
# que a equipe escreveu); "quem paga" e valores ficam como SUGESTÃO (sugestaoAgente),
# que a atendente confirma na tela. Campos só do agente: alertaAgente, sugestaoAgente,
# rascunhosAgente (a atendente marca enviado/editado/descartado; o agente nunca
# desfaz essa marca).

ORIGENS = {"proprietario", "equipe", "hospede"}
TIPOS = {"dano", "desgaste", "perda"}
CAMPOS_SIMPLES = ("dataPrazo", "tipo", "origem", "dataSolicitacao")
CAMPOS_HOSPEDE = ("codigo", "plataforma", "checkout")


def _vazio(v) -> bool:
    return v is None or (isinstance(v, str) and not v.strip())


def _linha(texto: str, chave: str) -> dict:
    return {"id": now_ms(), "texto": texto, "data": iso_now(), "autor": AUTOR, "chaveAgente": chave}


def _com_card(db: Session, id_card: str, alterar):
    """Lê o estado, aplica `alterar(card)` -> (resposta, mudou) e grava com _ts novo se mudou."""
    with _trava:
        state = crud.kv_load(db)
        cards = state.get("nx_manutencoes") or []
        card = next((c for c in cards if str(c.get("id")) == str(id_card)), None)
        if card is None:
            return JSONResponse({"error": "registro nao encontrado"}, status_code=404)
        resposta, mudou = alterar(card)
        if mudou:
            card["_ts"] = now_ms()
            state["nx_manutencoes"] = cards
            _gravar(db, state)
        return resposta


@router.post("/manutencoes")
async def criar_manutencao(body: dict = Body(...), db: Session = Depends(get_db)):
    chave = _chave(body)
    wc = str(body.get("wc") or "").strip().upper()
    origem = str(body.get("origem") or "")
    tipo = str(body.get("tipo") or "")
    descricao = _texto({"texto": body.get("descricao")})
    if origem not in ORIGENS or tipo not in TIPOS:
        raise HTTPException(status_code=400, detail={"error": "origem/tipo invalidos"})
    with _trava:
        state = crud.kv_load(db)
        cards = state.get("nx_manutencoes") or []
        existente = next((c for c in cards if c.get("chaveAgente") == chave), None)
        if existente:
            return {"ok": True, "duplicado": True, "id": existente.get("id")}
        imovel = next((i for i in state.get("nx_catalog") or [] if str(i.get("code") or "").upper() == wc), None)
        if imovel is None:
            return JSONResponse({"error": "WC nao esta no catalogo"}, status_code=422)
        agora = now_ms()
        fonte = str(body.get("fonte") or "(pendente)")[:300]
        card = {
            "id": agora, "status": "solicitacao", "pausado": False, "origem": origem, "tipo": tipo,
            "imovelNome": imovel.get("nome"), "dataSolicitacao": str(body.get("dataSolicitacao") or iso_now()[:10]),
            "dataPrazo": str(body.get("dataPrazo") or ""), "dataCriacao": iso_now(), "criadoPor": AUTOR,
            "itens": [{"desc": str(i)[:200], "valor": 0} for i in (body.get("itens") or [])][:30],
            "margemPercent": 20, "fotos": [], "quemPaga": "", "obs": descricao,
            "updates": [_linha("Card aberto pelo agente. Fonte: " + fonte, chave)],
            "lembretes": [], "tarefasManut": [], "linksItens": [],
            "criadoPeloAgente": True, "chaveAgente": chave, "_ts": agora,
        }
        hosp = body.get("hospede") or {}
        if hosp:
            card["hospede"] = {k: str(hosp.get(k) or "") for k in CAMPOS_HOSPEDE}
        cards.insert(0, card)
        state["nx_manutencoes"] = cards
        _gravar(db, state)
        return {"ok": True, "duplicado": False, "id": agora}


@router.post("/manutencoes/{id}/campos")
async def preencher_campos(id: str, body: dict = Body(...), db: Session = Depends(get_db)):
    chave = _chave(body)
    campos = body.get("campos") or {}
    motivo = str(body.get("motivo") or "").strip()[:500]

    def alterar(card):
        if any(isinstance(u, dict) and u.get("chaveAgente") == chave for u in card.get("updates") or []):
            return {"ok": True, "duplicado": True, "preenchidos": [], "ignorados": []}, False
        preenchidos, ignorados = [], []
        for k in CAMPOS_SIMPLES:
            if k not in campos:
                continue
            v = str(campos[k] or "").strip()
            if not v or (k == "origem" and v not in ORIGENS) or (k == "tipo" and v not in TIPOS) or not _vazio(card.get(k)):
                ignorados.append(k)
            else:
                card[k] = v
                preenchidos.append(k)
        hosp_novo = campos.get("hospede") or {}
        if hosp_novo:
            hosp = dict(card.get("hospede") or {})
            for k in CAMPOS_HOSPEDE:
                v = str(hosp_novo.get(k) or "").strip()
                if not v:
                    continue
                if _vazio(hosp.get(k)):
                    hosp[k] = v
                    preenchidos.append("hospede." + k)
                else:
                    ignorados.append("hospede." + k)
            card["hospede"] = hosp
        if not preenchidos:
            return {"ok": True, "duplicado": False, "preenchidos": [], "ignorados": ignorados}, False
        texto = "Agente preencheu: " + ", ".join(preenchidos) + (" (" + motivo + ")" if motivo else "")
        card.setdefault("updates", []).append(_linha(texto, chave))
        return {"ok": True, "duplicado": False, "preenchidos": preenchidos, "ignorados": ignorados}, True

    return _com_card(db, id, alterar)


@router.post("/manutencoes/{id}/agente")
async def campos_do_agente(id: str, body: dict = Body(...), db: Session = Depends(get_db)):
    """Atualiza só os campos do agente: alerta (relógio no kanban), sugestão de "quem paga" e rascunhos."""

    def alterar(card):
        antes = repr((card.get("alertaAgente"), card.get("sugestaoAgente"), card.get("rascunhosAgente")))
        if "alerta" in body:
            a = body.get("alerta")
            card["alertaAgente"] = None if not a else {
                "texto": str(a.get("texto") or "")[:200], "nivel": str(a.get("nivel") or "")[:20],
                "prazo": str(a.get("prazo") or "")[:10]}
        if "sugestao" in body:
            s = body.get("sugestao")
            ja_igual = s and card.get("quemPaga") == s.get("quemPaga")
            card["sugestaoAgente"] = None if (not s or ja_igual) else {
                "quemPaga": str(s.get("quemPaga") or "")[:20], "motivo": str(s.get("motivo") or "")[:300]}
        if "rascunhos" in body:
            atuais = {r.get("id"): r for r in card.get("rascunhosAgente") or [] if isinstance(r, dict)}
            novos = []
            for r in body.get("rascunhos") or []:
                # id vai para um onclick na tela: só letras minúsculas, números, "_" e "-".
                rid = re.sub(r"[^a-z0-9_-]", "", str(r.get("id") or "").lower())[:80]
                if not rid:
                    continue
                velho = atuais.pop(rid, None)
                if velho and velho.get("status") != "pendente":
                    novos.append(velho)  # já marcado pela atendente: o agente não mexe
                    continue
                novos.append({
                    "id": rid, "titulo": str(r.get("titulo") or "")[:120], "para": str(r.get("para") or "")[:60],
                    "canal": str(r.get("canal") or "")[:80], "comValor": bool(r.get("comValor")),
                    "texto": str(r.get("texto") or "")[:MAX_TEXTO], "status": "pendente",
                    "criadoEm": (velho or {}).get("criadoEm") or iso_now()})
            # Os já marcados continuam como histórico; pendentes que o agente não propõe mais saem.
            novos += [r for r in atuais.values() if r.get("status") != "pendente"]
            card["rascunhosAgente"] = novos
        mudou = repr((card.get("alertaAgente"), card.get("sugestaoAgente"), card.get("rascunhosAgente"))) != antes
        return {"ok": True, "mudou": mudou}, mudou

    return _com_card(db, id, alterar)
