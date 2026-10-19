# Deployment checklist

The repository is configured for a Vercel Hobby frontend, one Render Free backend worker, and Supabase Free PostgreSQL/Auth. Confirm current free-tier eligibility in each account before deployment; do not attach billing to complete this demo.

## Supabase

The approved setup was run against the supplied empty project. It enabled pgvector, created AgentOS tables plus `reporting` and `checkpoints` schemas, and created narrowly scoped runtime/report roles. Keep `.env.hosted` local. Copy its `DATABASE_URL` and `ANALYTICS_DATABASE_URL` values into Render secrets. Do not use the setup/admin URL at runtime.

Supabase anonymous sign-in was found disabled on October 10, 2026. Either enable anonymous sign-ins for isolated visitor workspaces or create synthetic email/password users and insert their Auth UUID mappings into `auth_identities`. Set `ENABLE_PUBLIC_DEMO=true` only after anonymous sign-in is enabled. CAPTCHA and rate limits are recommended for a public anonymous demo.

## Render

Create a Blueprint from `render.yaml`, add the two database URLs, `SUPABASE_URL`, and the final HTTPS `FRONTEND_ORIGIN`. Keep one worker. The local measured backend plus MCP RSS was about 391 MiB after tool calls; this does not establish Linux/Render compatibility. Run `scripts/process_memory.py` and a leave/retrieval smoke test on the deployed instance before claiming free-host compatibility.

For live Gemini, first verify the project is free-tier with billing disabled. Then set `MODEL_MODE=live`, a model returned by the account's model-list endpoint, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_FREE_TIER_VERIFIED=true`. The implementation applies per-run and daily persisted budgets. Free-tier prompts use synthetic data only.

## Verified Production Deployment

- **Frontend (Vercel)**: [`https://agent-os-sigma-vert.vercel.app`](https://agent-os-sigma-vert.vercel.app)
- **Backend API (Render)**: [`https://agentos-api-2ima.onrender.com`](https://agentos-api-2ima.onrender.com)
- **Health Endpoint**: [`https://agentos-api-2ima.onrender.com/health`](https://agentos-api-2ima.onrender.com/health)
- **Database & Auth**: Hosted Supabase PostgreSQL/Auth with `pgvector` and asymmetric JWT verification. Connection details remain in provider secrets.
- **Cold-start evidence**: One observed first request took 20.40 seconds; warm requests were fast. The frontend permits up to 75 seconds for shared readiness, including the tested 60-second simulation. This is not an SLA and does not prove every historical 503 was a cold start.

The deployed gate confirmed provider success for `b1bd01e`, anonymous `/health`, exact-origin preflight, and 401 responses with CORS headers. It did not complete an authenticated post-deployment browser journey because no explicitly authorized signed-in session was available.

