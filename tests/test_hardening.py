from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from types import SimpleNamespace

import jwt
import pytest
from agentos import auth, services
from agentos.analytics import validate_sql
from agentos.config import Settings, settings
from agentos.db import transaction
from agentos.errors import DomainError
from agentos.model import development_plan
from agentos.models import AuthIdentity, Leave, now, uid
from agentos.public_demo import select_demo_persona
from agentos.seed import seed_tenant
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient


@pytest.fixture
def actor():
    return auth.resolve_identity(seed_tenant(), "E001")


def test_signed_session_expiration_and_purpose(actor):
    for token in [auth.sign(actor, minutes=-1), auth.sign(actor, "mcp"), auth.sign(actor)[:-5] + "badxx"]:
        with pytest.raises(DomainError):
            auth.verify(token)


def test_hosted_configuration_refuses_development_auth():
    with pytest.raises(ValueError):
        Settings(environment="hosted", auth_mode="development")


def test_unconfigured_live_model_cannot_start():
    with pytest.raises(ValueError):
        Settings(model_mode="live", gemini_free_tier_verified=False)


def test_personal_leave_phrasing_routes_to_balance():
    assert development_plan("How much leave do I have available?").intent == "balance"


def test_employee_without_reporting_manager_cannot_create_orphaned_leave():
    manager = auth.resolve_identity(seed_tenant(), "E010")
    with pytest.raises(DomainError) as error:
        services.prepare_leave_request(manager, "2026-11-16", "2026-11-20", "annual", uid())
    assert error.value.code == "manager_missing"


def test_leave_dates_accept_employee_formats_and_latest_followup_dates():
    short = development_plan("I need emergency leave from 16-10-26 to 21-10-26")
    assert (short.intent, short.start_date, short.end_date) == (
        "leave",
        "2026-10-16",
        "2026-10-21",
    )
    followup = development_plan(
        "Previous employee request: write a mail asking for leave. "
        "Please provide dates, for example 2026-11-16 to 2026-11-20. "
        "Employee clarification: from2026-10-16 to 2026-10-21"
    )
    assert (followup.intent, followup.start_date, followup.end_date) == (
        "leave",
        "2026-10-16",
        "2026-10-21",
    )


def test_supabase_signature_and_server_side_role_mapping(actor, monkeypatch):
    private = ec.generate_private_key(ec.SECP256R1())
    subject = uid()
    monkeypatch.setattr(
        auth,
        "jwks",
        lambda: SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=private.public_key())),
    )
    with transaction() as s:
        s.add(AuthIdentity(subject=subject, tenant_id=actor.tenant_id, employee_id=actor.employee_id))
    claims = {
        "sub": subject,
        "iss": settings().supabase_url + "/auth/v1",
        "aud": "authenticated",
        "exp": now() + timedelta(minutes=5),
        "role": "hr",
        "employee_id": "E050",
    }
    token = jwt.encode(claims, private, algorithm="ES256")
    assert auth.supabase_identity(token).role == "employee"
    for change in [
        {"aud": "wrong"},
        {"iss": "https://attacker.invalid"},
        {"exp": now() - timedelta(minutes=1)},
    ]:
        with pytest.raises(DomainError):
            auth.supabase_identity(jwt.encode({**claims, **change}, private, algorithm="ES256"))


def test_public_demo_scoped_to_verified_anonymous_subject(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "auth_mode", "supabase")
    monkeypatch.setattr(cfg, "enable_public_demo", True)
    subject = uid()
    monkeypatch.setattr(
        "agentos.public_demo.supabase_claims", lambda _: {"sub": subject, "is_anonymous": True}
    )
    employee = select_demo_persona("verified-test-token", "employee")
    manager = select_demo_persona("verified-test-token", "manager")
    assert employee.tenant_id == manager.tenant_id
    assert manager.employee_id == "E010"
    with pytest.raises(DomainError):
        select_demo_persona("verified-test-token", "E002")
    monkeypatch.setattr(
        "agentos.public_demo.supabase_claims", lambda _: {"sub": uid(), "is_anonymous": False}
    )
    with pytest.raises(DomainError):
        select_demo_persona("verified-test-token", "hr")


