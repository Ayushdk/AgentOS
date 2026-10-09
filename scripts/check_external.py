"""Read-only availability check. Does not run inference or print secrets."""

import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
result = {}
try:
    from google import genai

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    models = list(client.models.list())
    result["gemini"] = {
        "model_list_accessible": True,
        "candidates": [
            {"name": m.name, "actions": m.supported_actions}
            for m in models
            if "flash" in m.name and "image" not in m.name and "tts" not in m.name
        ],
    }
except Exception as e:
    result["gemini"] = {
        "model_list_accessible": False,
        "error_type": type(e).__name__,
        "status": getattr(e, "code", None),
    }
try:
    import psycopg

    with psycopg.connect(os.environ["DATABASE_URL_SETUP"], connect_timeout=15, sslmode="require") as c:
        result["supabase"] = {
            "connected": True,
            "tables": [
                list(r)
                for r in c.execute(
                    "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('public','reporting','checkpoints') ORDER BY 1,2"
                )
            ],
            "vector_available": bool(
                c.execute("SELECT count(*) FROM pg_available_extensions WHERE name='vector'").fetchone()[0]
            ),
            "vector_installed": bool(
                c.execute("SELECT count(*) FROM pg_extension WHERE extname='vector'").fetchone()[0]
            ),
        }
except Exception as e:
    result["supabase"] = {"connected": False, "error_type": type(e).__name__}
Path("artifacts").mkdir(exist_ok=True)
Path("artifacts/external-availability.json").write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
