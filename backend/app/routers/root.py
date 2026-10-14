import base64
import json
import logging
import re
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from .. import crud
from ..auth import auth_dependency
from ..config import settings
from ..db import get_db
from ..merge import do_merge
from ..utils import hour_key_now, now_ms, rand_suffix

router = APIRouter()
logger = logging.getLogger(__name__)

BACKUP_TTL_SECONDS = 8 * 24 * 3600  # 8 dias, igual ao worker original
DATA_URL_RE = re.compile(r"^data:([^;]+);base64,(.+)$", re.DOTALL)


@router.get("/load")
def load(db: Session = Depends(get_db), token: str = Depends(auth_dependency)):
    state = crud.get_state(db)
    return {"data": state}


@router.post("/upload", status_code=201)
async def upload(request: Request, db: Session = Depends(get_db), token: str = Depends(auth_dependency)):
    body = await request.json()
    data_url = body.get("dataUrl") or ""
    m = DATA_URL_RE.match(data_url)
    if not m:
        return JSONResponse({"error": "dataUrl invalido"}, status_code=400)
    mime = body.get("mime") or m.group(1) or "application/octet-stream"
    try:
        raw_bytes = base64.b64decode(m.group(2))
    except Exception:
        return JSONResponse({"error": "base64 invalido"}, status_code=400)

    key = f"anexo_{now_ms()}_{rand_suffix()}"
    filename = body.get("filename") or ""
    uploads_dir = Path(settings.uploads_dir)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    (uploads_dir / key).write_bytes(raw_bytes)
    crud.save_upload_meta(db, key, mime, filename)

    file_url = f"{str(request.base_url).rstrip('/')}/files/{key}?token={quote(token)}"
    return {"ok": True, "url": file_url, "key": key}


@router.get("/files/{key:path}")
def get_file(key: str, db: Session = Depends(get_db), token: str = Depends(auth_dependency)):
    meta = crud.get_upload_meta(db, key)
    file_path = Path(settings.uploads_dir) / key
    if meta is None or not file_path.is_file():
        return JSONResponse({"error": "arquivo nao encontrado"}, status_code=404)
    return FileResponse(
        file_path,
        media_type=meta.mime,
        headers={"Cache-Control": "private, max-age=31536000"},
    )


@router.post("/save")
async def save(request: Request, db: Session = Depends(get_db), token: str = Depends(auth_dependency)):
    raw = await request.body()
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception as e:
        # valida que é JSON antes de gravar (JSON.parse jogando erro -> 500, igual ao original)
        return JSONResponse({"error": str(e)}, status_code=500)

    # O documento é sempre um objeto com chaves nx_*: qualquer outra coisa
    # ([], null, número...) sobrescreveria o estado inteiro e é recusada.
    if not isinstance(parsed, dict) or not any(str(k).startswith("nx_") for k in parsed):
        return JSONResponse({"error": "corpo invalido: esperado objeto com chaves nx_*"}, status_code=400)

    # ── TRAVA ANTI-PERDA (lado do servidor) — FALHA FECHADA: se o merge der
    # erro, NÃO grava o corpo cru por cima do estado (antes caía em
    # final_state = parsed e um corpo malformado apagava tudo). O aparelho
    # mantém a edição pendente e tenta de novo no próximo ciclo. ──
    prev = crud.get_state(db)
    final_state = parsed
    if prev is not None:
        try:
            final_state = do_merge(db, prev, parsed)
        except Exception:
            logger.exception("save: do_merge falhou — nada foi gravado")
            return JSONResponse({"error": "falha ao mesclar; nada foi gravado"}, status_code=500)

    # Snapshot de hora em hora, do estado ANTERIOR ao save (assim um save
    # destrutivo ainda pode ser desfeito pelo backup da hora).
    hora_atual = hour_key_now()
    if crud.get_backup(db, hora_atual) is None:
        crud.create_backup(db, hora_atual, prev if prev is not None else final_state, BACKUP_TTL_SECONDS)

    crud.put_state(db, final_state)

    return {"ok": True}


@router.get("/backups")
def backups(db: Session = Depends(get_db), token: str = Depends(auth_dependency)):
    rows = crud.list_backups(db)
    return {"backups": [{"date": r.hour_key} for r in rows]}


@router.get("/load-backup")
def load_backup(date: str | None = None, db: Session = Depends(get_db), token: str = Depends(auth_dependency)):
    if not date:
        return JSONResponse({"error": "parametro date obrigatorio"}, status_code=400)
    row = crud.get_backup(db, date)
    return {"data": row.data if row else None}


@router.get("/health")
def health(db: Session = Depends(get_db), token: str = Depends(auth_dependency)):
    return {"ok": True, "kv": True, "db": True}
