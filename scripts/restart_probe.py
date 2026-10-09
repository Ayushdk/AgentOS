"""Two fresh OS processes prove checkpoint and idempotent resume persistence."""

import asyncio
import json
import os
import subprocess
import sys
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

STATE = Path(".local/restart-probe.json")


async def stage(mode):
    if mode == "prepare":
        tenant = seed_tenant()
        rid = uid()
        ctx = resolve_identity(tenant, "E001")
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
        info = {"tenant": tenant, "run_id": rid, "prepare_pid": os.getpid()}
    else:
        info = json.loads(STATE.read_text())
        rid = info["run_id"]
        ctx = resolve_identity(info["tenant"], "E001")
    async with connect_mcp() as gateway:
        saver = DurableSaver()
        graph = build_graph(gateway, saver)
        config = {"configurable": {"thread_id": rid}}
        if mode == "prepare":
            result = await graph.ainvoke(
                {
                    "context": ctx.model_dump(),
                    "run_id": rid,
                    "question": "Check leave November 16–20, 2026",
                    "action": "",
                },
                config,
            )
            assert result.get("__interrupt__")
            info["approval_id"] = result["approval_id"]
            info["draft_id"] = result["draft_reference"]
            STATE.write_text(json.dumps(info))
        else:
            state = await graph.aget_state(config)
            assert state.values["draft_reference"] == info["draft_id"]
            confirm_approval(ctx, info["approval_id"], True)
            result = await graph.ainvoke(Command(resume={"approved": True}), config)
            assert result["result"]["request"]["status"] == "pending"
            replay = await gateway.call(
                ctx,
                "submit_leave_request",
                {"draft_id": info["draft_id"], "approval_id": info["approval_id"]},
            )
            assert replay["duplicate_prevented"]
            assert os.getpid() != info["prepare_pid"]
            proof = {
                "two_distinct_processes": True,
                "prepare_pid": info["prepare_pid"],
                "resume_pid": os.getpid(),
                "checkpoint": "PostgreSQL",
                "status": "pending",
                "duplicate_prevented": True,
                "mode": "development",
            }
            Path("artifacts/restart-proof.json").write_text(json.dumps(proof, indent=2))
            print(json.dumps(proof))
        saver.close()


if len(sys.argv) > 1:
    asyncio.run(stage(sys.argv[1]))
else:
    STATE.parent.mkdir(exist_ok=True)
    for mode in ["prepare", "resume"]:
        subprocess.run([sys.executable, __file__, mode], check=True)
