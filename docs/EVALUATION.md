# Evaluation report

The frozen final dataset contains 60 cases: 15 policy/citation, 15 workflow, 10 analytics, 10 permission/injection, and 10 recovery/retry cases. Development questions are stored separately.

On October 9, 2026, all 60 deterministic scenarios passed once against PostgreSQL and the real stdio MCP client/server. The run observed zero unauthorized accesses/actions and zero duplicate submissions. Median warm scenario latency was 40.39 ms; p95 was 2246.07 ms. The first policy case, marked as the cold embedding start, took 802.18 ms. A later expanded suite passed 72 tests, and three Playwright journeys passed.

These figures are test-suite results for deterministic services and injected recovery faults. They are not 60 live Gemini trials and do not establish production security. Citation support is checked by exact containment in retrieved source sections; it has not received independent human review. Live Gemini inference remains unverified because free-tier/billing status was not confirmed. Render memory and cold-start behavior remain unverified because no Render account session is available.

Machine-readable evidence is in `artifacts/evaluation-results.json`, `artifacts/hosted-integration.json`, `artifacts/restart-proof.json`, `artifacts/topology-comparison.json`, `artifacts/backend-memory.json`, and `artifacts/browser-results.json`.

