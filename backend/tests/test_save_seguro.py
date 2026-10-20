"""Testes do /save (falha fechada), tombstones em união, /api/v2/state e /backups.
Rodar: uv run --with pytest --with httpx pytest tests -q"""
import os
import tempfile

_tmp = tempfile.mkdtemp()
# setdefault: se outro arquivo de teste (ex.: test_agente.py) já configurou o
# ambiente antes do import do app, usamos o dele em vez de brigar por ele.
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp}/t.db")
os.environ.setdefault("UPLOADS_DIR", f"{_tmp}/up")
os.environ.setdefault("CLAIRE_TOKEN", "t")
os.environ["HOSTAWAY_ACCOUNT_ID"] = ""   # desliga a automação em background

import unittest

try:
    import pytest
except ImportError:  # `python -m unittest discover` não tem pytest: pula este arquivo
    raise unittest.SkipTest("pytest nao instalado")
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app
from app import crud
from app.db import SessionLocal

from app.config import settings  # noqa: E402

H = {"X-Token": settings.claire_token}


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c


def _estado():
    db = SessionLocal()
    try:
        return crud.get_state(db)
    finally:
        db.close()


def _save(c, body):
    return c.post("/save", json=body, headers=H)


def test_corpo_nao_objeto_nao_apaga_nada(client):
    assert _save(client, {"nx_tasks": [{"id": 1, "t": "a"}]}).status_code == 200
    for ruim in ("[]", "null", "5", '"x"', '{"foo": 1}'):
        r = client.post("/save", content=ruim, headers={**H, "Content-Type": "application/json"})
        assert r.status_code == 400, ruim
    # JSON inválido também não grava nada
    assert client.post("/save", content="{nao-json", headers=H).status_code == 500
    assert _estado()["nx_tasks"] == [{"id": 1, "t": "a"}]


def test_merge_que_falha_nao_grava(client, monkeypatch):
    _save(client, {"nx_tasks": [{"id": 1}]})
    import app.routers.root as root
    monkeypatch.setattr(root, "do_merge", lambda *a, **k: 1 / 0)
    r = _save(client, {"nx_tasks": []})
    assert r.status_code == 500
    assert _estado()["nx_tasks"] == [{"id": 1}]


def test_id_nao_hashavel_nao_derruba_estado(client):
    _save(client, {"nx_tasks": [{"id": 1}]})
    r = _save(client, {"nx_tasks": [{"id": [1]}]})
    assert r.status_code in (200, 500)
    assert _estado()["nx_tasks"] == [{"id": 1}] or any(o["id"] == 1 for o in _estado()["nx_tasks"])


def test_tombstones_sao_unidos_nao_substituidos(client):
    _save(client, {"nx_tombstones": [{"id": 10, "ts": 100}, {"id": 11, "ts": 100}]})
    # aparelho desatualizado manda lista curta, com o mesmo id 10 mas ts MENOR
    _save(client, {"nx_tombstones": [{"id": 10, "ts": 50}, {"id": 12, "ts": 200}]})
    ts = {t["id"]: t["ts"] for t in _estado()["nx_tombstones"]}
    assert ts == {10: 100, 11: 100, 12: 200}


def test_item_apagado_nao_volta_com_cliente_desatualizado(client):
    _save(client, {"nx_tasks": [{"id": 1, "_ts": 10}, {"id": 2, "_ts": 10}]})
    # A apaga o 2 (tombstone mais novo que o _ts do item)
    _save(client, {"nx_tasks": [{"id": 1, "_ts": 10}], "nx_tombstones": [{"id": 2, "ts": 500}]})
    # B desatualizado reenvia o 2 e uma lista de tombstones vazia
    _save(client, {"nx_tasks": [{"id": 1, "_ts": 10}, {"id": 2, "_ts": 10}], "nx_tombstones": []})
    assert [o["id"] for o in _estado()["nx_tasks"]] == [1]


def test_api_v2_bloqueia_colecao_state(client):
    _save(client, {"nx_tasks": [{"id": 1}]})
    assert client.post("/api/v2/state", json={"x": 1}, headers=H).status_code == 403
    assert client.get("/api/v2/state", headers=H).status_code == 403
    assert client.delete("/api/v2/state/v1", headers=H).status_code == 403
    assert client.patch("/api/v2/state/v1", json={"x": 1}, headers=H).status_code == 403
    assert _estado()["nx_tasks"] == [{"id": 1}]
    assert client.post("/api/v2/outra", json={"id": "a"}, headers=H).status_code == 201


def test_backups_lista_e_guarda_estado_anterior(client):
    _save(client, {"nx_tasks": [{"id": 1}]})
    _save(client, {"nx_tasks": [{"id": 1}, {"id": 2}]})
    r = client.get("/backups", headers=H)
    assert r.status_code == 200 and len(r.json()["backups"]) == 1
    hk = r.json()["backups"][0]["date"]
    # snapshot da hora = estado ANTES do primeiro save da hora (o 1º save não tinha prev -> guarda o próprio)
    snap = client.get("/load-backup", params={"date": hk}, headers=H).json()["data"]
    assert snap["nx_tasks"] == [{"id": 1}]
