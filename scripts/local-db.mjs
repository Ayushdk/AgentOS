import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs/promises';
const pg = new EmbeddedPostgres({databaseDir:'.local/postgres',user:'agentos',password:'agentos_local',port:55432,persistent:true,initdbFlags:['--encoding=UTF8','--locale=C'],authMethod:'scram-sha-256',postgresFlags:['-h','127.0.0.1']});
if (process.argv[2] === 'stop') { await pg.stop(); process.exit(0); }
try { await fs.access('.local/postgres/PG_VERSION'); } catch { await pg.initialise(); }
await pg.start();
const c=pg.getPgClient(); await c.connect();
if (!(await c.query("SELECT 1 FROM pg_database WHERE datname='agentos'")).rowCount) await c.query("CREATE DATABASE agentos TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'");
if (!(await c.query("SELECT 1 FROM pg_roles WHERE rolname='agentos_report'")).rowCount) await c.query("CREATE ROLE agentos_report LOGIN PASSWORD 'report_local'");
await c.end();
console.log('Local PostgreSQL ready at 127.0.0.1:55432. Development credentials only.');
const shutdown=async()=>{await pg.stop();process.exit(0)};
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
await new Promise(()=>{});
