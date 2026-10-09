import asyncio
import hashlib
import json
import time
from contextlib import asynccontextmanager, contextmanager
from datetime import timedelta
from typing import Literal
from uuid import UUID

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langgraph.types import Command
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, text

from .auth import Identity, require_role, resolve_identity, sign, supabase_identity, verify
from .checkpoints import DurableSaver
from .config import ROOT, settings
from .db import engine, transaction
from .errors import DomainError
from .graph import build_graph
from .mcp_client import connect_mcp
from .models import AgentRun, AuditEvent, Employee, Leave, Ticket, now
from .public_demo import select_demo_persona
from .retrieval import resolve_citations
from .seed import DEMO_IDS, seed_tenant
from .services import audit, authorize_review, confirm_approval, pack_leave, scope


@asynccontextmanager
async def lifespan(app):
    saver = DurableSaver()
    try:
        async with connect_mcp() as gateway:
            app.state.gateway = gateway
            app.state.graph = build_graph(gateway, saver)
            yield
    finally:
        saver.close()


app = FastAPI(title="AgentOS", version="1.0.0", lifespan=lifespan)
allowed_origins = {settings().frontend_origin}
if settings().environment == "local":
    allowed_origins.update({"http://localhost:3000", "http://127.0.0.1:3000"})
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-AgentOS-Request"],
)


@app.exception_handler(DomainError)
async def domain_error(request, error):
    return JSONResponse({"error": {"code": error.code, "message": error.message}}, status_code=error.status)


@app.exception_handler(Exception)
async def unexpected_error(request, error):
    return JSONResponse(
        {
            "error": {
                "code": "service_unavailable",
                "message": "The service is unavailable. Retry safely; completed writes remain protected against duplicates.",
            }
        },
        status_code=503,
    )


@app.middleware("http")
async def protect_origin(request, call_next):
    if request.method == "POST":
        origin = request.headers.get("origin")
        if origin and origin not in allowed_origins:
            return JSONResponse(
                {"error": {"code": "origin", "message": "Origin not allowed."}}, status_code=403
            )
        if request.headers.get("x-agentos-request") != "1":
            return JSONResponse(
                {"error": {"code": "csrf", "message": "Missing request protection header."}}, status_code=403
            )
        if int(request.headers.get("content-length", "0") or 0) > 16000:
            return JSONResponse(
                {"error": {"code": "request_size", "message": "Request is too large."}}, status_code=413
            )
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def identity(request: Request):
    if settings().auth_mode == "supabase":
        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer "):
            raise DomainError("unauthorized", "Please sign in.", 401)
        return supabase_identity(auth[7:])
    token = request.cookies.get("agentos_session", "")
    if not token:
        raise DomainError("unauthorized", "Choose a demo identity to begin.", 401)
    return verify(token)


class StrictBody(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DemoLogin(StrictBody):
    persona: Literal["employee", "manager", "hr"] = "employee"


class ChatBody(StrictBody):
    question: str = Field(min_length=2, max_length=2000)
    request_id: UUID
    parent_run_id: UUID | None = None


class Decision(StrictBody):
    approved: bool


class Review(StrictBody):
    decision: Literal["approved", "rejected"]


class ReportBody(StrictBody):
    report: Literal["headcount", "joiners", "joining_trends", "approved_leave"] = "headcount"
    start_date: str = "2026-01-01"
    end_date: str = "2026-12-31"


@app.get("/health")
def health():
    with engine().connect() as c:
        c.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "model_mode": settings().model_mode,
        "auth_mode": settings().auth_mode,
        "public_demo": settings().enable_public_demo,
        "company": "Meridian Ledger",
        "simulated_integrations": True,
        "timezone": "Asia/Kolkata",
    }


@app.post("/auth/demo")
def demo_login(body: DemoLogin, request: Request, response: Response):
    if settings().auth_mode != "development" or settings().environment == "hosted":
        raise DomainError("disabled", "Demo signed sessions are available only locally.", 403)
    tenant = None
    if request.cookies.get("agentos_session"):
        try:
            tenant = verify(request.cookies["agentos_session"]).tenant_id
        except DomainError:
            pass
    if not tenant:
        tenant = seed_tenant()
    ctx = resolve_identity(tenant, DEMO_IDS[body.persona])
    response.set_cookie(
        "agentos_session", sign(ctx), httponly=True, samesite="lax", secure=False, max_age=28800, path="/"
    )
    return ctx.model_dump()


@app.get("/auth/me")
def me(ctx: Identity = Depends(identity)):
    return ctx.model_dump()


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("agentos_session")
    return {"ok": True}


@contextmanager
def run_lock(run_id):
    lock = int.from_bytes(hashlib.sha256(run_id.encode()).digest()[:8], signed=True)
    with engine().connect() as c:
        acquired = c.scalar(text("SELECT pg_try_advisory_lock(:id)"), {"id": lock})
        if not acquired:
            raise DomainError("run_busy", "This request is already running. Retry shortly.", 409)
        try:
            yield
        finally:
            c.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": lock})


