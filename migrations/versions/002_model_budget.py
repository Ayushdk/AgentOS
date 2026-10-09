"""Persist a race-safe daily model-call budget."""

from alembic import op
from sqlalchemy import inspect
from agentos.models import ModelBudget

revision = "002"
down_revision = "001"


def upgrade():
    ModelBudget.__table__.create(op.get_bind(), checkfirst=True)
    op.execute("REVOKE ALL ON model_budget FROM PUBLIC")


def downgrade():
    ModelBudget.__table__.drop(op.get_bind())
