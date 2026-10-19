"""Deterministic rich demo fixtures with a deliberately narrow reset boundary.

This module is opt-in. The ordinary ``seed_tenant`` fixture stays small so the
evaluation suite remains fast. Reset is permitted only for an explicitly named
``local_demo`` tenant on a loopback database while DEMO_ENVIRONMENT=true.
"""

import argparse
import os
import random
import uuid
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlparse

from sqlalchemy import delete, func, select

from .config import settings
from .db import transaction
from .models import (
    AgentRun,
    Approval,
    AuditEvent,
    AuthIdentity,
    Balance,
    CalendarEvent,
    Employee,
    Leave,
    Tenant,
    Ticket,
)
from .seed import SEED, seed_tenant

NAMESPACE = uuid.UUID("b13f0bca-43cd-4d2c-92e0-d7336b140773")
RICH_TENANT_ID = "00000000-0000-0000-0000-0000000000d0"
CHILD_MODELS = (AuditEvent, Approval, Ticket, AgentRun, Leave, CalendarEvent, Balance, AuthIdentity, Employee)


def stable_id(kind: str, index: int) -> str:
    return str(uuid.uuid5(NAMESPACE, f"agentos:{SEED}:{kind}:{index}"))


def plan():
    return {
        "seed": SEED,
        "tenant_id": RICH_TENANT_ID,
        "employees": 50,
        "departments": 5,
        "managers": 4,
        "hr_users": 3,
        "leave_requests": 70,
        "hr_tickets": 40,
        "synthetic_only": True,
    }


def _weekday_span(start: date, days: int):
    end = start
    remaining = days - 1
    while remaining:
        end += timedelta(days=1)
        if end.weekday() < 5:
            remaining -= 1
    return end