def get_run(ctx, run_id):
    with transaction() as s:
        run = s.scalar(scope(ctx, AgentRun).where(AgentRun.id == run_id))
        if not run:
            raise DomainError("not_found", "Run not found.", 404)
        return run


def run_json(run):
    return {
        "id": run.id,
        "question": run.question,
        "status": run.status,
        "mode": run.mode,
        "specialist": run.specialist,
        "result": run.result,
        "created_at": run.created_at.isoformat(),
        "latency_ms": run.latency_ms,
        "model_calls": run.model_calls,
        "token_usage": run.token_usage,
    }


async def drive(ctx, run_id, input_value):
    began = time.perf_counter()
    try:
        result = await asyncio.wait_for(
            app.state.graph.ainvoke(
                input_value, {"configurable": {"thread_id": run_id}, "recursion_limit": 12}
            ),
            90,
        )
        pending = bool(result.get("__interrupt__"))
        with transaction() as s:
            run = s.get(AgentRun, run_id)
            run.result = result.get("result", {})
            run.status = "awaiting_confirmation" if pending else "completed"
            run.latency_ms += round((time.perf_counter() - began) * 1000)
            audit(s, ctx, "run." + run.status, {"latency_ms": run.latency_ms}, run_id)
            return run_json(run)
    except Exception as e:
        code = e.code if isinstance(e, DomainError) else "service_unavailable"
        with transaction() as s:
            run = s.get(AgentRun, run_id)
            run.status = "retryable_failure"
            audit(s, ctx, "run.failed", {"code": code}, run_id)
        if isinstance(e, DomainError):
            raise
        raise DomainError(
            "service_unavailable",
            "The workflow paused after a service failure. Retry this run to recover from its saved checkpoint.",
            503,
        ) from None


@app.post("/chat")
async def chat(body: ChatBody, ctx: Identity = Depends(identity)):
    run_id = str(body.request_id)
    with run_lock(run_id):
        with transaction() as s:
            prior = s.get(AgentRun, run_id)
            if prior:
                if (prior.tenant_id, prior.employee_id) != (ctx.tenant_id, ctx.employee_id):
                    raise DomainError("not_found", "Run not found.", 404)
                if prior.question != body.question:
                    raise DomainError("idempotency_conflict", "This request key is already used.", 409)
                return run_json(prior)
            count = s.scalar(
                select(func.count())
                .select_from(AgentRun)
                .where(
                    AgentRun.tenant_id == ctx.tenant_id, AgentRun.created_at > now() - timedelta(minutes=1)
                )
            )
            if count >= settings().request_limit:
                raise DomainError(
                    "rate_limited", "Please wait a minute before starting another request.", 429
                )
            s.add(
                AgentRun(
                    id=run_id,
                    tenant_id=ctx.tenant_id,
                    employee_id=ctx.employee_id,
                    question=body.question,
                    mode=settings().model_mode,
                )
            )
        question = body.question
        if body.parent_run_id:
            parent = get_run(ctx, str(body.parent_run_id))
            previous_answer = str(parent.result.get("answer", ""))[:1200]
            label = (
                "Employee clarification" if parent.result.get("needs_clarification") else "Employee follow-up"
            )
            question = (
                "Previous employee request: "
                + parent.question[:1000]
                + "\nPrevious grounded answer: "
                + previous_answer
                + f"\n{label}: "
                + question
            )
        return await drive(
            ctx,
            run_id,
            {
                "context": ctx.model_dump(),
                "run_id": run_id,
                "question": question,
                "approval_status": "none",
                "handoff_status": "none",
                "action": "",
                "result": {},
            },
        )


@app.get("/runs")
def history(ctx: Identity = Depends(identity)):
    with transaction() as s:
        return [
            run_json(r)
            for r in s.scalars(scope(ctx, AgentRun).order_by(AgentRun.created_at.desc()).limit(30))
        ]


@app.get("/runs/{run_id}")
def run_detail(run_id: UUID, ctx: Identity = Depends(identity)):
    return run_json(get_run(ctx, str(run_id)))


@app.post("/runs/{run_id}/resume")
async def resume(run_id: UUID, body: Decision, ctx: Identity = Depends(identity)):
    rid = str(run_id)
    with run_lock(rid):
        run = get_run(ctx, rid)
        if run.status == "completed":
            return run_json(run)
        snapshot = await app.state.graph.aget_state({"configurable": {"thread_id": rid}})
        approval_id = snapshot.values.get("approval_id")
        if not approval_id:
            raise DomainError("no_approval", "There is no confirmation pending for this run.", 409)
        confirm_approval(ctx, approval_id, body.approved)
        interrupted = any(t.interrupts for t in snapshot.tasks)
        return await drive(ctx, rid, Command(resume={"approved": body.approved}) if interrupted else None)


