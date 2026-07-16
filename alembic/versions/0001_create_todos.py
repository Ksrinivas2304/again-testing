"""create todos table"""

from alembic import op
import sqlalchemy as sa

revision = "0001_create_todos"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "todos",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_todos_id"), "todos", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_todos_id"), table_name="todos")
    op.drop_table("todos")
