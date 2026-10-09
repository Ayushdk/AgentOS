"""Deterministic business rules. All callers, including MCP, cross these checks."""

import hashlib
import json
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from .auth import Identity, require_role
from .db import transaction
from .errors import DomainError
from .models import (
    AgentRun,
    Approval,
    AuditEvent,
    Balance,
    CalendarEvent,
    Employee,
    Holiday,
    Leave,
    Ticket,
    now,
    uid,
)

TZ = ZoneInfo("Asia/Kolkata")


def digest(payload):
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str, separators=(",", ":")).encode()
    ).hexdigest()


def audit(s, ctx, kind, detail, run_id=None):
    s.add(
        AuditEvent(
            tenant_id=ctx.tenant_id, employee_id=ctx.employee_id, kind=kind, detail=detail, run_id=run_id
        )
    )


def scope(ctx, model):
    return select(model).where(model.tenant_id == ctx.tenant_id, model.employee_id == ctx.employee_id)


def working_days(s, start, end):
    if end < start or (end - start).days > 90:
        raise DomainError("invalid_dates", "Use an ordered date range of at most 91 calendar days.")
    holidays = {r.day: r.title for r in s.scalars(select(Holiday).where(Holiday.day.between(start, end)))}
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    work = [d for d in days if d.weekday() < 5 and d not in holidays]
    return {
        "days": len(work),
        "working_dates": [d.isoformat() for d in work],
        "holidays": [{"date": str(d), "title": t} for d, t in holidays.items()],
        "timezone": "Asia/Kolkata",
        "working_week": "Monday–Friday",
    }


def calculate_working_days(ctx, start_date, end_date):
    with transaction() as s:
        return working_days(s, date.fromisoformat(start_date), date.fromisoformat(end_date))


def reserved(s, ctx, typ, exclude=None):
    q = select(func.coalesce(func.sum(Leave.days), 0)).where(
        Leave.tenant_id == ctx.tenant_id,
        Leave.employee_id == ctx.employee_id,
        Leave.leave_type == typ,
        Leave.status == "pending",
    )
    if exclude:
        q = q.where(Leave.id != exclude)
    return int(s.scalar(q))


def get_my_leave_balance(ctx):
    with transaction() as s:
        return {
            "balances": [
                {
                    "leave_type": b.leave_type,
                    "remaining": b.remaining,
                    "reserved": reserved(s, ctx, b.leave_type),
                    "available": b.remaining - reserved(s, ctx, b.leave_type),
                }
                for b in s.scalars(scope(ctx, Balance).order_by(Balance.leave_type))
            ],
            "rule": "Pending requests reserve days. Approval deducts the reservation from remaining balance.",
        }


def calendar(s, ctx, start, end):
    left = datetime.combine(start, time.min, TZ)
    right = datetime.combine(end + timedelta(days=1), time.min, TZ)
    return [
        {
            "id": e.id,
            "title": e.title,
            "starts_at": e.starts_at.astimezone(TZ).isoformat(),
            "ends_at": e.ends_at.astimezone(TZ).isoformat(),
        }
        for e in s.scalars(
            scope(ctx, CalendarEvent).where(CalendarEvent.starts_at < right, CalendarEvent.ends_at > left)
        )
    ]


def get_my_calendar_events(ctx, start_date, end_date):
    start, end = date.fromisoformat(start_date), date.fromisoformat(end_date)
    with transaction() as s:
        working_days(s, start, end)
        return {"events": calendar(s, ctx, start, end), "simulated": True}