@app.post("/runs/{run_id}/retry")
async def retry(run_id: UUID, ctx: Identity = Depends(identity)):
    rid = str(run_id)
    with run_lock(rid):
        run = get_run(ctx, rid)
        if run.status != "retryable_failure":
            raise DomainError("invalid_state", "Only failed runs can be retried.", 409)
        return await drive(ctx, rid, None)


@app.get("/runs/{run_id}/events")
def events(run_id: UUID, ctx: Identity = Depends(identity)):
    get_run(ctx, str(run_id))
    with transaction() as s:
        return [
            {"id": e.id, "kind": e.kind, "detail": e.detail, "created_at": e.created_at.isoformat()}
            for e in s.scalars(
                scope(ctx, AuditEvent).where(AuditEvent.run_id == str(run_id)).order_by(AuditEvent.created_at)
            )
        ]


@app.get("/balances")
async def balances(ctx: Identity = Depends(identity)):
    return await app.state.gateway.call(ctx, "get_my_leave_balance", {})


@app.get("/leave")
def leave_list(ctx: Identity = Depends(identity)):
    with transaction() as s:
        return [pack_leave(r) for r in s.scalars(scope(ctx, Leave).order_by(Leave.created_at.desc()))]


@app.get("/manager/queue")
def manager_queue(ctx: Identity = Depends(identity)):
    require_role(ctx, "manager")
    with transaction() as s:
        pairs = s.execute(
            select(Leave, Employee)
            .join(Employee, (Employee.id == Leave.employee_id) & (Employee.tenant_id == Leave.tenant_id))
            .where(
                Leave.tenant_id == ctx.tenant_id,
                Employee.manager_id == ctx.employee_id,
                Leave.status == "pending",
            )
            .order_by(Leave.created_at)
        )
        return [{**pack_leave(leave), "employee_name": e.name} for leave, e in pairs]


@app.post("/manager/requests/{request_id}/review")
async def review(request_id: UUID, body: Review, ctx: Identity = Depends(identity)):
    approval_id = authorize_review(ctx, str(request_id), body.decision)
    return await app.state.gateway.call(
        ctx,
        "review_leave_request",
        {"request_id": str(request_id), "decision": body.decision, "approval_id": approval_id},
        specialist="execution",
    )


@app.post("/analytics")
async def analytics(body: ReportBody, ctx: Identity = Depends(identity)):
    require_role(ctx, "hr")
    return await app.state.gateway.call(ctx, "query_hr_analytics", body.model_dump(), specialist="analytics")


@app.get("/tickets")
def tickets(ctx: Identity = Depends(identity)):
    require_role(ctx, "hr")
    with transaction() as s:
        rows = s.scalars(
            select(Ticket)
            .where(Ticket.tenant_id == ctx.tenant_id)
            .order_by(Ticket.created_at.desc())
            .limit(100)
        )
        return [
            {
                "id": t.id,
                "employee_id": t.employee_id,
                "question": t.question,
                "reason": t.reason,
                "status": t.status,
                "evidence": t.evidence,
                "checks": t.checks,
                "created_at": t.created_at.isoformat(),
            }
            for t in rows
        ]


@app.post("/tickets/{ticket_id}/resolve")
def resolve_ticket(ticket_id: UUID, ctx: Identity = Depends(identity)):
    require_role(ctx, "hr")
    with transaction() as s:
        row = s.scalar(
            select(Ticket)
            .where(Ticket.id == str(ticket_id), Ticket.tenant_id == ctx.tenant_id)
            .with_for_update()
        )
        if not row:
            raise DomainError("not_found", "Ticket not found.", 404)
        row.status = "resolved"
        audit(s, ctx, "handoff.resolved", {"ticket_id": row.id})
        return {"id": row.id, "status": row.status}


@app.get("/citations/{citation_id}")
def get_citation(citation_id: str, ctx: Identity = Depends(identity)):
    return resolve_citations(ctx, [citation_id])[0]


@app.get("/evaluation")
def evaluation(ctx: Identity = Depends(identity)):
    require_role(ctx, "hr")
    p = ROOT / "artifacts" / "evaluation-results.json"
    return json.loads(p.read_text()) if p.exists() else {"status": "not_run", "live_model_verified": False}


@app.get("/mcp/tools")
def tool_manifest(ctx: Identity = Depends(identity)):
    require_role(ctx, "hr")
    return {
        "transport": "private stdio",
        "tools": [
            {
                "name": n,
                "inputSchema": {
                    **t["inputSchema"],
                    "properties": {
                        k: v for k, v in t["inputSchema"]["properties"].items() if k != "context_token"
                    },
                },
            }
            for n, t in app.state.gateway.tools.items()
        ],
    }


@app.post("/auth/demo/persona")
def hosted_demo_persona(body: DemoLogin, request: Request):
    token = request.headers.get("authorization", "")
    if not token.startswith("Bearer "):
        raise DomainError("unauthorized", "Supabase anonymous authentication is required.", 401)
    return select_demo_persona(token[7:], body.persona).model_dump()
