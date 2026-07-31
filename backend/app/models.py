from sqlalchemy import BigInteger, Column, JSON, String

from .db import Base


# Tabela genérica de registros — mesmo modelo do D1 atual (API v2): uma
# coleção qualquer é só um valor de `collection`, sem tabela própria por tipo.
# O documento único da Claire (antigo `claire-state-v1` no KV) também mora
# aqui, como uma linha só: collection="state", id="v1".
class Record(Base):
    __tablename__ = "records"

    collection = Column(String, primary_key=True)
    id = Column(String, primary_key=True)
    data = Column(JSON, nullable=False)
    updated_at = Column(BigInteger, nullable=False)
    updated_by = Column(String, nullable=True)
    deleted_at = Column(BigInteger, nullable=True)


# Snapshots horários (equivalente às chaves "claire-backup-<hora>" do KV, que
# lá expiravam via expirationTtl — aqui a expiração é feita manualmente).
class Backup(Base):
    __tablename__ = "backups"

    hour_key = Column(String, primary_key=True)
    data = Column(JSON, nullable=False)
    created_at = Column(BigInteger, nullable=False)
    expires_at = Column(BigInteger, nullable=False)


# Metadados dos anexos (o arquivo em si vai pro disco, não pro banco).
class Upload(Base):
    __tablename__ = "uploads"

    key = Column(String, primary_key=True)
    mime = Column(String, nullable=False)
    filename = Column(String, nullable=True)
    created_at = Column(BigInteger, nullable=False)
