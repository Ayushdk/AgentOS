import json
from pathlib import Path

import psutil

processes = []
for p in psutil.process_iter(["pid", "name", "cmdline", "memory_info"]):
    try:
        command = " ".join(p.info["cmdline"] or [])
        if ("uvicorn agentos.api:app" in command or "agentos.mcp_server" in command) and p.info[
            "name"
        ].lower().startswith("python"):
            mem = p.memory_info()
            processes.append(
                {
                    "pid": p.pid,
                    "component": "MCP tools + embeddings"
                    if "mcp_server" in command
                    else "FastAPI + LangGraph",
                    "rss_mb": round(mem.rss / 2**20, 2),
                    "peak_mb": round(getattr(mem, "peak_wset", mem.rss) / 2**20, 2),
                }
            )
    except (psutil.AccessDenied, psutil.NoSuchProcess):
        pass
result = {
    "platform": "Windows local",
    "processes": processes,
    "total_rss_mb": round(sum(p["rss_mb"] for p in processes), 2),
    "target_host_verified": False,
    "note": "Measured after actual tool calls. Render/Linux memory, cold start, and hosting eligibility still require a deployment smoke test.",
}
Path("artifacts/backend-memory.json").write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
