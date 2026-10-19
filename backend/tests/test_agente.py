"""Testes das rotas do agente (dados fictícios, banco temporário).
Rodar dentro de backend/:  uv run python -m unittest discover -s tests -t .
"""
import json
import os
import tempfile
import unittest

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/teste.db"
os.environ["UPLOADS_DIR"] = _tmp
os.environ["CLAIRE_TOKEN"] = "token-da-tela"
os.environ["CLAIRE_AGENTE_TOKEN"] = "token-do-agente"

from fastapi.testclient import TestClient  # noqa: E402

from app import crud, models  # noqa: E402,F401
from app.config import settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

AG = {"X-Token": "token-do-agente"}


def estado_ficticio():
    return {
        "nx_users": [{"id": 1, "nome": "Pessoa Teste", "senha": "nao-devia-sair"}],
        "nx_catalog": [{"id": "c-1", "code": "WC-90001", "nome": "WC-90001 - Exemplo 101"}],
        "nx_manutencoes": [{"id": 111, "status": "andamento", "imovelNome": "WC-90001 - Exemplo 101",
                            "itens": [{"desc": "copo", "valor": 10}], "quemPaga": "hospede",
                            "updates": [{"id": 1, "texto": "equipe", "data": "2026-10-01T10:00:00.000Z", "autor": "Sara"}], "_ts": 1000}],
        "nx_sinistros": [{"id": 222, "seguradora": "easycover", "status": "aberto", "historico": [], "_ts": 1000}],
        "nx_plantao": [{"id": 333, "situacao": "antiga", "updates": [], "_ts": 1000}],
    }


class RotasAgente(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        db = SessionLocal()
        crud.put_state(db, estado_ficticio())
        db.close()
        settings.claire_agente_token = "token-do-agente"
        self.c = TestClient(app)

    def estado(self):
        db = SessionLocal()
        s = crud.kv_load(db)
        db.close()
        return s

    def test_sem_token_ou_token_da_tela_recusa(self):
        self.assertEqual(self.c.get("/api/agente/saude").status_code, 401)
        self.assertEqual(self.c.get("/api/agente/saude", headers={"X-Token": "token-da-tela"}).status_code, 401)
        # token na URL não vale para o agente
        self.assertEqual(self.c.get("/api/agente/saude?token=token-do-agente").status_code, 401)

    def test_token_do_agente_vazio_desliga_tudo(self):
        settings.claire_agente_token = ""
        self.assertEqual(self.c.get("/api/agente/saude", headers=AG).status_code, 503)

    def test_agente_nao_abre_load_nem_save(self):
        self.assertEqual(self.c.get("/load", headers=AG).status_code, 401)
        self.assertEqual(self.c.post("/save", headers=AG, content="{}").status_code, 401)

    def test_estado_so_traz_as_listas_do_agente(self):
        d = self.c.get("/api/agente/estado", headers=AG).json()["data"]
        self.assertEqual(set(d), {"nx_manutencoes", "nx_sinistros", "nx_plantao", "nx_catalog"})
        self.assertNotIn("nao-devia-sair", json.dumps(d))

    def test_update_acrescenta_sem_mexer_no_resto(self):
        r = self.c.post("/api/agente/manutencoes/111/updates", headers=AG, json={"texto": "prazo vence 25/10", "chave": "k1"})
        self.assertEqual(r.json(), {"ok": True, "duplicado": False})
        s = self.estado()
        card = s["nx_manutencoes"][0]
        self.assertEqual([u["autor"] for u in card["updates"]], ["Sara", "Agente"])
        self.assertEqual(card["itens"], [{"desc": "copo", "valor": 10}])
        self.assertEqual(card["quemPaga"], "hospede")
        self.assertGreater(card["_ts"], 1000)
        self.assertIsInstance(s["nx_lastSaved"], str)  # igual ao /save: as telas puxam a mudança
        self.assertEqual(s["nx_users"][0]["senha"], "nao-devia-sair")  # resto do estado intacto

    def test_mesma_chave_nao_duplica(self):
        for _ in range(3):
            self.c.post("/api/agente/manutencoes/111/updates", headers=AG, json={"texto": "x", "chave": "k1"})
        self.assertEqual(len(self.estado()["nx_manutencoes"][0]["updates"]), 2)

    def test_validacoes(self):
        self.assertEqual(self.c.post("/api/agente/manutencoes/999/updates", headers=AG, json={"texto": "x", "chave": "k"}).status_code, 404)
        self.assertEqual(self.c.post("/api/agente/manutencoes/111/updates", headers=AG, json={"texto": "", "chave": "k"}).status_code, 400)
        self.assertEqual(self.c.post("/api/agente/manutencoes/111/updates", headers=AG, json={"texto": "x"}).status_code, 400)

    def test_sinistro_e_plantao(self):
        self.c.post("/api/agente/sinistros/222/historico", headers=AG, json={"texto": "prazo 10/11", "chave": "s1"})
        self.c.post("/api/agente/plantao", headers=AG, json={"situacao": "Passagem 19h", "detalhes": "...", "data": "2026-10-19", "chave": "p1"})
        s = self.estado()
        self.assertEqual(s["nx_sinistros"][0]["historico"][0]["autor"], "Agente")
        self.assertEqual([p["situacao"] for p in s["nx_plantao"]], ["Passagem 19h", "antiga"])

    def test_nao_existe_rota_de_apagar_nem_mudar(self):
        self.assertIn(self.c.delete("/api/agente/manutencoes/111", headers=AG).status_code, (404, 405))
        self.assertIn(self.c.patch("/api/agente/manutencoes/111", headers=AG, json={"quemPaga": "wecare"}).status_code, (404, 405))

    def test_tela_desatualizada_nao_apaga_a_linha_do_agente(self):
        self.c.post("/api/agente/manutencoes/111/updates", headers=AG, json={"texto": "linha do agente", "chave": "k1"})
        velho = estado_ficticio()  # a tela ainda tem o card antigo (_ts 1000)
        r = self.c.post("/save", headers={"X-Token": "token-da-tela"}, content=json.dumps(velho))
        self.assertEqual(r.status_code, 200)
        textos = [u["texto"] for u in self.estado()["nx_manutencoes"][0]["updates"]]
        self.assertIn("linha do agente", textos)


if __name__ == "__main__":
    unittest.main()
