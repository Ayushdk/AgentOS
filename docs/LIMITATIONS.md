# Limits and remaining verification

- Gemini model discovery succeeded, but no inference was run because the account's free-tier and billing-disabled status was not confirmed. The default remains the deterministic development adapter.
- Supabase Auth signing-key discovery succeeded. Anonymous sign-in is disabled and no synthetic Auth users were created, so hosted login is not yet exercised end to end.
- Supabase PostgreSQL, pgvector retrieval, MCP, checkpoints, approval, and reporting were verified with synthetic data.
- Local PostgreSQL lacks pgvector and clearly reports the JSON cosine fallback. Docker Compose provides the full pgvector path.
- Calendar and HR integrations are simulated. The application never sends email or edits meetings.
- Local backend plus MCP RSS measured about 391 MiB after real tool calls. Render/Linux memory and free-instance compatibility are unknown until deployed.
- The recorded fallback consists of actual Playwright journey videos and screenshots. It is labeled replay and is not live behavior.
- The fixed evaluation is small and synthetic. It supports a portfolio claim, not a production reliability or security claim.

