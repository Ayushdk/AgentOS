"""Local/operator-only retention command; deliberately no reset API."""

from datetime import timedelta

from sqlalchemy import delete, select

from .checkpoints import DurableSaver
from .config import settings
from .db import transaction
from .models import (
    AgentRun,
    AuditEvent,
    now,
)


def prune():
    cutoff = now() - timedelta(days=settings().log_retention_days)
    with transaction() as s:
        removed = s.execute(delete(AuditEvent).where(AuditEvent.created_at < cutoff)).rowcount
        stale = list(
            s.scalars(select(AgentRun.id).where(AgentRun.created_at < cutoff, AgentRun.status == "completed"))
        )
    saver = DurableSaver()
    for rid in stale:
        saver.saver.delete_thread(rid)
    saver.close()
    with transaction() as s:
        # Keep the synthetic business/ticket records; remove old prompts and trace payloads.
        for rid in stale:
            run = s.get(AgentRun, rid)
            run.question = "[removed by retention]"
            run.token_usage = {}
            run.result = {"answer": "Archived by retention policy."}
    return {"audit_events_removed": removed, "completed_checkpoints_removed": len(stale)}


if __name__ == "__main__":
    print(prune())
