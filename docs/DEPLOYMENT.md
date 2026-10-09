# Deployment checklist

The repository is configured for a Vercel Hobby frontend, one Render Free backend worker, and Supabase Free PostgreSQL/Auth. Confirm current free-tier eligibility in each account before deployment; do not attach billing to complete this demo.

## Supabase

The approved setup was run against the supplied empty project. It enabled pgvector, created AgentOS tables plus `reporting` and `checkpoints` schemas, and created narrowly scoped runtime/report roles. Keep `.env.hosted` local. Copy its `DATABASE_URL` and `ANALYTICS_DATABASE_URL` values into Render secrets. Do not use the setup/admin URL at runtime.

Supabase anonymous sign-in was found disabled on October 10, 2026. Either enable anonymous sign-ins for isolated visitor workspaces or create synthetic email/password users and insert their Auth UUID mappings into `auth_identities`. Set `ENABLE_PUBLIC_DEMO=true` only after anonymous sign-in is enabled. CAPTCHA and rate limits are recommended for a public anonymous demo.

## Render

Create a Blueprint from `render.yaml`, add the two database URLs, `SUPABASE_URL`, and the final HTTPS `FRONTEND_ORIGIN`. Keep one worker. The local measured backend plus MCP RSS was about 391 MiB after tool calls; this does not establish Linux/Render compatibility. Run `scripts/process_memory.py` and a leave/retrieval smoke test on the deployed instance before claiming free-host compatibility.

For live Gemini, first verify the project is free-tier with billing disabled. Then set `MODEL_MODE=live`, a model returned by the account's model-list endpoint, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_FREE_TIER_VERIFIED=true`. The implementation applies per-run and daily persisted budgets. Free-tier prompts use synthetic data only.

## Vercel

Import `frontend/`, set `NEXT_PUBLIC_API_URL` to the Render HTTPS URL, and set the two public Supabase values. Update Render `FRONTEND_ORIGIN` to the final Vercel origin. Rebuild both services, then run the three Playwright journeys against the deployment.

