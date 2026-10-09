import asyncio
import json
import time
from pathlib import Path

from agentos.auth import resolve_identity
from agentos.checkpoints import DurableSaver
from agentos.db import transaction
from agentos.graph import build_graph
from agentos.mcp_client import connect_mcp
from agentos.models import AgentRun, uid
from agentos.seed import seed_tenant
from agentos.services import confirm_approval
from langgraph.types import Command


async def main():
    tenant = seed_tenant()
    rows = []
    async with connect_mcp() as g:
        for topology in ["single", "specialists"]:
            saver = DurableSaver()
            graph = build_graph(g, saver)
            if topology == "single":
                graph = build_graph(g, saver, topology="single")
            for role, question in [
                ("E001", "How many annual leave days do I get?"),
                ("E001", "Check leave November 16–20, 2026"),
                ("E050", "Show headcount by department"),
            ]:
                ctx = resolve_identity(tenant, role)
                rid = uid()
                config = {"configurable": {"thread_id": rid}}
                with transaction() as s:
                    s.add(
                        AgentRun(
                            id=rid, tenant_id=tenant, employee_id=role, question=question, mode="development"
                        )
                    )
                began = time.perf_counter()
                state = await graph.ainvoke(
                    {"context": ctx.model_dump(), "run_id": rid, "question": question, "action": ""}, config
                )
                result = state["result"]
                normalized = {k: result[k] for k in ("answer", "rows", "citations") if k in result}
                if result.get("draft"):
                    normalized = {"days": result["draft"]["days"], "status": result["draft"]["status"]}
                rows.append(
                    {
                        "topology": topology,
                        "question": question,
                        "latency_ms": round((time.perf_counter() - began) * 1000),
                        "model_calls": 0,
                        "result": normalized,
                    }
                )
                if state.get("__interrupt__"):
                    confirm_approval(ctx, state["approval_id"], False)
                    await graph.ainvoke(Command(resume={"approved": False}), config)
            saver.close()
    comparison = {
        "mode": "development",
        "same_business_results": all(rows[i]["result"] == rows[i + 3]["result"] for i in range(3)),
        "note": "Single-worker and specialist graphs share deterministic services and tool restrictions. This is not a live-model quality comparison. Single graph ran first and includes cold embedding load.",
        "runs": rows,
    }
    Path("artifacts/topology-comparison.json").write_text(json.dumps(comparison, indent=2))
    print(json.dumps({k: v for k, v in comparison.items() if k != "runs"}))


asyncio.run(main())
