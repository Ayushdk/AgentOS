import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs/promises';
let port = 5432;
try {
  const envContent = await fs.readFile('.env', 'utf-8');
  const match = envContent.match(/DATABASE_URL=.*?:(\d+)\//);
  if (match) port = parseInt(match[1], 10);
} catch {}
if (process.env.PGPORT) port = parseInt(process.env.PGPORT, 10);

const pg = new EmbeddedPostgres({databaseDir:'.local/postgres',user:'agentos',password:'agentos_local',port,persistent:true,initdbFlags:['--encoding=UTF8','--locale=C'],authMethod:'scram-sha-256',postgresFlags:['-h','127.0.0.1']});
if (process.argv[2] === 'stop') { await pg.stop(); process.exit(0); }
try { await fs.access('.local/postgres/PG_VERSION'); } catch { await pg.initialise(); }

// Starting an already-running persistent cluster should be a successful no-op.
// This also avoids treating a valid postmaster.pid as a stale-lock failure.
try {
  const existing = pg.getPgClient();
  await existing.connect();
  await existing.query('SELECT 1');
  await existing.end();
  console.log(`Local PostgreSQL is already ready at 127.0.0.1:${port}.`);
  process.exit(0);
} catch {
  // No server is accepting connections; start the persisted cluster below.
}

await pg.start();
const c=pg.getPgClient(); await c.connect();
if (!(await c.query("SELECT 1 FROM pg_database WHERE datname='agentos'")).rowCount) await c.query("CREATE DATABASE agentos TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'");
if (!(await c.query("SELECT 1 FROM pg_roles WHERE rolname='agentos_report'")).rowCount) await c.query("CREATE ROLE agentos_report LOGIN PASSWORD 'report_local'");
await c.end();
console.log(`Local PostgreSQL ready at 127.0.0.1:${port}. Development credentials only.`);
const shutdown=async()=>{await pg.stop();process.exit(0)};
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
await new Promise(()=>{});
