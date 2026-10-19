# AgentOS baseline audit and implementation map

Audited 13 October 2026 against local `main` at `b1bd01e22979b4175224dcbca8a6930298592ad1` before the current uncommitted implementation work.

## Executive finding

AgentOS is an existing working application, not a prototype to replace. Its strongest implemented paths are grounded policy retrieval, transactional leave preparation and approval, server-side Supabase role resolution, restricted HR reporting, a real MCP stdio subprocess, LangGraph checkpoints, and frontend cold-start resilience. The main gaps are public-demo cloud isolation, richer deterministic fixtures, employee-facing ticket history, API-derived HR overview metrics, CI browser coverage, and documentation claims that have drifted beyond verified behavior.

## Feature inventory

| Capability | Status | Evidence / qualification |
|---|---|---|
| Employee policy search and citations | Implemented and verified | `retrieval.py`, `/policies`, `/citations`, Pytest and Playwright |
| Leave draft, employee confirmation, manager decision | Implemented and verified | `graph.py`, `services.py`, `/runs/*`, `/manager/*` |
| Manager overview, inbox, directory, team calendar | Implemented and verified locally | Dedicated components and APIs; no authenticated post-`b1bd01e` production browser proof |
| HR reports and SQL validation | Implemented and verified | Four reporting views, SQLGlot allowlist, read-only connection |
| HR ticket creation and resolution | Implemented and verified | Employee-confirmed handoff; HR-only queue and resolution |
| Employee ticket history/detail | Missing | No employee ticket read endpoint in baseline |
| Supabase hosted authentication | Implemented and verified | JWKS validation and `auth_identities` mapping |
| Passwordless public demo | Partially implemented | Secure anonymous-subject isolation exists; hosted anonymous auth is disabled |
| Per-visitor demo database | Partially implemented | Per-visitor tenant isolation exists in the same configured database; separate cloud project is not created |
| Deterministic synthetic seed | Partially implemented | Stable 50-person roster; baseline has only five leave rows and no seed tickets |
| Gemini inference | Implemented but optional | Configuration-gated; deterministic mode is the safe default |
| Google/Microsoft calendar | Simulated | Calendar records are database fixtures |
| Policy administration | Out of scope | Read-only explorer exists; no CMS or policy-write API |
| Enterprise multi-tenancy | Partially implemented | Tenant-scoped queries exist; full provisioning, RLS role audit, SSO/SCIM absent |

## Twenty-screen map

| Reference | Current implementation | Backend source | Status |
|---:|---|---|---|
| 1 Login/demo selection | `app/page.tsx` sign-in portal | `/health`, `/auth/me`, `/auth/demo/persona` | Partial until isolated hosted anonymous auth is approved/configured |
| 2 Employee dashboard | `views/employee-home-view.tsx` | `/balances`, `/leave`, `/calendar` | Implemented |
| 3 Ask AgentOS | assistant view in `page.tsx` | `/chat`, `/runs`, `/citations` | Implemented |
| 4 Submit leave | assistant draft/confirmation card | `/chat`, `/runs/{id}/resume` | Implemented |
| 5 My leave | leave view in `page.tsx` | `/leave` | Implemented |
| 6 Leave calendar | `calendar-view.tsx` | `/calendar` | Implemented |
| 7 Leave balance | overview and leave view | `/balances` | Implemented; no separate route |
| 8 My tickets | none in baseline | none for employee reads | Missing |
| 9 Ticket detail | none in baseline | none for employee reads | Missing |
| 10 Company policies | `views/company-policies-view.tsx` | `/policies`, `/policies/{id}` | Implemented read-only |
| 11 Manager dashboard | `views/manager-home-view.tsx` | `/manager/queue`, `/manager/team`, `/calendar` | Implemented |
| 12 Team requests | manager view in `page.tsx` | `/manager/queue` | Pending queue implemented; historical filter missing |
| 13 Approval modal | inline review cards | `/manager/requests/{id}/review` | Supported behavior; no separate modal |
| 14 Team directory | `team-directory.tsx` | `/manager/team` | Implemented |
| 15 Team analytics | availability/coverage only | `/calendar`, `/manager/team` | Partial; unsupported attrition charts intentionally omitted |
| 16 HR dashboard | `views/hr-dashboard-view.tsx` | `/hr/summary`, `/analytics`, `/tickets` | Implemented with derived overview metrics |
| 17 Workforce analytics | analytics view in `page.tsx` | `/analytics` | Implemented |
| 18 Department distribution | HR dashboard/chart | headcount report | Implemented |
| 19 HR tickets | handoff view | `/tickets`, `/tickets/{id}/resolve` | Implemented |
| 20 Policy administration | Policy Explorer | read-only policy endpoints | Read-only by design; administration missing |

## Security and deployment boundaries

- No production database reset or migration is authorized.
- No separate Supabase demo project exists in repository evidence.
- Public one-click access requires enabling anonymous Supabase auth and configuring an isolated backend/database. That is a cloud change and remains blocked pending approval.
- The browser never receives service-role credentials. Public persona selection is restricted to an authenticated JWT with `is_anonymous=true`; the backend maps the selected bounded persona to a server-owned synthetic employee.
- Existing free-tier readiness, exact-origin CORS, single session refresh, stale-data messages, and no mutation replay must remain unchanged.

## Local implementation order

1. Add guarded, deterministic, schema-aware demo seed generation and validation.
2. Replace misleading HR hardcoded metrics with an authorized backend summary.
3. Add employee-scoped ticket history/detail using existing ticket data.
4. Make the landing portal use legitimate local/public-demo identity paths rather than presenting role selection as authorization.
5. Expand regression coverage and CI without production credentials.
6. Correct README and detailed documentation, capture genuine current screenshots, and validate links/diagrams.

## Cloud prerequisites requiring approval

1. A separate Supabase project (database plus Auth) containing synthetic data only.
2. Anonymous Auth enabled for that demo project, if public one-click access is desired.
3. Separate Render/Vercel environment variables pointing only to that demo project.
4. Rate-limit and abuse monitoring settings for public Manager and HR personas.
5. A reset schedule or per-visitor retention policy for isolated synthetic tenants.
