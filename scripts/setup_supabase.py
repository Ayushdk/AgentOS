"""Provision an empty AgentOS database using the supplied setup credential.
Refuses unrelated public tables. Never prints credentials. Re-runs use the saved runtime file.
"""

import os
import secrets
import subprocess
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg import sql

load_dotenv()
setup = os.environ["DATABASE_URL_SETUP"]
local = Path(".env")
target = Path(".env.hosted")
with psycopg.connect(setup, sslmode="require", connect_timeout=20, autocommit=True) as c:
    existing = {r[0] for r in c.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")}
    known = {
        "tenants",
        "employees",
        "auth_identities",
        "leave_balances",
        "leave_requests",
        "calendar_events",
        "holidays",
        "approvals",
        "hr_tickets",
        "policy_documents",
        "policy_chunks",
        "agent_runs",
        "audit_events",
        "model_budget",
        "alembic_version",
    }
    if existing - known:
        raise RuntimeError("Unrelated public tables exist; use a dedicated project/schema before setup.")
    if not target.exists():
        for role in ["agentos_runtime", "agentos_report"]:
            if c.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (role,)).fetchone():
                raise RuntimeError(
                    "AgentOS role already exists without local runtime configuration; refusing to replace it."
                )
        from urllib.parse import quote, urlsplit, urlunsplit

        parsed = urlsplit(setup)
        project = parsed.username.split(".", 1)[1]
        app_pw = secrets.token_urlsafe(32)
        report_pw = secrets.token_urlsafe(32)
        for role, pw in [("agentos_runtime", app_pw), ("agentos_report", report_pw)]:
            c.execute(
                sql.SQL(
                    "CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION"
                ).format(sql.Identifier(role), sql.Literal(pw))
            )

        def uri(role, pw):
            return urlunsplit(
                (
                    "postgresql+psycopg",
                    f"{role}.{project}:{quote(pw, safe='')}@{parsed.hostname}:{parsed.port}",
                    parsed.path,
                    "sslmode=require",
                    "",
                )
            )

        target.write_text(
            "ENVIRONMENT=hosted\nAUTH_MODE=supabase\nMODEL_MODE=development\n"
            + "DATABASE_URL="
            + uri("agentos_runtime", app_pw)
            + "\nANALYTICS_DATABASE_URL="
            + uri("agentos_report", report_pw)
            + "\n"
            + "SESSION_SECRET="
            + secrets.token_urlsafe(48)
            + "\nSUPABASE_URL="
            + os.environ["SUPABASE_URL"]
            + "\n"
            + "FRONTEND_ORIGIN=https://agentos.example.invalid\nGEMINI_API_KEY="
            + os.environ["GEMINI_API_KEY"]
            + "\n",
            encoding="utf-8",
        )
# Apply only the repository's additive initial migration with the setup role.
env = {
    **os.environ,
    "DATABASE_URL": setup.replace("postgresql://", "postgresql+psycopg://"),
    "ENVIRONMENT": "local",
    "AUTH_MODE": "development",
}
subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], env=env, check=True)
with psycopg.connect(setup, sslmode="require", autocommit=True) as c:
    c.execute("CREATE EXTENSION IF NOT EXISTS vector")
    columns = {
        r[0]
        for r in c.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='policy_chunks'"
        )
    }
    if "embedding" not in columns:
        c.execute("ALTER TABLE policy_chunks ADD COLUMN embedding vector(384)")
    c.execute("GRANT USAGE ON SCHEMA public TO agentos_runtime")
    c.execute("GRANT USAGE,CREATE ON SCHEMA checkpoints TO agentos_runtime")
    # Runtime ownership is confined to these application tables. Owner queries
    # bypass RLS, so all business access is enforced by explicit server scopes.
    c.execute("GRANT agentos_runtime TO postgres")
    c.execute("GRANT CREATE ON SCHEMA public TO agentos_runtime")
    for table in sorted(known - {"alembic_version"}):
        c.execute(sql.SQL("ALTER TABLE public.{} OWNER TO agentos_runtime").format(sql.Identifier(table)))
    c.execute("REVOKE CREATE ON SCHEMA public FROM agentos_runtime")
    c.execute("REVOKE agentos_runtime FROM postgres")
    c.execute(Path("scripts/provision.sql").read_text())
    c.execute("GRANT USAGE ON SCHEMA reporting TO agentos_runtime")
    c.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon,authenticated")
    c.execute("REVOKE ALL ON SCHEMA checkpoints,reporting FROM anon,authenticated")
print(
    "Supabase migrations, pgvector, and dedicated runtime/report roles are ready. Secrets saved only to ignored .env.hosted."
)
