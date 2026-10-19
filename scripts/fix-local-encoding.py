import os

import psycopg

database_url = os.environ.get("DATABASE_URL_SETUP")
target_database_url = os.environ.get("DATABASE_URL")
if not database_url or not target_database_url:
    raise SystemExit("DATABASE_URL_SETUP and DATABASE_URL must point to local PostgreSQL databases")

with psycopg.connect(database_url, autocommit=True) as c:
    encoding = c.execute(
        "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname='agentos'"
    ).fetchone()[0]
    if encoding != "UTF8":
        with psycopg.connect(target_database_url) as check:
            assert (
                check.execute(
                    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
                ).fetchone()[0]
                == 0
            )
        c.execute("DROP DATABASE agentos")
        c.execute("CREATE DATABASE agentos TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'")
print("Local database UTF8 verified")
