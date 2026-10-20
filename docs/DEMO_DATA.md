# Deterministic synthetic demo data

`backend/agentos/seed.py` provides the baseline local/test tenant and the fixed portfolio identities. `backend/agentos/demo_seed.py` is an opt-in richer local scenario generator.

## Rich local dataset

- fixed seed `20261009` and stable tenant ID;
- 50 fictional employees across five departments;
- four managers and three HR users;
- annual and sick balances;
- 70 generated leave requests plus baseline fixtures;
- 40 HR tickets and 24 simulated calendar events; and
- deterministic UUIDv5 records and synthetic audit events.

Policies are ingested separately from the versioned Markdown corpus.

```powershell
uv run python -m agentos.demo_seed plan --dry-run
uv run python -m agentos.demo_seed seed
uv run python -m agentos.demo_seed validate
```

Reset is guarded by `DEMO_ENVIRONMENT=true`, local/test environment, loopback database host, explicit tenant ID, and `local_demo` tenant kind. Never point the reset command at Supabase.

Interactive leave, approval, ticket, and analytics demonstrations must use the real services. Historical rows are exploration fixtures, not frontend-simulated state transitions.
