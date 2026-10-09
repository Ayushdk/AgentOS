import json
import time
from pathlib import Path

import psutil
from agentos.config import settings
from agentos.retrieval import embed

p = psutil.Process()
before = p.memory_info().rss
t = time.perf_counter()
v = embed(["How many annual leave days are available?"])
result = {
    "embedding_model": settings().embedding_model,
    "dimensions": len(v[0]),
    "before_rss_mb": round(before / 2**20, 2),
    "loaded_rss_mb": round(p.memory_info().rss / 2**20, 2),
    "load_seconds": round(time.perf_counter() - t, 3),
    "threads": 2,
    "provider": "CPUExecutionProvider",
    "free_backend_compatibility": "Not established; measure full backend plus MCP child on target host.",
}
print(json.dumps(result, indent=2))

Path("artifacts").mkdir(exist_ok=True)
Path("artifacts/memory-probe.json").write_text(json.dumps(result, indent=2))
