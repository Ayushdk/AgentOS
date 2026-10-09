import json
import os
from pathlib import Path

import httpx
from dotenv import dotenv_values, load_dotenv

load_dotenv()
front = dotenv_values("frontend/.env.local")
url = os.environ["SUPABASE_URL"]
key = front["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
with httpx.Client(timeout=20) as c:
    r = c.get(url + "/auth/v1/settings", headers={"apikey": key})
    r.raise_for_status()
    config = r.json()
    jwks = c.get(url + "/auth/v1/.well-known/jwks.json", headers={"apikey": key})
    jwks.raise_for_status()
    result = {
        "provider_accessible": True,
        "anonymous_flags": {k: v for k, v in config.items() if "anonymous" in k},
        "external_anonymous": config.get("external", {}).get("anonymous_users"),
        "jwks_key_count": len(jwks.json().get("keys", [])),
        "jwks_algorithms": [k.get("alg") for k in jwks.json().get("keys", [])],
    }
Path("artifacts/auth-provider-check.json").write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
