"""Private stdio MCP server. Identity is verified for EVERY call, not global state."""

import logging

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel

from . import services
from .analytics import query_hr_analytics as analytics
from .auth import verify
from .errors import DomainError
from .retrieval import search_policies as search

mcp = FastMCP("AgentOS private HR tools")


class ToolEnvelope(BaseModel):
    ok: bool
    data: dict = {}
    error: dict | None = None


def execute(token, fn, **args):
    try:
        ctx = verify(token, "mcp")
        return ToolEnvelope(ok=True, data=fn(ctx, **args)).model_dump()
    except DomainError as e:
        return ToolEnvelope(
            ok=False, error={"code": e.code, "message": e.message, "status": e.status}
        ).model_dump()
    except (ValueError, TypeError):
        return ToolEnvelope(
            ok=False, error={"code": "invalid_arguments", "message": "Invalid tool arguments.", "status": 400}
        ).model_dump()
    except Exception:
        logging.exception("Tool failed")
        return ToolEnvelope(
            ok=False,
            error={
                "code": "tool_unavailable",
                "message": "The required service is temporarily unavailable.",
                "status": 503,
            },
        ).model_dump()


@mcp.tool()
def get_my_leave_balance(context_token: str) -> ToolEnvelope:
    return execute(context_token, services.get_my_leave_balance)


@mcp.tool()
def get_my_calendar_events(context_token: str, start_date: str, end_date: str) -> ToolEnvelope:
    return execute(context_token, services.get_my_calendar_events, start_date=start_date, end_date=end_date)


@mcp.tool()
def calculate_working_days(context_token: str, start_date: str, end_date: str) -> ToolEnvelope:
    return execute(context_token, services.calculate_working_days, start_date=start_date, end_date=end_date)


@mcp.tool()
def prepare_leave_request(
    context_token: str, start_date: str, end_date: str, leave_type: str, idempotency_key: str
) -> ToolEnvelope:
    return execute(
        context_token,
        services.prepare_leave_request,
        start_date=start_date,
        end_date=end_date,
        leave_type=leave_type,
        idempotency_key=idempotency_key,
    )


@mcp.tool()
def submit_leave_request(context_token: str, draft_id: str, approval_id: str) -> ToolEnvelope:
    return execute(context_token, services.submit_leave_request, draft_id=draft_id, approval_id=approval_id)


@mcp.tool()
def review_leave_request(
    context_token: str, request_id: str, decision: str, approval_id: str
) -> ToolEnvelope:
    return execute(
        context_token,
        services.review_leave_request,
        request_id=request_id,
        decision=decision,
        approval_id=approval_id,
    )


@mcp.tool()
def search_policies(context_token: str, query: str) -> ToolEnvelope:
    return execute(context_token, search, query=query)


@mcp.tool()
def create_hr_ticket(context_token: str, run_id: str, approval_id: str) -> ToolEnvelope:
    return execute(context_token, services.create_hr_ticket, run_id=run_id, approval_id=approval_id)


@mcp.tool()
def query_hr_analytics(
    context_token: str,
    report: str = "headcount",
    start_date: str = "2026-01-01",
    end_date: str = "2026-12-31",
    sql: str | None = None,
) -> ToolEnvelope:
    return execute(context_token, analytics, report=report, start_date=start_date, end_date=end_date, sql=sql)


if __name__ == "__main__":
    mcp.run(transport="stdio")
