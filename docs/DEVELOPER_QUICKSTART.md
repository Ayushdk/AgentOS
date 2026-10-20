# AgentOS developer quickstart

This guide starts AgentOS on Windows without production credentials.

## Requirements

- Node.js 22+
- Python 3.12
- npm, `uv`, and PowerShell

## Install

```powershell
git clone https://github.com/Ayushdk/AgentOS.git
Set-Location AgentOS
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env.local
npm.cmd install
uv sync --frozen
Set-Location frontend
npm.cmd ci
Set-Location ..
```

Example files contain local placeholders. Never put hosted database URLs, passwords, Gemini keys, or Supabase secrets in Git.

## Start PostgreSQL

The embedded local database uses port **55432**:

```powershell
npm.cmd run db:start
```

If `postmaster.pid` already exists, check for a live listener:

```powershell
Get-NetTCPConnection -LocalPort 55432 -State Listen -ErrorAction SilentlyContinue
```

Reuse a healthy existing process. Never delete `.local/postgres/postmaster.pid` while its process is alive. If no listener exists, verify that the recorded PID is gone before removing only the stale PID file.

Docker is the pgvector-enabled alternative:

```powershell
docker compose up postgres
```

Do not run embedded and Docker PostgreSQL on the same configured port.

## Initialize

```powershell
uv run alembic upgrade head
uv run python -m agentos.seed
uv run python -m agentos.retrieval --without-embeddings
```

The final flag uses the labeled full-text/JSON fallback. Omit it for the configured embedding path.

## Start the API

```powershell
uv run uvicorn agentos.api:app --host 127.0.0.1 --port 8000
Invoke-RestMethod http://127.0.0.1:8000/health
```

MCP and the LangGraph checkpoint saver initialize during startup.

## Start the frontend

```powershell
Set-Location frontend
npm.cmd run dev
```

Open <http://127.0.0.1:3000>. Development mode enters the synthetic Employee workspace and exposes the Employee, Manager, and HR selector.

## Validate

From the repository root:

```powershell
uv run ruff check backend scripts tests
uv run pytest -q
```

From `frontend/`:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

The browser suite expects the API and frontend unless CI starts them.

## Key files

- Frontend entry: `frontend/app/page.tsx`
- API entry: `backend/agentos/api.py`
- Business rules: `backend/agentos/services.py`
- Agent graph: `backend/agentos/graph.py`
- Retrieval: `backend/agentos/retrieval.py`
- Backend tests: `tests/`
- Browser tests: `frontend/tests/`
- Migrations: `migrations/versions/`

See [CODEBASE_GUIDE.md](CODEBASE_GUIDE.md) for the architecture.

## Safety rules

- Add migrations instead of editing applied history.
- Keep identity and role resolution on the backend.
- Never automatically retry POST actions.
- Keep leave and HR handoff confirmation.
- Use only synthetic data in model prompts.
- Never reset or reseed a hosted database.

