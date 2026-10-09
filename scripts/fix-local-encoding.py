import psycopg

with psycopg.connect("postgresql://agentos:agentos_local@127.0.0.1:55432/postgres", autocommit=True) as c:
    encoding = c.execute(
        "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname='agentos'"
    ).fetchone()[0]
    if encoding != "UTF8":
        with psycopg.connect("postgresql://agentos:agentos_local@127.0.0.1:55432/agentos") as check:
            assert (
                check.execute(
                    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
                ).fetchone()[0]
                == 0
            )
        c.execute("DROP DATABASE agentos")
        c.execute("CREATE DATABASE agentos TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'")
print("Local database UTF8 verified")
