from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .. import crud
from ..auth import auth_dependency
from ..db import get_db
from ..utils import json_merge_patch, now_ms, to_number

router = APIRouter(dependencies=[Depends(auth_dependency)])


@router.get("/{collection}")
def list_items(collection: str, db: Session = Depends(get_db)):
    rows = crud.list_records(db, collection)
    items = [{**r.data, "id": r.id, "_ts": r.updated_at} for r in rows]
    return {"items": items}


@router.get("/{collection}/{id}")
def get_item(collection: str, id: str, db: Session = Depends(get_db)):
    row = crud.get_record(db, collection, id)
    if row is None:
        return JSONResponse({"error": "nao encontrado"}, status_code=404)
    return {"item": {**row.data, "id": row.id, "_ts": row.updated_at}}


@router.post("/{collection}", status_code=201)
def create_item(collection: str, body: dict = Body(...), db: Session = Depends(get_db)):
    new_id = str(body["id"]) if body.get("id") is not None else str(now_ms())
    # Number(body._ts) || Date.now() -- 0/ausente/"não numérico" cai pro "agora".
    computed_ts = to_number(body.get("_ts"))
    now = int(computed_ts) if computed_ts else now_ms()
    crud.upsert_record_unconditional(db, collection, new_id, body, now, body.get("_by") or "")
    return {"ok": True, "item": {**body, "id": new_id, "_ts": now}}


@router.patch("/{collection}/{id}")
def patch_item(collection: str, id: str, patch: dict = Body(...), db: Session = Depends(get_db)):
    existing = crud.get_record_raw(db, collection, id)
    if existing is None:
        return JSONResponse({"error": "nao encontrado"}, status_code=404)
    now = now_ms()
    merged_data = json_merge_patch(existing.data, patch)
    crud.patch_record(db, collection, id, merged_data, now, patch.get("_by") or "")
    return {"ok": True, "item": {**merged_data, "id": id, "_ts": now}}


@router.delete("/{collection}/{id}")
def delete_item(collection: str, id: str, db: Session = Depends(get_db)):
    crud.soft_delete_record(db, collection, id, now_ms())
    return {"ok": True}
