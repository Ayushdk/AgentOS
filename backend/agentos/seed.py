"""Repeatable fictional data. Never exposes a reset endpoint."""

from datetime import date, datetime, timezone

from .db import transaction
from .models import Balance, CalendarEvent, Employee, Holiday, Leave, Tenant, uid

SEED = 20261009
DEPARTMENTS = ["Engineering", "Product", "Operations", "Finance", "People"]
FIRST = ["Ari", "Mira", "Dev", "Leena", "Rohan", "Nila", "Kiran", "Isha", "Samar", "Tara"]
LAST = ["Sen", "Rao", "Mehta", "Das", "Shah"]
DEMO_IDS = {"employee": "E001", "manager": "E010", "hr": "E050"}
LEGACY_DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def seed_tenant(tenant_id=None, kind="demo"):
    tenant_id = tenant_id or uid()
    with transaction() as s:
        if s.get(Tenant, tenant_id):
            return tenant_id
        s.add(Tenant(id=tenant_id, kind=kind))
        s.flush()
        for i in range(1, 51):
            dept = (i - 1) // 10
            role = "hr" if i >= 48 else ("manager" if i % 10 == 0 else "employee")
            manager_id = None
            if role == "employee":
                manager_id = f"E{(dept + 1) * 10:03}" if dept < 4 else "E040"
            s.add(
                Employee(
                    tenant_id=tenant_id,
                    id=f"E{i:03}",
                    name=FIRST[(i - 1) % 10] + " " + LAST[dept],
                    department=DEPARTMENTS[dept],
                    role=role,
                    manager_id=manager_id,
                    joined_on=date(2024 + (i % 3), 1 + ((i * 7) % 9), 1 + (i % 25)),
                    exited_on=date(2026, 8, 28) if i in (8, 28, 38) else None,
                )
            )
        s.flush()
        for i in range(1, 51):
            for typ, amount in [("annual", 18), ("sick", 8)]:
                s.add(
                    Balance(
                        tenant_id=tenant_id,
                        employee_id=f"E{i:03}",
                        leave_type=typ,
                        remaining=1 if i == 2 and typ == "annual" else amount,
                    )
                )
        for day, title in [
            (date(2026, 11, 18), "Meridian Foundation Day"),
            (date(2026, 12, 25), "Winter Holiday"),
            (date(2027, 1, 1), "New Year"),
        ]:
            if not s.get(Holiday, day):
                s.add(Holiday(day=day, title=title))
        s.add(
            CalendarEvent(
                tenant_id=tenant_id,
                employee_id="E001",
                title="Product planning · simulated",
                starts_at=datetime(2026, 11, 17, 5, 30, tzinfo=timezone.utc),
                ends_at=datetime(2026, 11, 17, 6, 30, tzinfo=timezone.utc),
            )
        )
        s.add(
            Leave(
                tenant_id=tenant_id,
                employee_id="E001",
                leave_type="annual",
                start_date=date(2026, 12, 7),
                end_date=date(2026, 12, 8),
                days=2,
                status="pending",
                idempotency_key="seed-pending",
            )
        )
        for i, month in [(3, 6), (13, 7), (23, 8), (33, 9)]:
            s.add(
                Leave(
                    tenant_id=tenant_id,
                    employee_id=f"E{i:03}",
                    leave_type="annual",
                    start_date=date(2026, month, 17),
                    end_date=date(2026, month, 18),
                    days=1 if month == 7 else 2,
                    status="approved",
                    idempotency_key="seed-approved",
                )
            )
    return tenant_id


if __name__ == "__main__":
    print(seed_tenant("00000000-0000-0000-0000-000000000001", "local"))
