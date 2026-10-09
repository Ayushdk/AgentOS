import asyncio
import json
import os
import sys
import time
from contextlib import asynccontextmanager

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from pydantic import BaseModel, ConfigDict, Field

from .auth import sign
from .config import ROOT, settings
from .db import transaction
from .errors import DomainError
from .services import audit


class ToolEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ok: bool
    data: dict = Field(default_factory=dict)
    error: dict | None = None


READS = {
    "get_my_leave_balance",
    "get_my_calendar_events",
    "calculate_working_days",
    "search_policies",
    "query_hr_analytics",
}
PERMITTED = {
    "policy": {"search_policies"},
    "workflow": {
        "get_my_leave_balance",
        "get_my_calendar_events",
        "calculate_working_days",
        "prepare_leave_request",
    },
    "analytics": {"query_hr_analytics"},
    "execution": {"submit_leave_request", "review_leave_request", "create_hr_ticket"},
}


class Gateway:
    def __init__(self, session, tools):
        self.session, self.tools = session, tools

    async def call(self, ctx, name, args, run_id=None, specialist=None):
        if name not in self.tools or (specialist and name not in PERMITTED[specialist]):
            raise DomainError("tool_not_permitted", "This specialist cannot use that tool.", 403)
        # Caller arguments can never replace server-generated identity.
        if "context_token" in args:
            raise DomainError("identity_override", "Tool identity is server-bound.", 403)
        began = time.perf_counter()
        for attempt in range(2 if name in READS else 1):
            try:
                result = await asyncio.wait_for(
                    self.session.call_tool(name, {**args, "context_token": sign(ctx, "mcp", 5)}),
                    settings().tool_timeout_seconds,
                )
                if result.isError:
                    raise DomainError("tool_unavailable", "MCP tool failed.", 503)
                payload = result.structuredContent
                if payload is None:
                    payload = json.loads(next(c.text for c in result.content if c.type == "text"))
                envelope = ToolEnvelope.model_validate(payload)
                if not envelope.ok:
                    error = envelope.error or {}
                    raise DomainError(
                        error.get("code", "tool_failed"),
                        error.get("message", "Tool failed."),
                        error.get("status", 400),
                    )
                self.record(ctx, name, run_id, began, "ok", attempt, args)
                return envelope.data
            except DomainError as e:
                self.record(ctx, name, run_id, began, e.code, attempt, args)
                raise
            except Exception:
                self.record(ctx, name, run_id, began, "transport_failure", attempt, args)
                if attempt + 1 >= (2 if name in READS else 1):
                    raise DomainError(
                        "tool_unavailable", "MCP service unavailable. Retry safely or contact HR.", 503
                    ) from None
                await asyncio.sleep(0.2)

    def record(self, ctx, name, run_id, began, outcome, attempt, args):
        with transaction() as s:
            audit(
                s,
                ctx,
                "mcp.tool",
                {
                    "tool": name,
                    "argument_keys": sorted(args),
                    "outcome": outcome,
                    "attempt": attempt + 1,
                    "duration_ms": round((time.perf_counter() - began) * 1000),
                },
                run_id,
            )


@asynccontextmanager
async def connect_mcp():
    env = {
        k: v
        for k, v in os.environ.items()
        if k
        in {
            "SYSTEMROOT",
            "WINDIR",
            "PATH",
            "TEMP",
            "TMP",
            "USERPROFILE",
            "HOME",
            "PYTHONPATH",
            "DATABASE_URL",
            "ANALYTICS_DATABASE_URL",
            "SESSION_SECRET",
            "ENVIRONMENT",
            "AUTH_MODE",
            "SUPABASE_URL",
            "FRONTEND_ORIGIN",
            "EMBEDDING_MODE",
            "EMBEDDING_CACHE_DIR",
        }
    }
    env["PYTHONPATH"] = str(ROOT / "backend")
    params = StdioServerParameters(
        command=sys.executable, args=["-m", "agentos.mcp_server"], env=env, cwd=str(ROOT)
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            discovered = await session.list_tools()
            yield Gateway(session, {t.name: t.model_dump(mode="json") for t in discovered.tools})