def seed_rich_demo(tenant_id: str = RICH_TENANT_ID, dry_run: bool = False):
    if dry_run:
        return {**plan(), "tenant_id": tenant_id, "dry_run": True}
    seed_tenant(tenant_id, "local_demo")
    rng = random.Random(SEED)
    statuses = ("approved", "approved", "approved", "rejected", "pending")
    with transaction() as session:
        tenant = session.get(Tenant, tenant_id)
        if not tenant or tenant.kind != "local_demo":
            raise RuntimeError("Rich fixtures require a local_demo tenant.")
        # Normalize older local-demo fixtures created before the richer role map.
        for number in range(41, 51):
            employee = session.get(Employee, (tenant_id, f"E{number:03}"))
            if number >= 48:
                employee.role, employee.manager_id = "hr", None
            else:
                employee.role, employee.manager_id = "employee", "E040"

        existing_leave = session.scalar(
            select(func.count()).select_from(Leave).where(
                Leave.tenant_id == tenant_id,
                Leave.idempotency_key.like("rich-demo-%"),
            )
        )
        if not existing_leave:
            approved_days: dict[tuple[str, str], int] = {}
            for prior in session.scalars(select(Leave).where(
                Leave.tenant_id == tenant_id, Leave.status == "approved"
            )):
                key = (prior.employee_id, prior.leave_type)
                approved_days[key] = approved_days.get(key, 0) + prior.days
            for index in range(70):
                employee_number = 1 + (index % 49)
                employee_id = f"E{employee_number:03}"
                leave_type = "sick" if index % 5 == 0 else "annual"
                start = date(2025 + (index // 48), 1 + (index * 5) % 12, 3 + (index * 7) % 20)
                while start.weekday() >= 5:
                    start += timedelta(days=1)
                days = 1 + (index % 3)
                status = statuses[index % len(statuses)]
                end = _weekday_span(start, days)
                row = Leave(
                    id=stable_id("leave", index), tenant_id=tenant_id, employee_id=employee_id,
                    leave_type=leave_type, start_date=start, end_date=end, days=days, status=status,
                    idempotency_key=f"rich-demo-{index:03}",
                )
                session.add(row)
                if status == "approved":
                    key = (employee_id, leave_type)
                    approved_days[key] = approved_days.get(key, 0) + days
                session.add(AuditEvent(
                    id=stable_id("leave-audit", index), tenant_id=tenant_id, employee_id=employee_id,
                    kind=f"seed.leave.{status}", detail={"request_id": row.id, "synthetic": True},
                ))
            for key, used in approved_days.items():
                balance = session.get(Balance, (tenant_id, *key))
                balance.remaining = max(0, balance.remaining - used)

        existing_tickets = session.scalar(
            select(func.count()).select_from(Ticket).where(
                Ticket.tenant_id == tenant_id, Ticket.reason.like("synthetic_demo_%")
            )
        )
        if not existing_tickets:
            topics = (
                "Clarify international remote-work eligibility",
                "Confirm reimbursement evidence requirements",
                "Request guidance on family leave documentation",
                "Clarify travel exception approval path",
                "Ask about onboarding equipment support",
            )
            for index in range(40):
                employee_id = f"E{1 + (index % 49):03}"
                status = "resolved" if index % 3 == 0 else "open"
                run_id = stable_id("ticket-run", index)
                session.add(Ticket(
                    id=stable_id("ticket", index), tenant_id=tenant_id, employee_id=employee_id,
                    run_id=run_id, question=topics[index % len(topics)], evidence=[],
                    checks=["synthetic_fixture", "employee_scope"], reason=f"synthetic_demo_{index % 5}",
                    status=status,
                    created_at=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(days=index * 7),
                ))
                session.add(AuditEvent(
                    id=stable_id("ticket-audit", index), tenant_id=tenant_id, employee_id=employee_id,
                    run_id=run_id, kind=f"seed.ticket.{status}",
                    detail={"ticket_id": stable_id("ticket", index), "synthetic": True},
                ))
        # A deterministic event sample across the year, without external-calendar claims.
        if session.scalar(select(func.count()).select_from(CalendarEvent).where(
            CalendarEvent.tenant_id == tenant_id, CalendarEvent.title.like("Demo %")
        )) == 0:
            for index in range(24):
                employee_id = f"E{1 + rng.randrange(49):03}"
                starts = datetime(2026, 1 + index % 12, 5 + index % 20, 5, 30, tzinfo=timezone.utc)
                session.add(CalendarEvent(
                    id=stable_id("event", index), tenant_id=tenant_id, employee_id=employee_id,
                    title=f"Demo team planning {index + 1} · simulated", starts_at=starts,
                    ends_at=starts + timedelta(hours=1),
                ))
    return validate_demo(tenant_id)


def validate_demo(tenant_id: str = RICH_TENANT_ID):
    with transaction() as session:
        employees = session.scalars(select(Employee).where(Employee.tenant_id == tenant_id)).all()
        leaves = session.scalars(select(Leave).where(Leave.tenant_id == tenant_id)).all()
        tickets = session.scalars(select(Ticket).where(Ticket.tenant_id == tenant_id)).all()
        managers = {row.id for row in employees if row.role == "manager"}
        invalid_managers = [row.id for row in employees if row.manager_id and row.manager_id not in managers]
        invalid_leave = [row.id for row in leaves if row.end_date < row.start_date or row.days <= 0]
        result = {
            "tenant_id": tenant_id,
            "employees": len(employees),
            "departments": len({row.department for row in employees}),
            "managers": len(managers),
            "hr_users": sum(row.role == "hr" for row in employees),
            "leave_requests": len(leaves),
            "hr_tickets": len(tickets),
            "invalid_manager_links": invalid_managers,
            "invalid_leave_rows": invalid_leave,
        }
    if len(employees) != 50 or invalid_managers or invalid_leave:
        raise RuntimeError(f"Demo validation failed: {result}")
    return result


def reset_local_demo(tenant_id: str = RICH_TENANT_ID):
    config = settings()
    parsed = urlparse(config.database_url.replace("postgresql+psycopg://", "postgresql://"))
    if os.getenv("DEMO_ENVIRONMENT", "").lower() != "true":
        raise RuntimeError("Reset refused: DEMO_ENVIRONMENT=true is required.")
    if config.environment not in {"local", "test"} or parsed.hostname not in {"127.0.0.1", "localhost"}:
        raise RuntimeError("Reset refused: database is not an explicitly local/test loopback target.")
    with transaction() as session:
        tenant = session.get(Tenant, tenant_id)
        if not tenant or tenant.kind != "local_demo":
            raise RuntimeError("Reset refused: target is not a local_demo tenant.")
        for model in CHILD_MODELS:
            session.execute(delete(model).where(model.tenant_id == tenant_id))
        session.delete(tenant)
    return {"reset": True, "tenant_id": tenant_id}


def main():
    parser = argparse.ArgumentParser(description="Create or validate the isolated local AgentOS demo.")
    parser.add_argument("action", choices=("plan", "seed", "validate", "reset"), nargs="?", default="plan")
    parser.add_argument("--tenant-id", default=RICH_TENANT_ID)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    actions = {
        "plan": lambda: {**plan(), "tenant_id": args.tenant_id},
        "seed": lambda: seed_rich_demo(args.tenant_id, args.dry_run),
        "validate": lambda: validate_demo(args.tenant_id),
        "reset": lambda: reset_local_demo(args.tenant_id),
    }
    print(actions[args.action]())


if __name__ == "__main__":
    main()
