"""initial schema: records, backups, uploads

Revision ID: 0001
Revises:
Create Date: 2026-07-16

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "records",
        sa.Column("collection", sa.String(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.BigInteger(), nullable=False),
        sa.Column("updated_by", sa.String(), nullable=True),
        sa.Column("deleted_at", sa.BigInteger(), nullable=True),
        sa.PrimaryKeyConstraint("collection", "id"),
    )
    op.create_index("ix_records_collection", "records", ["collection"])
    op.create_index("ix_records_collection_deleted", "records", ["collection", "deleted_at"])

    op.create_table(
        "backups",
        sa.Column("hour_key", sa.String(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.Column("expires_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("hour_key"),
    )

    op.create_table(
        "uploads",
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("mime", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=True),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )


def downgrade() -> None:
    op.drop_table("uploads")
    op.drop_table("backups")
    op.drop_index("ix_records_collection_deleted", table_name="records")
    op.drop_index("ix_records_collection", table_name="records")
    op.drop_table("records")
