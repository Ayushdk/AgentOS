import asyncio

from agentos.auth import resolve_identity
from agentos.checkpoints import DurableSaver
from agentos.db import transaction
from agentos.graph import build_graph
from agentos.mcp_client import connect_mcp
from agentos.models import AgentRun, uid
from agentos.services import confirm_approval
from langgraph.types import Command


async def main():
    ctx = resolve_identity("00000000-0000-0000-0000-000000000001", "E001")
    async with connect_mcp() as g:
        print("DISCOVERED", sorted(g.tools))
        print("BALANCE", await g.call(ctx, "get_my_leave_balance", {}))
        print(
            "POLICY", await g.call(ctx, "search_policies", {"query": "How many annual leave days do I get?"})
        )
        saver = DurableSaver()
        graph = build_graph(g, saver)
        rid = uid()
        with transaction() as s:
            s.add(
                AgentRun(
                    id=rid,
                    tenant_id=ctx.tenant_id,
                    employee_id=ctx.employee_id,
                    question="Check leave November 16–20, 2026",
                    mode="development",
                )
            )
        state = await graph.ainvoke(
            {
                "context": ctx.model_dump(),
                "run_id": rid,
                "question": "Check leave November 16–20, 2026",
                "action": "",
            },
            {"configurable": {"thread_id": rid}},
        )
        print("INTERRUPTED", bool(state.get("__interrupt__")), state.get("result"))
        confirm_approval(ctx, state["approval_id"], False)
        state = await graph.ainvoke(Command(resume={"approved": False}), {"configurable": {"thread_id": rid}})
        print("CANCELLED", state["result"])
        saver.close()


asyncio.run(main())