def validate_leave(s, ctx, start, end, typ, exclude=None, locked_balance=None):
    if start < now().astimezone(TZ).date():
        raise DomainError("past_dates", "Leave must start today or later.")
    if typ not in ("annual", "sick"):
        raise DomainError("leave_type", "Choose annual or sick leave.")
    calc = working_days(s, start, end)
    if not calc["days"]:
        raise DomainError("no_working_days", "This range has no working days.")
    b = locked_balance or s.get(Balance, (ctx.tenant_id, ctx.employee_id, typ))
    if not b:
        raise DomainError("balance_missing", "No balance is configured for this leave type.")
    available = b.remaining - reserved(s, ctx, typ, exclude)
    if calc["days"] > available:
        raise DomainError("insufficient_balance", f"Only {available} days are available.")
    q = scope(ctx, Leave).where(
        Leave.status.in_(["pending", "approved"]), Leave.start_date <= end, Leave.end_date >= start
    )
    if exclude:
        q = q.where(Leave.id != exclude)
    if s.scalar(q):
        raise DomainError("overlap", "This range overlaps an existing pending or approved request.")
    return {**calc, "available": available, "conflicts": calendar(s, ctx, start, end)}


def leave_payload(row):
    return {
        "id": row.id,
        "start_date": str(row.start_date),
        "end_date": str(row.end_date),
        "leave_type": row.leave_type,
        "days": row.days,
    }


def pack_leave(row):
    return {
        **leave_payload(row),
        "status": row.status,
        "employee_id": row.employee_id,
        "created_at": row.created_at.isoformat(),
    }


def prepare_leave_request(ctx, start_date, end_date, leave_type, idempotency_key):
    start, end = date.fromisoformat(start_date), date.fromisoformat(end_date)
    with transaction() as s:
        employee = s.get(Employee, (ctx.tenant_id, ctx.employee_id))
        if not employee or not employee.manager_id:
            raise DomainError(
                "manager_missing",
                "No reporting manager is assigned to this employee. Contact People Operations before requesting leave.",
            )
        # Serialize draft creation as well as balance-changing operations per employee/type.
        b = s.scalar(scope(ctx, Balance).where(Balance.leave_type == leave_type).with_for_update())
        prior = s.scalar(scope(ctx, Leave).where(Leave.idempotency_key == idempotency_key))
        if prior:
            if (prior.start_date, prior.end_date, prior.leave_type) != (start, end, leave_type):
                raise DomainError(
                    "idempotency_conflict", "This request key already refers to a different draft.", 409
                )
            a = s.scalar(
                scope(ctx, Approval).where(Approval.action == "submit_leave", Approval.target_id == prior.id)
            )
            return {
                "draft": pack_leave(prior),
                "approval_id": a.id,
                "expires_at": a.expires_at.isoformat(),
                "calculation": validate_leave(s, ctx, start, end, leave_type, prior.id, b),
            }
        facts = validate_leave(s, ctx, start, end, leave_type, locked_balance=b)
        row = Leave(
            id=uid(),
            tenant_id=ctx.tenant_id,
            employee_id=ctx.employee_id,
            leave_type=leave_type,
            start_date=start,
            end_date=end,
            days=facts["days"],
            idempotency_key=idempotency_key,
        )
        s.add(row)
        s.flush()
        a = Approval(
            id=uid(),
            tenant_id=ctx.tenant_id,
            employee_id=ctx.employee_id,
            action="submit_leave",
            target_id=row.id,
            payload_hash=digest(leave_payload(row)),
            expires_at=now() + timedelta(minutes=30),
        )
        s.add(a)
        audit(s, ctx, "leave.drafted", {"draft_id": row.id, "days": row.days})
        return {
            "draft": pack_leave(row),
            "approval_id": a.id,
            "expires_at": a.expires_at.isoformat(),
            "calculation": facts,
        }


def check_approval(s, ctx, approval_id, action, target, payload):
    a = s.scalar(scope(ctx, Approval).where(Approval.id == approval_id).with_for_update())
    if not a or a.action != action or a.target_id != target:
        raise DomainError("approval_required", "A matching server-side approval is required.", 403)
    if a.payload_hash != digest(payload):
        raise DomainError("draft_changed", "Draft changed. Prepare a new confirmation.", 409)
    if a.status not in ("confirmed", "consumed"):
        raise DomainError("approval_required", "Confirm the exact draft before proceeding.", 403)
    if a.status != "consumed" and a.expires_at < now():
        raise DomainError("approval_expired", "Confirmation expired. Prepare a new draft.", 409)
    return a


