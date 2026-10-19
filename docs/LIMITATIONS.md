# Limits and remaining verification

- Optional Gemini inference has limited smoke evidence using user-confirmed free-tier access. This verifies connectivity and representative behavior, not broad model quality or production reliability. The selected model is explicit configuration rather than a handbook guarantee. Persisted daily and per-run bounds limit usage; provider quotas remain authoritative.
- Supabase Auth signing-key discovery succeeded. Three synthetic Auth identities exist (`demo@gmail.com`, `manager@gmail.com`, `hr@gmail.com`) for role-based testing. Anonymous sign-in remains disabled in the Supabase project settings, so open guest demo access requires provisioned credentials.
- Supabase PostgreSQL, pgvector retrieval, MCP, checkpoints, approval, and reporting were verified with synthetic data.
- Local PostgreSQL lacks pgvector and clearly reports the JSON cosine fallback. Docker Compose provides the full pgvector path.
- Calendar and HR integrations are simulated. The application never sends email or edits meetings.
- The Render backend is live. One observed first response took 20.40 seconds, but runtime logs were unavailable and not every historical 503 is conclusively attributed to cold start. The client uses a 75-second readiness budget and bounded retry.
- An authenticated production Manager browser journey after `b1bd01e` remains unverified because no explicitly authorized signed-in session was available during the deployment gate.
- The recorded fallback consists of actual Playwright journey videos and screenshots. It is labeled replay and is not live behavior.
- The fixed evaluation is small and synthetic. It supports a portfolio claim, not a production reliability or security claim.

