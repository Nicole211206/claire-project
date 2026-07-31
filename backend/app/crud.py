from sqlalchemy import or_, update as sa_update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from .models import Backup, Record, Upload
from .utils import now_ms

STATE_COLLECTION = "state"
STATE_ID = "v1"


# ─── documento único (equivalente ao KEY = 'claire-state-v1') ───

def get_state(db: Session):
    """None quando ainda não existe nenhum save (equivalente a prevRaw ausente)."""
    rec = db.get(Record, (STATE_COLLECTION, STATE_ID))
    if rec is None:
        return None
    return rec.data or {}


def put_state(db: Session, data: dict):
    now = now_ms()
    rec = db.get(Record, (STATE_COLLECTION, STATE_ID))
    if rec is None:
        db.add(Record(collection=STATE_COLLECTION, id=STATE_ID, data=data, updated_at=now, updated_by=None, deleted_at=None))
    else:
        rec.data = data
        rec.updated_at = now
        rec.deleted_at = None
    db.commit()


def kv_load(db: Session) -> dict:
    state = get_state(db)
    return state if state is not None else {}


def kv_save(db: Session, state: dict):
    """Equivalente a kvSave(): aqui nx_lastSaved é NÚMERO (Date.now()), diferente
    do /save principal, que grava STRING — inconsistência do worker original,
    replicada de propósito."""
    state["nx_lastSaved"] = now_ms()
    put_state(db, state)


# ─── backups horários (equivalente às chaves claire-backup-<hora> no KV) ───

def get_backup(db: Session, hour_key: str):
    return db.get(Backup, hour_key)


def create_backup(db: Session, hour_key: str, data: dict, ttl_seconds: int):
    now = now_ms()
    expires_at = now + ttl_seconds * 1000
    db.add(Backup(hour_key=hour_key, data=data, created_at=now, expires_at=expires_at))
    # KV expirava sozinho via expirationTtl; aqui a limpeza é manual.
    db.query(Backup).filter(Backup.expires_at < now).delete()
    db.commit()


def list_backups(db: Session):
    return db.query(Backup).order_by(Backup.hour_key.desc()).all()


# ─── anexos (bytes em disco; só o metadado mora no banco) ───

def save_upload_meta(db: Session, key: str, mime: str, filename: str):
    db.add(Upload(key=key, mime=mime, filename=filename, created_at=now_ms()))
    db.commit()


def get_upload_meta(db: Session, key: str):
    return db.get(Upload, key)


# ─── tabela genérica `records` (API v2) ───

def list_records(db: Session, collection: str):
    return (
        db.query(Record)
        .filter(Record.collection == collection, Record.deleted_at.is_(None))
        .order_by(Record.updated_at.desc())
        .all()
    )


def get_record(db: Session, collection: str, id_: str):
    rec = db.get(Record, (collection, id_))
    if rec is None or rec.deleted_at is not None:
        return None
    return rec


def get_record_raw(db: Session, collection: str, id_: str):
    """Sem filtrar deleted_at — usado pelo PATCH, que no worker original também
    encontra (e reativa) um registro soft-deleted."""
    return db.get(Record, (collection, id_))


def upsert_record_unconditional(db: Session, collection: str, id_: str, data: dict, updated_at: int, updated_by: str):
    """POST /api/v2/:collection — igual ao worker original, sempre sobrescreve,
    sem checar timestamp (a trava anti-regressão só existe no espelhamento)."""
    stmt = sqlite_insert(Record).values(
        collection=collection, id=id_, data=data, updated_at=updated_at, updated_by=updated_by, deleted_at=None,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[Record.collection, Record.id],
        set_={
            "data": stmt.excluded.data,
            "updated_at": stmt.excluded.updated_at,
            "updated_by": stmt.excluded.updated_by,
            "deleted_at": None,
        },
    )
    db.execute(stmt)
    db.commit()


def upsert_record_if_newer(db: Session, collection: str, id_: str, data: dict, updated_at: int):
    """Espelhamento contínuo (_mirrorCollectionToD1) — mesmo
    `WHERE excluded.updated_at >= records.updated_at` do D1 original."""
    stmt = sqlite_insert(Record).values(
        collection=collection, id=id_, data=data, updated_at=updated_at, updated_by=None, deleted_at=None,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[Record.collection, Record.id],
        set_={"data": stmt.excluded.data, "updated_at": stmt.excluded.updated_at, "deleted_at": None},
        where=(stmt.excluded.updated_at >= Record.updated_at),
    )
    db.execute(stmt)
    db.commit()


def patch_record(db: Session, collection: str, id_: str, patched_data: dict, updated_at: int, updated_by: str):
    db.query(Record).filter(Record.collection == collection, Record.id == id_).update(
        {"data": patched_data, "updated_at": updated_at, "updated_by": updated_by, "deleted_at": None}
    )
    db.commit()


def soft_delete_record(db: Session, collection: str, id_: str, ts: int):
    db.query(Record).filter(Record.collection == collection, Record.id == id_).update({"deleted_at": ts})
    db.commit()


def soft_delete_record_if_newer(db: Session, collection: str, id_: str, ts: int):
    """Usado pelos tombstones no espelhamento — mesma condição do D1 original:
    (deleted_at IS NULL OR deleted_at < ts)."""
    db.execute(
        sa_update(Record)
        .where(
            Record.collection == collection,
            Record.id == id_,
            or_(Record.deleted_at.is_(None), Record.deleted_at < ts),
        )
        .values(deleted_at=ts)
    )
    db.commit()
