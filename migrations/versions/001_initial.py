"""Operational schema, isolated reporting, and policy search."""

from alembic import op
from sqlalchemy import text
from agentos.models import Base

revision = "001"
down_revision = None


def upgrade():
    bind = op.get_bind()
    Base.metadata.create_all(bind)
    op.execute("CREATE SCHEMA IF NOT EXISTS checkpoints")
    op.execute("CREATE SCHEMA IF NOT EXISTS reporting")
    op.execute(
        "ALTER TABLE policy_chunks ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', heading || ' ' || text)) STORED"
    )
    op.execute("CREATE INDEX policy_fts_idx ON policy_chunks USING gin(search_vector)")
    available = bind.execute(
        text("SELECT count(*) FROM pg_available_extensions WHERE name='vector'")
    ).scalar()
    if available:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        op.execute("ALTER TABLE policy_chunks ADD COLUMN embedding vector(384)")
    for table in [
        "employees",
        "leave_balances",
        "leave_requests",
        "calendar_events",
        "approvals",
        "hr_tickets",
        "agent_runs",
        "audit_events",
    ]:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        # App queries are explicitly scoped; never imply owner credentials enforce RLS.
        op.execute(f"REVOKE ALL ON {table} FROM PUBLIC")
    for table in [
        "employees",
        "leave_balances",
        "leave_requests",
        "calendar_events",
        "approvals",
        "hr_tickets",
        "agent_runs",
        "audit_events",
    ]:
        if table != "employees":
            op.execute(
                f"ALTER TABLE {table} ADD CONSTRAINT {table}_employee_fk FOREIGN KEY (tenant_id,employee_id) REFERENCES employees(tenant_id,id)"
            )
    op.execute("""CREATE VIEW reporting.headcount AS
        SELECT department, count(*)::integer AS value FROM employees
        WHERE tenant_id=current_setting('agentos.tenant_id',true)
          AND joined_on <= current_setting('agentos.as_of',true)::date
          AND (exited_on IS NULL OR exited_on > current_setting('agentos.as_of',true)::date)
        GROUP BY department""")
    op.execute("""CREATE VIEW reporting.joiners AS
        SELECT department, to_char(joined_on,'YYYY-MM') AS month, count(*)::integer AS value
        FROM employees WHERE tenant_id=current_setting('agentos.tenant_id',true)
        AND joined_on >= current_setting('agentos.start_date',true)::date
        AND joined_on <= current_setting('agentos.end_date',true)::date
        GROUP BY department,to_char(joined_on,'YYYY-MM')""")
    op.execute("""CREATE VIEW reporting.joining_trends AS
        SELECT month, sum(value)::integer AS value FROM reporting.joiners GROUP BY month""")
    op.execute("""CREATE VIEW reporting.approved_leave AS
        SELECT to_char(d.day,'YYYY-MM') AS month, count(*)::integer AS value
        FROM leave_requests l CROSS JOIN LATERAL generate_series(l.start_date::timestamp,l.end_date::timestamp,'1 day') d(day)
        WHERE l.tenant_id=current_setting('agentos.tenant_id',true) AND l.status='approved'
        AND extract(isodow FROM d.day) <= 5 AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.day=d.day::date)
        AND d.day::date >= current_setting('agentos.start_date',true)::date
        AND d.day::date <= current_setting('agentos.end_date',true)::date
        GROUP BY to_char(d.day,'YYYY-MM')""")


def downgrade():
    op.execute("DROP SCHEMA reporting CASCADE")
    Base.metadata.drop_all(op.get_bind())
