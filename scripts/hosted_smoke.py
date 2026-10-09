"""Verify actual hosted PostgreSQL, pgvector, MCP, and durable workflow boundaries."""

import asyncio
import json
import os
from pathlib import Path

from dotenv import dotenv_values

os.environ.update({k: v for k, v in dotenv_values(".env.hosted").items() if v is not None})
# This command tests application business functions, not HTTP authentication.
from agentos.auth import resolve_identity
from agentos.checkpoints import DurableSaver
from agentos.db import transaction
from agentos.graph import build_graph
from agentos.mcp_client import connect_mcp
from agentos.models import AgentRun, uid
from agentos.retrieval import ingest
from agentos.seed import seed_tenant
from agentos.services import authorize_review, confirm_approval
from langgraph.types import Command


async def main():
    tenant = seed_tenant("00000000-0000-0000-0000-000000000001", "hosted_synthetic")
    ingestion = ingest()
    ctx = resolve_identity(tenant, "E001")
    manager = resolve_identity(tenant, "E010")
    hr = resolve_identity(tenant, "E050")
    async with connect_mcp() as g:
        policy = await g.call(ctx, "search_policies", {"query": "How many annual leave days do I get?"})
        assert policy["retrieval_mode"] == "hybrid_pgvector_fts"
        rid = uid()
        with transaction() as s:
            s.add(
                AgentRun(
                    id=rid,
                    tenant_id=tenant,
                    employee_id="E001",
                    question="Check leave November 16–20, 2026",
                    mode="development",
                )
            )
        saver = DurableSaver()
        graph = build_graph(g, saver)
        config = {"configurable": {"thread_id": rid}}
        state = await graph.ainvoke(
            {
                "context": ctx.model_dump(),
                "run_id": rid,
                "question": "Check leave November 16–20, 2026",
                "action": "",
            },
            config,
        )
        assert state.get("__interrupt__")
        saver.close()
        saver = DurableSaver()
        graph = build_graph(g, saver)
        saved = await graph.aget_state(config)
        assert saved.values["draft_reference"] == state["draft_reference"]
        confirm_approval(ctx, state["approval_id"], True)
        result = await graph.ainvoke(Command(resume={"approved": True}), config)
        request = result["result"]["request"]
        assert request["status"] == "pending"
        aid = authorize_review(manager, request["id"], "approved")
        approved = await g.call(
            manager,
            "review_leave_request",
            {"request_id": request["id"], "decision": "approved", "approval_id": aid},
        )
        assert approved["request"]["status"] == "approved"
        report = await g.call(hr, "query_hr_analytics", {"report": "headcount", "end_date": "2026-12-31"})
        saver.close()
        proof = {
            "database": "Supabase PostgreSQL",
            "authentication_tested": False,
            "model_mode": "development",
            "ingestion": ingestion,
            "mcp_transport": "stdio",
            "discovered_tools": sorted(g.tools),
            "citation_ids": [c["id"] for c in policy["citations"]],
            "retrieval_mode": policy["retrieval_mode"],
            "checkpoint_reconnected": True,
            "employee_confirmation": "pending",
            "manager_review": "approved",
            "approved_days": approved["request"]["days"],
            "headcount_rows": report["rows"],
        }
        Path("artifacts/hosted-integration.json").write_text(json.dumps(proof, indent=2))
        print(json.dumps(proof, indent=2))


asyncio.run(main())
