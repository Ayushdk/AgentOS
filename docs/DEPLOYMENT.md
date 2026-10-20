# Deployment guide

## Current services

- Frontend: [agent-os-sigma-vert.vercel.app](https://agent-os-sigma-vert.vercel.app)
- Backend: [agentos-api-2ima.onrender.com](https://agentos-api-2ima.onrender.com)
- Health: [agentos-api-2ima.onrender.com/health](https://agentos-api-2ima.onrender.com/health)
- Repository: [github.com/Ayushdk/AgentOS](https://github.com/Ayushdk/AgentOS)

The project uses a Vercel frontend, one Render Free API worker, and Supabase PostgreSQL/Auth. Secrets remain in provider configuration.

## Supabase

Hosted users authenticate with provisioned email/password accounts. JWT subjects map through `auth_identities` to server-owned employees and roles. The seeded portfolio account may switch only among Employee `E001`, Manager `E010`, and HR `E050` in the fixed synthetic tenant.

Anonymous sign-in is not required for that provisioned account. Optional anonymous visitor isolation still requires a dedicated synthetic Supabase project and `ENABLE_PUBLIC_DEMO=true`.

Use scoped runtime and reporting database roles. Never deploy the setup/admin URL as the runtime connection.

## Render

`render.yaml` starts one worker with `uv run uvicorn agentos.api:app --host 0.0.0.0 --port $PORT --workers 1`. Configure the database URLs, Supabase URL, strong session secret, and exact Vercel origin. CORS must remain exact-origin.

Deterministic model mode is the safe default. Gemini requires an explicitly verified free-tier model, key, and quota attestation.

## Vercel

Configure `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and the Supabase publishable key. Never expose database credentials, the session secret, or a service-role key.

## Verification

After deployment, verify frontend and health 200 responses, exact-origin preflight, protected-route 401 behavior, `/auth/me`, all three fixed demo personas, read-only role dashboards, cold-start recovery, and deployed commit alignment.

Production persona switching was verified after the current implementation and the test account was restored to Employee. No leave request, approval, rejection, or ticket was changed during that verification.
