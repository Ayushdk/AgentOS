-- Run as a database administrator; passwords must be supplied separately.
-- For Supabase use its SQL editor and create dedicated runtime/report roles.
DO $$ BEGIN
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='agentos_report') THEN
  CREATE ROLE agentos_report LOGIN;
 END IF;
END $$;
REVOKE ALL ON SCHEMA public FROM agentos_report;
GRANT USAGE ON SCHEMA reporting TO agentos_report;
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO agentos_report;
ALTER ROLE agentos_report SET default_transaction_read_only=on;
ALTER ROLE agentos_report SET statement_timeout='2000ms';
ALTER ROLE agentos_report SET search_path='reporting';
-- RLS denies browser/anon direct operational access. The app owns these tables,
-- so authorization is enforced by scoped queries, signed MCP context, and locks.
