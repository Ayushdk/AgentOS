# AgentOS project guide

This guide is the fastest way to understand the current AgentOS codebase. The application is a synthetic employee-operations portfolio project with separate Employee, Manager, and HR Analyst workspaces.

## Start here

| Goal | Read or run |
| --- | --- |
| Understand the product | `README.md`, then this guide |
| Study the complete architecture | `docs/FULL_PROJECT.md` |
| Run the application | `README.md#run-locally` |
| Understand deployment | `docs/DEPLOYMENT.md` |
| Review known limitations | `docs/LIMITATIONS.md` |
| Prepare for an interview | `docs/FULL_PROJECT.md`, Part P |

## What users can do

### Employee

- Ask policy questions and inspect citations.
- Review leave balances and personal leave history.
- Prepare a leave request, review the calculated working days, and confirm submission.
- Inspect the simulated calendar and company policies.
- Create and track personal support tickets.

### Manager

- Review the approval inbox.
- Approve or reject direct-report leave requests.
- Inspect team availability and overlapping absences.
- Browse the direct-report directory and team analytics.

### HR Analyst

- Review and resolve HR support tickets.
- Run approved aggregate workforce reports.
- Inspect report definitions, source rows, and validated query details.

## Repository map

```text
AgentOS/
├── backend/agentos/          FastAPI API, domain services, auth, agents, and data access
├── frontend/app/             Next.js entry point and shared design system
├── frontend/components/
│   ├── layout/               Role-aware application shell and navigation
│   ├── views/                Current Employee, Manager, HR, and login screens
│   ├── calendar/             Shared leave and holiday calendar
│   ├── team/                 Manager team directory
│   └── ui/                   Small reusable UI primitives
├── frontend/public/replay/   Current recorded-demo screenshots
├── migrations/               Database schema migrations
├── policies/                 Fictional policy source documents
├── scripts/                  Local database and setup utilities
├── tests/                    Backend security and workflow regression tests
├── frontend/tests/           Browser journeys and resilience tests
├── artifacts/                Generated test evidence
└── docs/                     Architecture, deployment, demo, and interview documentation
```

The retired dashboard, policy-explorer, and report-chart implementations were removed. Current screen implementations live under `frontend/components/views/`.

## Frontend flow

`frontend/app/page.tsx` coordinates authentication, data loading, view selection, and user actions. It renders:

- `components/views/login-view.tsx` before authentication.
- `components/layout/app-shell.tsx` after authentication.
- One role-appropriate component from `components/views/` for the selected navigation item.

All HTTP requests go through `frontend/lib/api.ts`. That client performs the shared backend readiness check, applies bounded retries to eligible GET requests, attaches the Supabase bearer token, and keeps mutation requests single-attempt.

## Backend flow

`backend/agentos/api.py` defines the HTTP boundary. Authentication resolves a development identity locally or verifies a Supabase JWT in hosted mode. The API passes an authenticated identity to domain services, which enforce tenant and role scope before accessing PostgreSQL.

Important backend modules:

| Module | Responsibility |
| --- | --- |
| `api.py` | Routes, CORS, request validation, and HTTP errors |
| `auth.py` | Supabase JWT validation and identity resolution |
| `services.py` | Leave, approval, balance, calendar, and ticket rules |
| `graph.py` | LangGraph orchestration and human confirmation |
| `retrieval.py` | Policy ingestion and hybrid retrieval |
| `analytics.py` | Approved reports and SQL validation |
| `mcp_server.py` | Private typed tool boundary |
| `demo_seed.py` | Deterministic rich local demonstration data |

## Authentication and roles

Hosted sign-in uses Supabase email/password authentication. The browser receives a Supabase session, and the backend maps its JWT subject through `auth_identities` to an AgentOS employee and role. Navigation is role-aware, while the backend remains the final authorization boundary.

The public portfolio login currently displays the synthetic Employee demo credential. Manager and HR credentials remain private. Anonymous persona selection is available only when the isolated public-demo mode is explicitly enabled.

## Data and integrations

- PostgreSQL stores employees, balances, leave requests, approvals, runs, tickets, policies, citations, and audit records.
- pgvector is optional for hosted semantic policy retrieval; PostgreSQL full-text retrieval remains available.
- Calendar events are simulated fixtures.
- Gemini inference is optional. Deterministic development behavior remains available for testing and recorded demonstrations.
- HR analytics uses approved aggregate reports and validated read-only SQL behavior.

## Safe workflow behavior

- Employee confirmation is required before a prepared action is submitted.
- Manager approval is a separate decision.
- Balance and overlap checks run again inside a locked transaction.
- Idempotency prevents duplicate submissions and repeated deductions.
- GET requests may retry transient gateway failures within a fixed budget.
- Mutations, approvals, submissions, and ticket updates are never retried automatically.

## Local development

Use three terminals from the repository root:

```powershell
npm.cmd run db:start
```

```powershell
cd backend
uv run uvicorn agentos.api:app --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm.cmd run dev
```

Open `http://127.0.0.1:3000`.

## Validation

```powershell
uv run ruff check backend scripts tests
uv run pytest -q
cd frontend
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

The GitHub Actions workflow runs the same main checks against an isolated PostgreSQL service. Production verification is reported separately from local test results.

## Current boundaries

- All people, policies, tickets, leave records, and calendar events are synthetic.
- Render free-tier instances may require a cold start.
- The optional Gemini provider can be unavailable when its free quota is exhausted.
- A real enterprise rollout would require customer isolation, SSO, managed secrets, retention controls, monitoring, and formal security review.
