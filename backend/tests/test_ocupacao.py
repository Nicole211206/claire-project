"""Calendário de visitas de manutenção: resumo de ocupação do Hostaway e
merge por id da lista nx_manut_visitas.
Rodar: uv run --with pytest --with httpx pytest tests -q"""
import os
import tempfile
import unittest

_tmp = tempfile.mkdtemp()
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp}/t.db")
os.environ.setdefault("UPLOADS_DIR", f"{_tmp}/up")
os.environ.setdefault("CLAIRE_TOKEN", "t")
os.environ["HOSTAWAY_ACCOUNT_ID"] = ""   # desliga a automação em background

from app import limpeza_caucao_sync as lc  # noqa: E402
from app.merge import MERGE_POR_ID  # noqa: E402


class TestOcupacao(unittest.TestCase):
    def test_resumo_filtra_status_e_formata(self):
        reservas = [
            {"listingMapId": 10, "arrivalDate": "2026-11-20", "departureDate": "2026-11-23",
             "checkInTime": 15, "checkOutTime": 11, "guestFirstName": "Ana", "guestEmail": "x@y",
             "status": "new", "totalPrice": 999},
            {"listingMapId": 11, "arrivalDate": "2026-11-21", "departureDate": "2026-11-22",
             "status": "cancelled"},
            {"listingMapId": 12, "arrivalDate": "", "departureDate": "2026-11-22", "status": "new"},
            {"listingMapId": 13, "arrivalDate": "2026-11-01", "departureDate": "2026-11-05",
             "guestName": "Bruno Silva", "status": "modified"},
        ]
        out = lc.ocupacao_resumo(reservas)
        self.assertEqual([r["listingId"] for r in out], [10, 13])
        a = out[0]
        self.assertEqual((a["chegada"], a["saida"], a["horaChegada"], a["horaSaida"], a["hospede"]),
                         ("2026-11-20", "2026-11-23", "15:00", "11:00", "Ana"))
        # nada de contato nem valores no resumo
        self.assertNotIn("guestEmail", a)
        self.assertNotIn("totalPrice", a)
        self.assertEqual(out[1]["hospede"], "Bruno")

    def test_visitas_tem_merge_por_id(self):
        self.assertIn("nx_manut_visitas", MERGE_POR_ID)


class TestOcupacaoRota(unittest.TestCase):
    def setUp(self):
        from fastapi.testclient import TestClient
        from app.config import settings
        from app.main import app
        self.c = TestClient(app)
        self.h = {"X-Token": settings.claire_token}

    def test_exige_token(self):
        r = self.c.get("/hostaway/ocupacao?from=2026-11-01&to=2026-11-30")
        self.assertIn(r.status_code, (401, 403))

    def test_valida_periodo(self):
        r = self.c.get("/hostaway/ocupacao?from=2026-11-30&to=2026-11-01", headers=self.h)
        self.assertEqual(r.status_code, 400)
        r = self.c.get("/hostaway/ocupacao?from=2026-01-01&to=2026-12-31", headers=self.h)
        self.assertEqual(r.status_code, 400)
        r = self.c.get("/hostaway/ocupacao?from=ontem&to=2026-12-31", headers=self.h)
        self.assertEqual(r.status_code, 400)
