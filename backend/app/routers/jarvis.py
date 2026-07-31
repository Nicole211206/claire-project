from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .. import crud
from ..auth import auth_dependency
from ..db import get_db
from ..utils import iso_now, now_ms, to_number, today_iso

router = APIRouter(dependencies=[Depends(auth_dependency)])


# ── /api/summary ──────────────────────────────────────────
@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    tasks = state.get("nx_tasks") or []
    projects = state.get("nx_projetos") or []
    atts = state.get("nx_atts") or []
    demands = []
    for a in atts:
        for d in a.get("demands") or []:
            demands.append({**d, "attId": a.get("id"), "attName": a.get("name")})
    return {
        "tasks": {
            "total": len(tasks),
            "pending": sum(1 for t in tasks if not t.get("done")),
            "done": sum(1 for t in tasks if t.get("done")),
        },
        "projects": {
            "total": len(projects),
            "active": sum(1 for p in projects if p.get("status") == "andamento"),
        },
        "demands": {
            "total": len(demands),
            "pending": sum(1 for d in demands if d.get("status") != "done"),
        },
    }


# ── /api/tasks ────────────────────────────────────────────
@router.get("/tasks")
def list_tasks(status: str | None = None, db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    tasks = state.get("nx_tasks") or []
    if status:
        tasks = [t for t in tasks if (t.get("done") if status == "done" else not t.get("done"))]
    return {"tasks": tasks}


@router.post("/tasks", status_code=201)
def create_task(body: dict = Body(...), db: Session = Depends(get_db)):
    if not body.get("text"):
        return JSONResponse({"error": "campo text obrigatorio"}, status_code=400)
    state = crud.kv_load(db)
    tasks = state.get("nx_tasks") or []
    task = {
        "id": now_ms(),
        "text": body["text"],
        "cat": body.get("cat") or "work",
        "prio": body.get("prio") or "med",
        "due": body.get("due") or None,
        "status": body.get("status") or "todo",
        "done": False,
        "updates": [],
        "createdBy": "jarvis",
    }
    tasks.append(task)
    state["nx_tasks"] = tasks
    crud.kv_save(db, state)
    return {"ok": True, "task": task}


@router.patch("/tasks/{id}")
def patch_task(id: int, body: dict = Body(...), db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    tasks = state.get("nx_tasks") or []
    idx = next((i for i, t in enumerate(tasks) if t.get("id") == id), -1)
    if idx < 0:
        return JSONResponse({"error": "tarefa nao encontrada"}, status_code=404)
    if "done" in body or body.get("status") == "done":
        tasks[idx]["done"] = True
        tasks[idx]["status"] = "done"
    elif body.get("status"):
        tasks[idx]["status"] = body["status"]
        tasks[idx]["done"] = False
    for c in ["text", "cat", "prio", "due", "dataInicio", "projetoId"]:
        if body.get(c) is not None:
            tasks[idx][c] = body[c]
    state["nx_tasks"] = tasks
    crud.kv_save(db, state)
    return {"ok": True, "task": tasks[idx]}


@router.delete("/tasks/{id}")
def delete_task(id: int, db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    tasks = state.get("nx_tasks") or []
    before = len(tasks)
    tasks = [t for t in tasks if t.get("id") != id]
    if len(tasks) == before:
        return JSONResponse({"error": "tarefa nao encontrada"}, status_code=404)
    state["nx_tasks"] = tasks
    crud.kv_save(db, state)
    return {"ok": True}


# ── /api/demands ──────────────────────────────────────────
@router.get("/demands")
def list_demands(attId: str | None = None, db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    atts = state.get("nx_atts") or []
    demands = []
    for a in atts:
        for i, d in enumerate(a.get("demands") or []):
            demands.append({**d, "attId": a.get("id"), "attName": a.get("name"), "_idx": i})
    if attId:
        demands = [d for d in demands if d.get("attId") == attId]
    return {"demands": demands}


@router.post("/demands", status_code=201)
def create_demand(body: dict = Body(...), db: Session = Depends(get_db)):
    if not body.get("attId") or not body.get("text"):
        return JSONResponse({"error": "campos attId e text obrigatorios"}, status_code=400)
    state = crud.kv_load(db)
    atts = state.get("nx_atts") or []
    att = next((a for a in atts if a.get("id") == body["attId"]), None)
    if att is None:
        return JSONResponse({"error": "ATT nao encontrada"}, status_code=404)
    if att.get("demands") is None:
        att["demands"] = []
    demand = {
        "id": now_ms(),
        "text": body["text"],
        "prio": body.get("prio") or "med",
        "due": body.get("due") or None,
        "status": body.get("status") or "todo",
        "done": False,
        "createdBy": "jarvis",
    }
    att["demands"].append(demand)
    state["nx_atts"] = atts
    crud.kv_save(db, state)
    return {"ok": True, "demand": demand}


@router.patch("/demands/{att_id}/{idx}")
def patch_demand(att_id: str, idx: int, body: dict = Body(...), db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    atts = state.get("nx_atts") or []
    att = next((a for a in atts if a.get("id") == att_id), None)
    if att is None:
        return JSONResponse({"error": "ATT nao encontrada"}, status_code=404)
    demands = att.get("demands") or []
    if idx < 0 or idx >= len(demands):
        return JSONResponse({"error": "demanda nao encontrada"}, status_code=404)
    if "done" in body or body.get("status") == "done":
        demands[idx]["done"] = True
        demands[idx]["status"] = "done"
    elif body.get("status"):
        demands[idx]["status"] = body["status"]
        demands[idx]["done"] = False
    for c in ["text", "prio", "due"]:
        if body.get(c) is not None:
            demands[idx][c] = body[c]
    state["nx_atts"] = atts
    crud.kv_save(db, state)
    return {"ok": True, "demand": demands[idx]}


# ── /api/projects ─────────────────────────────────────────
@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    return {"projects": state.get("nx_projetos") or []}


@router.post("/projects", status_code=201)
def create_project(body: dict = Body(...), db: Session = Depends(get_db)):
    if not body.get("nome"):
        return JSONResponse({"error": "campo nome obrigatorio"}, status_code=400)
    state = crud.kv_load(db)
    projects = state.get("nx_projetos") or []
    project = {
        "id": now_ms(),
        "nome": body["nome"],
        "status": body.get("status") or "planejamento",
        "dataInicio": body.get("dataInicio") or None,
        "dataFim": body.get("dataFim") or None,
        "desc": body.get("desc") or "",
        "tasks": [],
        "createdBy": "jarvis",
    }
    projects.append(project)
    state["nx_projetos"] = projects
    crud.kv_save(db, state)
    return {"ok": True, "project": project}


@router.patch("/projects/{id}")
def patch_project(id: int, body: dict = Body(...), db: Session = Depends(get_db)):
    state = crud.kv_load(db)
    projects = state.get("nx_projetos") or []
    idx = next((i for i, p in enumerate(projects) if p.get("id") == id), -1)
    if idx < 0:
        return JSONResponse({"error": "projeto nao encontrado"}, status_code=404)
    for c in ["nome", "status", "dataInicio", "dataFim", "desc"]:
        if body.get(c) is not None:
            projects[idx][c] = body[c]
    state["nx_projetos"] = projects
    crud.kv_save(db, state)
    return {"ok": True, "project": projects[idx]}


# ── /api/manutencoes ──────────────────────────────────────
@router.post("/manutencoes", status_code=201)
def create_manutencao(body: dict = Body(...), db: Session = Depends(get_db)):
    if not body.get("imovelNome"):
        return JSONResponse({"error": "campo imovelNome obrigatorio"}, status_code=400)
    state = crud.kv_load(db)
    manutencoes = state.get("nx_manutencoes") or []
    m = {
        "id": now_ms(),
        "status": "solicitacao",
        "pausado": False,
        "origem": "onboarding",
        "imovelNome": body["imovelNome"],
        "dataSolicitacao": body.get("dataSolicitacao") or today_iso(),
        "dataPrazo": "",
        "tipo": "reparo",
        "itens": [{"desc": body.get("nome") or "Manutenção", "valor": body.get("valor") or 0}],
        "margemPercent": 20,
        "fotos": [],
        "quemPaga": "proprietario",
        "fornecedor": {"nome": "", "contato": "", "email": "", "pix": ""},
        "precisaComprar": False,
        "linksItens": [],
        "ondeEntregar": "",
        "obsCompra": "",
        "pagarFornecedor": False,
        "pagFornecedor": {
            "valor": 0, "nome": "", "email": "", "pix": "", "cpfCnpj": "", "dataPagamento": "", "fornCadId": None,
        },
        "repassarHostaway": False,
        "valorPago": 0,
        "pagoPor": "proprietario",
        "valorGasto": 0,
        "obs": body.get("obs") or "",
        "tarefasManut": [],
        "responsavel": "",
        "dataCriacao": iso_now(),
    }
    manutencoes.insert(0, m)
    state["nx_manutencoes"] = manutencoes
    crud.kv_save(db, state)
    return {"ok": True, "manutencao": m}


# ── /api/extras ───────────────────────────────────────────
@router.post("/extras", status_code=201)
def create_extra(body: dict = Body(...), db: Session = Depends(get_db)):
    if not body.get("imovelNome"):
        return JSONResponse({"error": "campo imovelNome obrigatorio"}, status_code=400)
    state = crud.kv_load(db)
    extras = state.get("nx_extras") or []
    hoje = today_iso()
    e = {
        "id": now_ms(),
        "mesVigente": body.get("mesVigente") or hoje[:7],
        "data": hoje,
        "dataSolicitacao": hoje,
        "dataExecucao": "",
        "dataPagamento": hoje,
        "pago": True,
        "anexo": "",
        "origem": "onboarding",
        "descricao": body.get("descricao") or "Resumo financeiro onboarding",
        "imovelNome": body["imovelNome"],
        "cobrado": to_number(body.get("cobrado")),
        "gasto": to_number(body.get("gasto")),
        "obs": body.get("obs") or "",
    }
    extras.insert(0, e)
    state["nx_extras"] = extras
    crud.kv_save(db, state)
    return {"ok": True, "extra": e}
