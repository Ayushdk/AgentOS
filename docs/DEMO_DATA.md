# Deterministic synthetic demo data

`backend/agentos/seed.py` remains the small baseline fixture used by normal local startup and tests. `backend/agentos/demo_seed.py` is an opt-in rich scenario generator.

## Rich dataset

- fixed seed `20261009`;
- stable tenant ID by default;
- 50 fictional employees in five departments;
- four managers and three HR users;
- two leave-balance types per employee;
- 70 additional leave requests plus the five baseline records;
- 40 HR tickets;
- 24 simulated calendar events;
- UUIDv5 identifiers for generated records; and
- synthetic audit events for generated leave/ticket fixtures.

The generator does not create policy records because the repository's versioned Markdown policy corpus is ingested separately by `python -m agentos.retrieval`.

## Commands

```powershell
# No database write
uv run python -m agentos.demo_seed plan --dry-run

# Idempotent creation and validation
uv run python -m agentos.demo_seed seed
uv run python -m agentos.demo_seed validate
```

The validator checks employee count, department count, manager links, leave ranges, and generated totals. Running `seed` again does not duplicate rich records.

## Reset guard

Reset deletes only records belonging to the explicitly named local demo tenant. It refuses unless:

- `DEMO_ENVIRONMENT=true`;
- application environment is `local` or `test`;
- the configured database host is `127.0.0.1` or `localhost`;
- the target tenant exists; and
- its stored kind is exactly `local_demo`.

```powershell
$env:DEMO_ENVIRONMENT='true'
uv run python -m agentos.demo_seed reset --tenant-id 00000000-0000-0000-0000-0000000000d0
```

Never change these guards or point this command at Supabase. A future hosted cleanup mechanism should be a separately reviewed, scoped retention job.

## Scenario mapping

- **Employee to Manager:** use E001 and E010 through the actual draft/confirm/review services.
- **Policy support:** ingest the Markdown corpus and ask a question whose citation can be opened.
- **HR support:** confirm a handoff as an employee, then inspect/resolve it as HR.
- **Workforce analytics:** use the approved `/analytics` reports; totals originate from tenant records and reporting views.

Historical approved/rejected/pending rows are fixtures for exploration. Interactive state transitions must continue to use domain services and cannot be simulated by frontend-only changes.
