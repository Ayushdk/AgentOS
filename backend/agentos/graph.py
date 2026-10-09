from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from .auth import Identity
from .config import settings
from .db import transaction
from .errors import DomainError
from .model import ModelAdapter, Plan, development_plan
from .models import AgentRun
from .services import audit, prepare_handoff


class State(TypedDict, total=False):
    context: dict
    run_id: str
    question: str
    plan: dict
    resolved_dates: dict
    evidence: list
    tool_results: dict
    draft_reference: str
    approval_status: str
    handoff_status: str
    approval_id: str
    action: str
    result: dict
    final_response: str
    model_degraded: bool


def build_graph(gateway, checkpointer, topology="specialists"):
    model = ModelAdapter()

    async def call(state, name, args, specialist):
        return await gateway.call(Identity(**state["context"]), name, args, state["run_id"], specialist)

    async def grounded(state, specialist, result, fallback):
        result = {**result}
        if settings().model_mode != "live" or state.get("model_degraded"):
            result["answer"] = fallback
            result["response_mode"] = "quota_fallback" if state.get("model_degraded") else "deterministic"
            return result
        ctx = Identity(**state["context"])
        with transaction() as s:
            run = s.get(AgentRun, state["run_id"])
            if run.model_calls >= 4:
                result["answer"] = fallback
                result["response_mode"] = "bounded_fallback"
                return result
            run.model_calls += 1
            audit(
                s,
                ctx,
                "model.synthesis_attempt",
                {"model": settings().gemini_model, "specialist": specialist},
                state["run_id"],
            )
        facts = {key: value for key, value in result.items() if key != "answer"}
        try:
            answer, meta = await model.synthesize(state["question"], specialist, facts, fallback)
            result["answer"] = answer
            result["response_mode"] = "live_grounded"
            with transaction() as s:
                run = s.get(AgentRun, state["run_id"])
                run.token_usage = {**run.token_usage, "synthesis": meta["tokens"]}
        except DomainError as error:
            result["answer"] = fallback
            result["response_mode"] = (
                "quota_fallback" if error.code == "quota_exhausted" else "model_fallback"
            )
            with transaction() as s:
                audit(
                    s,
                    ctx,
                    "model.synthesis_fallback",
                    {"code": error.code},
                    state["run_id"],
                )
        return result

    async def coordinator(state):
        ctx = Identity(**state["context"])
        if settings().model_mode == "live":
            with transaction() as s:
                run = s.get(AgentRun, state["run_id"])
                if run.model_calls >= 4:
                    raise DomainError("quota_exhausted", "This run reached its model-call limit.", 429)
                run.model_calls += 1
                audit(s, ctx, "model.attempt", {"model": settings().gemini_model}, state["run_id"])
        try:
            plan, meta = await model.plan(state["question"])
        except DomainError as e:
            # Model availability must not disable read-only support. The local
            # planner cannot grant permissions or bypass the normal approval path.
            plan = development_plan(state["question"])
            with transaction() as s:
                audit(
                    s,
                    ctx,
                    "model.routing_fallback",
                    {"code": e.code, "planner": "development-rules-v1"},
                    state["run_id"],
                )
            meta = {"model": "development-rules-v1", "tokens": {}}
            model_degraded = True
        else:
            model_degraded = False
        specialist = (
            "workflow"
            if plan.intent in ("leave", "balance", "calendar")
            else (
                "policy"
                if plan.intent == "policy"
                else ("analytics" if plan.intent == "analytics" else "clarify")
            )
        )
        with transaction() as s:
            run = s.get(AgentRun, state["run_id"])
            run.specialist = specialist
            run.token_usage = meta["tokens"]
            audit(
                s,
                ctx,
                "specialist.transition",
                {"from": "coordinator", "to": specialist, "model": meta["model"]},
                state["run_id"],
            )
        return {
            "plan": plan.model_dump(),
            "model_degraded": model_degraded,
            "resolved_dates": {"start": plan.start_date, "end": plan.end_date},
            "tool_results": {},
            "evidence": [],
        }

    async def handoff(state, result):
        ctx = Identity(**state["context"])
        with transaction() as s:
            run = s.get(AgentRun, state["run_id"])
            run.result = result
        approval = prepare_handoff(ctx, state["run_id"])
        return {
            "action": "create_ticket",
            "approval_id": approval["approval_id"],
            "handoff_status": "offered",
            "result": {**result, **approval, "action": "create_ticket"},
            "final_response": result["answer"],
        }

    async def policy(state):
        # Search with the coordinator's focused query. Follow-up state can include the
        # previous answer for conversational context, which must not become retrieval
        # keywords or accidentally trigger an exception handoff.
        plan = Plan(**state["plan"])
        query = plan.query.strip() or state["question"]
        result = await call(state, "search_policies", {"query": query}, "policy")
        if result.get("handoff_reason"):
            return await handoff(state, result)
        result = await grounded(state, "policy", result, result["answer"])
        return {"result": result, "evidence": result["citations"], "final_response": result["answer"]}

    async def workflow(state):
        plan = Plan(**state["plan"])
        if plan.intent == "balance":
            result = await call(state, "get_my_leave_balance", {}, "workflow")
            balance_summary = "; ".join(
                f"{item['leave_type'].title()}: {item['available']} available "
                f"({item['remaining']} remaining, {item['reserved']} reserved)"
                for item in result["balances"]
            )
            result = await grounded(
                state,
                "workflow",
                result,
                f"Your current leave balance is {balance_summary}. Pending requests reserve available days.",
            )
            return {"result": result}
        dates = {"start_date": plan.start_date, "end_date": plan.end_date}
        try:
            events = await call(state, "get_my_calendar_events", dates, "workflow")
            if plan.intent == "calendar":
                events = await grounded(
                    state, "workflow", events, "Here are your simulated calendar events for this period."
                )
                return {"result": events}
            balance = await call(state, "get_my_leave_balance", {}, "workflow")
            calculation = await call(state, "calculate_working_days", dates, "workflow")
            draft = await call(
                state,
                "prepare_leave_request",
                {**dates, "leave_type": plan.leave_type, "idempotency_key": state["run_id"]},
                "workflow",
            )
            result = await grounded(
                state,
                "workflow",
                {**draft, "action": "submit_leave"},
                "I checked your dates, balance, holidays, and simulated calendar. Review this draft below. Confirming submits it for separate manager approval; it does not approve your leave.",
            )
            return {
                "action": "submit_leave",
                "approval_id": draft["approval_id"],
                "draft_reference": draft["draft"]["id"],
                "approval_status": "awaiting_employee",
                "tool_results": {"balance": balance, "calendar": events, "calculation": calculation},
                "result": result,
            }
        except DomainError as e:
            if e.status >= 500:
                return await handoff(
                    state,
                    {
                        "answer": e.message,
                        "handoff_reason": "tool_unavailable",
                        "checks": ["leave_tools"],
                        "citations": [],
                    },
                )
            return {"result": {"answer": e.message, "error_code": e.code}}

    async def analytics(state):
        plan = Plan(**state["plan"])
        try:
            if settings().model_mode == "live":
                with transaction() as s:
                    run = s.get(AgentRun, state["run_id"])
                    if run.model_calls >= 4:
                        raise DomainError("quota_exhausted", "This run reached its model-call limit.", 429)
                    run.model_calls += 1
            sql, usage = await model.analytics_sql(state["question"], plan.report)
            if sql:
                with transaction() as s:
                    run = s.get(AgentRun, state["run_id"])
                    run.token_usage = {**run.token_usage, "analytics": usage}
            result = await call(
                state,
                "query_hr_analytics",
                {
                    "report": plan.report,
                    "start_date": plan.start_date or "2026-01-01",
                    "end_date": plan.end_date or "2026-12-31",
                    "sql": sql,
                },
                "analytics",
            )
            result = await grounded(
                state,
                "analytics",
                result,
                f"I found {len(result['rows'])} aggregate groups for the selected period, totaling {result['total']} {result['chart']['unit'].lower()}. The chart and source rows below use the returned report data.",
            )
            return {"result": result}
        except DomainError as e:
            return {"result": {"answer": e.message, "error_code": e.code}}

    async def clarification(state):
        return {"result": {"answer": state["plan"]["clarification"], "needs_clarification": True}}

    def approval(state):
        decision = interrupt(
            {"action": state["action"], "approval_id": state["approval_id"], "result": state["result"]}
        )
        # The API records confirmation first; the tool checks it again independently.
        return {"approval_status": "confirmed" if decision.get("approved") is True else "cancelled"}

    async def execute(state):
        if state["approval_status"] == "cancelled":
            return {
                "result": {
                    **state["result"],
                    "answer": "Cancelled. Nothing was submitted.",
                    "cancelled": True,
                },
                "handoff_status": "cancelled",
            }
        if state["action"] == "submit_leave":
            result = await call(
                state,
                "submit_leave_request",
                {"draft_id": state["draft_reference"], "approval_id": state["approval_id"]},
                "execution",
            )
            return {
                "result": {
                    **result,
                    "answer": "Submitted for manager approval. Your manager must make a separate decision.",
                }
            }
        result = await call(
            state,
            "create_hr_ticket",
            {"run_id": state["run_id"], "approval_id": state["approval_id"]},
            "execution",
        )
        return {
            "result": {**result, "answer": "Your question has been saved to the HR handoff queue."},
            "handoff_status": "created",
        }

    def route(state):
        if state.get("action"):
            return "approval"
        intent = state["plan"]["intent"]
        return {
            "policy": "policy",
            "leave": "workflow",
            "balance": "workflow",
            "calendar": "workflow",
            "analytics": "analytics",
            "clarify": "clarify",
        }[intent]

    def after(state):
        return "approval" if state.get("action") else END

    async def single_worker(state):
        intent = state["plan"]["intent"]
        node = {
            "policy": policy,
            "leave": workflow,
            "balance": workflow,
            "calendar": workflow,
            "analytics": analytics,
            "clarify": clarification,
        }[intent]
        return await node(state)

    if topology == "single":
        graph = StateGraph(State)
        for name, node in [
            ("coordinator", coordinator),
            ("worker", single_worker),
            ("approval", approval),
            ("execute", execute),
        ]:
            graph.add_node(name, node)
        graph.add_edge(START, "coordinator")
        graph.add_conditional_edges(
            "coordinator", lambda state: "approval" if state.get("action") else "worker"
        )
        graph.add_conditional_edges("worker", after)
        graph.add_edge("approval", "execute")
        graph.add_edge("execute", END)
        return graph.compile(checkpointer=checkpointer)
    graph = StateGraph(State)
    for name, node in [
        ("coordinator", coordinator),
        ("policy", policy),
        ("workflow", workflow),
        ("analytics", analytics),
        ("clarify", clarification),
        ("approval", approval),
        ("execute", execute),
    ]:
        graph.add_node(name, node)
    graph.add_edge(START, "coordinator")
    graph.add_conditional_edges("coordinator", route)
    for name in ("policy", "workflow", "analytics", "clarify"):
        graph.add_conditional_edges(name, after)
    graph.add_edge("approval", "execute")
    graph.add_edge("execute", END)
    return graph.compile(checkpointer=checkpointer)