def confirm_approval(ctx, approval_id, approved):
    with transaction() as s:
        a = s.scalar(scope(ctx, Approval).where(Approval.id == approval_id).with_for_update())
        if not a:
            raise DomainError("not_found", "Approval not found.", 404)
        desired = "confirmed" if approved else "cancelled"
        if a.status in ("consumed", "confirmed") and approved:
            return {"status": a.status}
        if a.status == "cancelled" and not approved:
            return {"status": "cancelled"}
        if a.status != "awaiting":
            raise DomainError("approval_closed", "This confirmation is already closed.", 409)
        if a.expires_at < now():
            raise DomainError("approval_expired", "Confirmation expired. Prepare a new draft.", 409)
        if a.action == "submit_leave":
            row = s.scalar(scope(ctx, Leave).where(Leave.id == a.target_id))
            if not row or a.payload_hash != digest(leave_payload(row)):
                raise DomainError("draft_changed", "Draft changed. Prepare a new confirmation.", 409)
            if not approved:
                row.status = "cancelled"
        a.status = desired
        a.confirmed_at = now()
        audit(s, ctx, "confirmation." + desired, {"approval_id": a.id, "action": a.action})
        return {"status": desired}


def submit_leave_request(ctx, draft_id, approval_id):
    with transaction() as s:
        # Lock order: employee balance -> leave -> approval, shared with manager review.
        row = s.scalar(scope(ctx, Leave).where(Leave.id == draft_id))
        if not row:
            raise DomainError("not_found", "Draft not found.", 404)
        b = s.scalar(scope(ctx, Balance).where(Balance.leave_type == row.leave_type).with_for_update())
        s.refresh(row, with_for_update=True)
        a = check_approval(s, ctx, approval_id, "submit_leave", draft_id, leave_payload(row))
        if row.status in ("pending", "approved", "rejected") and a.status == "consumed":
            return {"request": pack_leave(row), "duplicate_prevented": True}
        if row.status != "draft":
            raise DomainError("invalid_state", "Only an active draft may be submitted.", 409)
        facts = validate_leave(s, ctx, row.start_date, row.end_date, row.leave_type, row.id, b)
        if row.days != facts["days"]:
            raise DomainError("draft_changed", "Working days changed; prepare a new draft.", 409)
        row.status = "pending"
        row.updated_at = now()
        a.status = "consumed"
        audit(s, ctx, "leave.employee_confirmed", {"request_id": row.id})
        audit(s, ctx, "leave.pending_manager", {"request_id": row.id})
        return {"request": pack_leave(row), "duplicate_prevented": False}


def manager_target(s, ctx, request_id):
    require_role(ctx, "manager")
    row = s.scalar(select(Leave).where(Leave.id == request_id, Leave.tenant_id == ctx.tenant_id))
    employee = s.get(Employee, (ctx.tenant_id, row.employee_id)) if row else None
    if not row or not employee or employee.manager_id != ctx.employee_id:
        raise DomainError("not_found", "Direct-report request not found.", 404)
    return row, employee


def authorize_review(ctx, request_id, decision):
    if decision not in ("approved", "rejected"):
        raise DomainError("decision", "Choose approve or reject.")
    with transaction() as s:
        row, _ = manager_target(s, ctx, request_id)
        s.refresh(row, with_for_update=True)
        existing = s.scalar(
            scope(ctx, Approval).where(Approval.action == "review_leave", Approval.target_id == request_id)
        )
        payload = {"request_id": request_id, "decision": decision}
        if existing:
            if existing.payload_hash != digest(payload):
                raise DomainError("review_closed", "A different decision was already recorded.", 409)
            return existing.id
        a = Approval(
            id=uid(),
            tenant_id=ctx.tenant_id,
            employee_id=ctx.employee_id,
            action="review_leave",
            target_id=request_id,
            payload_hash=digest(payload),
            status="confirmed",
            expires_at=now() + timedelta(minutes=5),
            confirmed_at=now(),
        )
        s.add(a)
        return a.id


