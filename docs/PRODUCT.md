# AgentOS product brief

AgentOS is a role-based employee-operations workspace for the fictional company Meridian Ledger. Every identity, policy, leave request, ticket, calendar event, and report row is synthetic.

Employees inspect policy citations, review balances and leave history, prepare and confirm leave, view calendars, and track support tickets. Managers receive an approval inbox, availability view, direct-report directory, team calendar, and coverage indicators. HR analysts review tickets, inspect aggregate metrics, run approved reports, and view execution evidence.

The assistant is bounded by backend rules. Policy answers use eligible sources; workflow writes require confirmation; Manager review is separate; analytics uses approved reporting views. Optional Gemini inference improves grounded wording but does not own authorization or business state.

The live portfolio uses Vercel, Render Free, and Supabase. Render may require a cold start, so the frontend shows a connection state and retries safe reads within a fixed budget.
