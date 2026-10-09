import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, CheckConstraint, Date, DateTime, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def uid():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    kind: Mapped[str] = mapped_column(String(20), default="demo")


class Employee(Base):
    __tablename__ = "employees"
    tenant_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    department: Mapped[str] = mapped_column(String(40))
    role: Mapped[str] = mapped_column(String(20), default="employee")
    manager_id: Mapped[str | None] = mapped_column(String(20))
    joined_on: Mapped[date] = mapped_column(Date)
    exited_on: Mapped[date | None] = mapped_column(Date)


class AuthIdentity(Base):
    __tablename__ = "auth_identities"
    subject: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(36))
    employee_id: Mapped[str] = mapped_column(String(20))


class Balance(Base):
    __tablename__ = "leave_balances"
    tenant_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    leave_type: Mapped[str] = mapped_column(String(20), primary_key=True)
    remaining: Mapped[int] = mapped_column(Integer)
    __table_args__ = (CheckConstraint("remaining >= 0"),)


class Leave(Base):
    __tablename__ = "leave_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(20))
    leave_type: Mapped[str] = mapped_column(String(20))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    days: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    idempotency_key: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        UniqueConstraint("tenant_id", "employee_id", "idempotency_key"),
        CheckConstraint("days > 0"),
        CheckConstraint("end_date >= start_date"),
        CheckConstraint("status IN ('draft','pending','approved','rejected','cancelled')"),
    )


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(String(36))
    employee_id: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(100))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Holiday(Base):
    __tablename__ = "holidays"
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    title: Mapped[str] = mapped_column(String(80))


class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(String(36))
    employee_id: Mapped[str] = mapped_column(String(20))
    action: Mapped[str] = mapped_column(String(30))
    target_id: Mapped[str] = mapped_column(String(36))
    payload_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default="awaiting")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint("tenant_id", "employee_id", "action", "target_id"),)


class Ticket(Base):
    __tablename__ = "hr_tickets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(20))
    run_id: Mapped[str] = mapped_column(String(36), unique=True)
    question: Mapped[str] = mapped_column(Text)
    evidence: Mapped[list] = mapped_column(JSON)
    checks: Mapped[list] = mapped_column(JSON)
    reason: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class PolicyDocument(Base):
    __tablename__ = "policy_documents"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    version: Mapped[str] = mapped_column(String(20))
    effective_date: Mapped[date] = mapped_column(Date)
    expires_on: Mapped[date | None] = mapped_column(Date)
    audience: Mapped[str] = mapped_column(String(80))
    fixture: Mapped[bool] = mapped_column(default=False)


class PolicyChunk(Base):
    __tablename__ = "policy_chunks"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(60), index=True)
    section_id: Mapped[str] = mapped_column(String(60))
    heading: Mapped[str] = mapped_column(String(150))
    text: Mapped[str] = mapped_column(Text)
    embedding_json: Mapped[list | None] = mapped_column(JSON)
    # PostgreSQL vector(384) and tsvector columns are managed by Alembic; JSON is a labeled fallback.
    claim_key: Mapped[str | None] = mapped_column(String(80))
    claim_value: Mapped[str | None] = mapped_column(String(100))


class AgentRun(Base):
    __tablename__ = "agent_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(20))
    question: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="running")
    mode: Mapped[str] = mapped_column(String(30))
    specialist: Mapped[str] = mapped_column(String(30), default="coordinator")
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    model_calls: Mapped[int] = mapped_column(Integer, default=0)
    token_usage: Mapped[dict] = mapped_column(JSON, default=dict)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(20))
    run_id: Mapped[str | None] = mapped_column(String(36), index=True)
    kind: Mapped[str] = mapped_column(String(50))
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


Index("ix_leave_scope", Leave.tenant_id, Leave.employee_id, Leave.status)


class ModelBudget(Base):
    __tablename__ = "model_budget"
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    calls: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (CheckConstraint("calls >= 0"),)