def review_leave_request(ctx, request_id, decision, approval_id):
    with transaction() as s:
        row, employee = manager_target(s, ctx, request_id)
        owner = Identity(tenant_id=ctx.tenant_id, employee_id=employee.id, role=employee.role)
        b = s.scalar(scope(owner, Balance).where(Balance.leave_type == row.leave_type).with_for_update())
        s.refresh(row, with_for_update=True)
        a = check_approval(
            s, ctx, approval_id, "review_leave", request_id, {"request_id": request_id, "decision": decision}
        )
        if row.status == decision and a.status == "consumed":
            return {"request": pack_leave(row), "duplicate_prevented": True}
        if row.status != "pending":
            raise DomainError("invalid_state", "Only pending requests can be reviewed.", 409)
        if decision == "approved":
            facts = validate_leave(s, owner, row.start_date, row.end_date, row.leave_type, row.id, b)
            if facts["days"] != row.days:
                raise DomainError(
                    "draft_changed", "Holiday calendar changed; employee must create a new request.", 409
                )
            b.remaining -= row.days
        elif decision != "rejected":
            raise DomainError("decision", "Choose approve or reject.")
        row.status = decision
        row.updated_at = now()
        a.status = "consumed"
        audit(s, ctx, "leave." + decision, {"request_id": row.id, "employee_id": row.employee_id})
        return {"request": pack_leave(row), "duplicate_prevented": False}


def handoff_payload(run):
    return {
        "run_id": run.id,
        "question": run.question,
        "evidence": run.result.get("citations", []),
        "checks": run.result.get("checks", []),
        "reason": run.result.get("handoff_reason", "missing_evidence"),
    }


def prepare_handoff(ctx, run_id):
    with transaction() as s:
        run = s.scalar(scope(ctx, AgentRun).where(AgentRun.id == run_id).with_for_update())
        if not run:
            raise DomainError("not_found", "Run not found.", 404)
        a = s.scalar(
            scope(ctx, Approval).where(Approval.action == "create_ticket", Approval.target_id == run_id)
        )
        if not a:
            a = Approval(
                id=uid(),
                tenant_id=ctx.tenant_id,
                employee_id=ctx.employee_id,
                action="create_ticket",
                target_id=run_id,
                payload_hash=digest(handoff_payload(run)),
                expires_at=now() + timedelta(minutes=30),
            )
            s.add(a)
        return {"approval_id": a.id, "expires_at": a.expires_at.isoformat()}


def create_hr_ticket(ctx, run_id, approval_id):
    with transaction() as s:
        run = s.scalar(scope(ctx, AgentRun).where(AgentRun.id == run_id).with_for_update())
        if not run:
            raise DomainError("not_found", "Run not found.", 404)
        payload = handoff_payload(run)
        a = check_approval(s, ctx, approval_id, "create_ticket", run_id, payload)
        prior = s.scalar(scope(ctx, Ticket).where(Ticket.run_id == run_id))
        if prior:
            return {"ticket_id": prior.id, "status": prior.status, "duplicate_prevented": True}
        row = Ticket(id=uid(), tenant_id=ctx.tenant_id, employee_id=ctx.employee_id, **payload)
        s.add(row)
        s.flush()
        a.status = "consumed"
        audit(s, ctx, "handoff.created", {"ticket_id": row.id}, run_id)
        return {"ticket_id": row.id, "status": row.status, "duplicate_prevented": False}
