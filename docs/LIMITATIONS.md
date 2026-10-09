# Limits and remaining verification

- Live Gemini inference was smoke-tested after the user confirmed the project is on the Free tier. The current runtime uses `gemini-3.5-flash-lite` and one model request per normal employee message; the earlier two-turn `gemini-3.8-flash` evidence is retained. These checks verify connectivity and representative behavior, not broad conversational quality or production reliability. Persisted daily and per-run call bounds limit usage; provider quotas remain authoritative.
- Supabase Auth signing-key discovery succeeded. Anonymous sign-in is disabled and no synthetic Auth users were created, so hosted login is not yet exercised end to end.
- Supabase PostgreSQL, pgvector retrieval, MCP, checkpoints, approval, and reporting were verified with synthetic data.
- Local PostgreSQL lacks pgvector and clearly reports the JSON cosine fallback. Docker Compose provides the full pgvector path.
- Calendar and HR integrations are simulated. The application never sends email or edits meetings.
- Local backend plus MCP RSS measured about 391 MiB after real tool calls. Render/Linux memory and free-instance compatibility are unknown until deployed.
- The recorded fallback consists of actual Playwright journey videos and screenshots. It is labeled replay and is not live behavior.
- The fixed evaluation is small and synthetic. It supports a portfolio claim, not a production reliability or security claim.