def test_two_anonymous_visitors_get_different_workspaces(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "auth_mode", "supabase")
    monkeypatch.setattr(cfg, "enable_public_demo", True)
    monkeypatch.setattr(
        "agentos.public_demo.supabase_claims", lambda token: {"sub": token, "is_anonymous": True}
    )
    a = select_demo_persona(uid(), "employee")
    b = select_demo_persona(uid(), "employee")
    assert a.tenant_id != b.tenant_id


def test_changed_draft_after_confirmation_is_rejected(actor):
    d = services.prepare_leave_request(actor, "2026-11-16", "2026-11-20", "annual", uid())
    services.confirm_approval(actor, d["approval_id"], True)
    with transaction() as s:
        s.get(Leave, d["draft"]["id"]).days = 3
    with pytest.raises(DomainError, match="changed"):
        services.submit_leave_request(actor, d["draft"]["id"], d["approval_id"])


def test_same_idempotency_key_cannot_change_parameters(actor):
    key = uid()
    services.prepare_leave_request(actor, "2026-11-16", "2026-11-20", "annual", key)
    with pytest.raises(DomainError, match="different draft"):
        services.prepare_leave_request(actor, "2026-11-23", "2026-11-24", "annual", key)


def test_parallel_distinct_submissions_cannot_overspend(actor):
    # Each is individually affordable at draft time, but both cannot reserve 20 days.
    drafts = [
        services.prepare_leave_request(actor, "2026-10-12", "2026-10-23", "annual", uid()),
        services.prepare_leave_request(actor, "2026-11-02", "2026-11-13", "annual", uid()),
    ]
    for d in drafts:
        services.confirm_approval(actor, d["approval_id"], True)

    def submit(d):
        try:
            return services.submit_leave_request(actor, d["draft"]["id"], d["approval_id"])["request"][
                "status"
            ]
        except DomainError as e:
            return e.code

    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(submit, drafts))
    assert sorted(results) == ["insufficient_balance", "pending"]
    assert services.get_my_leave_balance(actor)["balances"][0]["available"] == 6


def test_duplicate_manager_approval_deducts_once(actor):
    manager = auth.resolve_identity(actor.tenant_id, "E010")
    d = services.prepare_leave_request(actor, "2026-11-16", "2026-11-20", "annual", uid())
    services.confirm_approval(actor, d["approval_id"], True)
    services.submit_leave_request(actor, d["draft"]["id"], d["approval_id"])
    approval = services.authorize_review(manager, d["draft"]["id"], "approved")
    for _ in range(3):
        services.review_leave_request(manager, d["draft"]["id"], "approved", approval)
    assert services.get_my_leave_balance(actor)["balances"][0]["remaining"] == 14


def test_api_origin_and_identity_fields(actor):
    from agentos.api import app

    with TestClient(app) as client:
        client.cookies.set("agentos_session", auth.sign(actor))
        assert client.post("/chat", json={"question": "Balance", "request_id": uid()}).status_code == 403
        assert (
            client.post(
                "/chat",
                json={"question": "Balance", "request_id": uid()},
                headers={"X-AgentOS-Request": "1", "Origin": "https://attacker.invalid"},
            ).status_code
            == 403
        )
        assert (
            client.post(
                "/chat",
                json={"question": "Balance", "request_id": uid(), "employee_id": "E002"},
                headers={"X-AgentOS-Request": "1"},
            ).status_code
            == 422
        )


def test_sql_catalog_and_custom_functions_rejected():
    for sql in [
        "SELECT value FROM pg_catalog.pg_roles",
        "SELECT lo_import(1) FROM reporting.headcount",
        "SELECT value FROM public.reporting.headcount",
        "SELECT remaining FROM reporting.headcount",
    ]:
        with pytest.raises(DomainError):
            validate_sql(sql)
