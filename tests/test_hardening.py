from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from types import SimpleNamespace

import jwt
import pytest
from agentos import auth, services
from agentos.analytics import validate_sql
from agentos.config import Settings, settings
from agentos.db import transaction
from agentos.demo_seed import RICH_TENANT_ID, plan, reset_local_demo, seed_rich_demo, stable_id
from agentos.errors import DomainError
from agentos.model import development_plan
from agentos.models import AuthIdentity, Leave, Ticket, now, uid
from agentos.public_demo import select_demo_persona
from agentos.retrieval import search_policies
from agentos.seed import LEGACY_DEMO_TENANT_ID, seed_tenant
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient


@pytest.fixture
def actor():
    return auth.resolve_identity(seed_tenant(), "E001")


def test_cors_headers_cover_preflight_success_auth_and_server_errors(monkeypatch):
    from agentos import api as api_module

    origin = sorted(api_module.allowed_origins)[0]
    tenant = seed_tenant()
    manager = auth.resolve_identity(tenant, "E010")
    employee = auth.resolve_identity(tenant, "E001")
    cors = {"Origin": origin}

    with TestClient(api_module.app, raise_server_exceptions=False) as client:
        preflight = client.options(
            "/manager/team",
            headers={
                **cors,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization,x-agentos-request",
            },
        )
        assert preflight.status_code == 200
        assert preflight.headers["access-control-allow-origin"] == origin

        ok = client.get(
            "/manager/team",
            headers=cors,
            cookies={"agentos_session": auth.sign(manager)},
        )
        assert ok.status_code == 200
        assert ok.headers["access-control-allow-origin"] == origin

        unauthorized = client.get("/manager/team", headers=cors)
        assert unauthorized.status_code == 401
        assert unauthorized.headers["access-control-allow-origin"] == origin

        forbidden = client.get(
            "/manager/team",
            headers=cors,
            cookies={"agentos_session": auth.sign(employee)},
        )
        assert forbidden.status_code == 403
        assert forbidden.headers["access-control-allow-origin"] == origin

        monkeypatch.setattr(api_module, "engine", lambda: (_ for _ in ()).throw(RuntimeError("boom")))
        failed = client.get("/health", headers=cors)
        assert failed.status_code == 503
        assert failed.headers["access-control-allow-origin"] == origin

        rejected = client.post(
            "/auth/demo",
            headers={**cors, "Content-Type": "application/json"},
            json={"persona": "employee"},
        )
        assert rejected.status_code == 403
        assert rejected.headers["access-control-allow-origin"] == origin


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


def test_review_language_regressions_route_to_supported_workflows(actor):
    combined = development_plan(
        "Please prepare annual leave for 2026-12-14 to 2026-12-16 and check my calendar for conflicts."
    )
    assert combined.intent == "leave"
    assert combined.include_calendar is True
    assert (combined.start_date, combined.end_date) == ("2026-12-14", "2026-12-16")

    latest = development_plan(
        "Previous employee request: check my calendar for 2026-11-16 to 2026-11-20\n"
        "Employee follow-up: Please prepare annual leave from 2026-12-14 to 2026-12-16"
    )
    assert latest.intent == "leave"
    assert (latest.start_date, latest.end_date) == ("2026-12-14", "2026-12-16")

    natural = development_plan("Please book annual leave from 14 December 2026 to 16 December 2026.")
    assert (natural.intent, natural.start_date, natural.end_date) == (
        "leave",
        "2026-12-14",
        "2026-12-16",
    )

    analytics = development_plan("How many employees joined each department in July 2026? Show a chart.")
    assert (analytics.intent, analytics.report, analytics.start_date, analytics.end_date) == (
        "analytics",
        "joiners",
        "2026-07-01",
        "2026-07-31",
    )

    handoff = search_policies(
        actor,
        "Can I claim reimbursement for elective laser eye surgery? If the policy doesn't cover it, prepare an HR handoff for my confirmation.",
        fixtures=True,
    )
    assert handoff["handoff_reason"] == "explicit_handoff"
    assert (
        development_plan(
            "Can I claim reimbursement for elective laser eye surgery? If the policy doesn't cover it, prepare an HR handoff for my confirmation."
        ).intent
        == "policy"
    )

    laptop_handoff = search_policies(
        actor,
        "Send a message to HR that my laptop is not working.",
        fixtures=True,
    )
    assert laptop_handoff["handoff_reason"] == "explicit_handoff"
    assert development_plan("Send a message to HR that my laptop is not working.").intent == "policy"

    laptop_policy = search_policies(actor, "What is the onboarding laptop policy?", fixtures=True)
    assert laptop_policy["handoff_reason"] is None


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


def test_provisioned_demo_account_can_switch_persona_without_anonymous_auth(actor, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "auth_mode", "supabase")
    monkeypatch.setattr(cfg, "enable_public_demo", False)
    subject = uid()
    with transaction() as s:
        s.add(
            AuthIdentity(
                subject=subject,
                tenant_id=actor.tenant_id,
                employee_id=actor.employee_id,
            )
        )
    monkeypatch.setattr(
        "agentos.public_demo.supabase_claims",
        lambda _: {"sub": subject, "is_anonymous": False},
    )

    manager = select_demo_persona("verified-test-token", "manager")
    assert manager.tenant_id == actor.tenant_id
    assert manager.employee_id == "E010"
    assert manager.role == "manager"
    assert manager.demo is True


def test_legacy_local_synthetic_account_can_switch_persona(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "auth_mode", "supabase")
    subject = uid()
    tenant_id = seed_tenant(kind="local")
    with transaction() as s:
        s.add(AuthIdentity(subject=subject, tenant_id=tenant_id, employee_id="E001"))
    monkeypatch.setattr(
        "agentos.public_demo.supabase_claims",
        lambda _: {"sub": subject, "is_anonymous": False},
    )

    hr = select_demo_persona("verified-test-token", "hr")
    assert hr.role == "hr"
    assert hr.demo is True


def test_fixed_seeded_demo_tenant_can_switch_even_with_legacy_kind(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "auth_mode", "supabase")
    subject = uid()
    seed_tenant(LEGACY_DEMO_TENANT_ID, kind="production")
    with transaction() as s:
        s.add(
            AuthIdentity(
                subject=subject,
                tenant_id=LEGACY_DEMO_TENANT_ID,
                employee_id="E001",
            )
        )
    monkeypatch.setattr(
        "agentos.public_demo.supabase_claims",
        lambda _: {"sub": subject, "is_anonymous": False},
    )

    manager = select_demo_persona("verified-test-token", "manager")
    assert manager.role == "manager"
    assert manager.demo is True


def test_provisioned_non_demo_account_cannot_switch_persona(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "auth_mode", "supabase")
    subject = uid()
    tenant_id = seed_tenant(kind="production")
    with transaction() as s:
        s.add(AuthIdentity(subject=subject, tenant_id=tenant_id, employee_id="E001"))
    monkeypatch.setattr(
        "agentos.public_demo.supabase_claims",
        lambda _: {"sub": subject, "is_anonymous": False},
    )

    with pytest.raises(DomainError, match="synthetic demo workspace"):
        select_demo_persona("verified-test-token", "manager")


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
        services.prepare_leave_request(actor, "2099-01-05", "2099-01-16", "annual", uid()),
        services.prepare_leave_request(actor, "2099-01-19", "2099-01-30", "annual", uid()),
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


def test_supabase_unmapped_subject_raises_employee_mapping_error(monkeypatch):
    private = ec.generate_private_key(ec.SECP256R1())
    unmapped_subject = uid()
    monkeypatch.setattr(
        auth,
        "jwks",
        lambda: SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=private.public_key())),
    )
    claims = {
        "sub": unmapped_subject,
        "iss": settings().supabase_url + "/auth/v1",
        "aud": "authenticated",
        "exp": now() + timedelta(minutes=5),
    }
    token = jwt.encode(claims, private, algorithm="ES256")
    with pytest.raises(DomainError) as exc_info:
        auth.supabase_identity(token)
    assert exc_info.value.code == "unprovisioned"
    assert exc_info.value.message == "Account has no employee mapping."
    assert exc_info.value.status == 403


def test_supabase_mapped_subject_resolves_intended_employee(monkeypatch):
    from agentos.api import app

    private = ec.generate_private_key(ec.SECP256R1())
    test_subject = "f431697e-adba-45a6-a2d8-af5dcd1ded30"
    monkeypatch.setattr(
        auth,
        "jwks",
        lambda: SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=private.public_key())),
    )
    cfg = settings()
    monkeypatch.setattr(cfg, "auth_mode", "supabase")

    claims = {
        "sub": test_subject,
        "iss": settings().supabase_url + "/auth/v1",
        "aud": "authenticated",
        "exp": now() + timedelta(minutes=5),
        "role": "attacker_spoofed_admin",
        "employee_id": "E999",
    }
    token = jwt.encode(claims, private, algorithm="ES256")

    # Direct resolution check
    resolved = auth.supabase_identity(token)
    assert resolved.employee_id == "E001"
    assert resolved.role == "employee"
    assert resolved.name == "Ari Sen"
    assert resolved.tenant_id == "00000000-0000-0000-0000-000000000001"

    # API endpoint check
    with TestClient(app) as client:
        res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["employee_id"] == "E001"
        assert data["role"] == "employee"
        assert data["name"] == "Ari Sen"
        assert data["tenant_id"] == "00000000-0000-0000-0000-000000000001"


def test_unknown_supabase_user_blocked_at_api_boundary(monkeypatch):
    from agentos.api import app

    private = ec.generate_private_key(ec.SECP256R1())
    unknown_subject = uid()
    monkeypatch.setattr(
        auth,
        "jwks",
        lambda: SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=private.public_key())),
    )
    cfg = settings()
    monkeypatch.setattr(cfg, "auth_mode", "supabase")

    claims = {
        "sub": unknown_subject,
        "iss": settings().supabase_url + "/auth/v1",
        "aud": "authenticated",
        "exp": now() + timedelta(minutes=5),
    }
    token = jwt.encode(claims, private, algorithm="ES256")

    with TestClient(app) as client:
        res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403
        data = res.json()
        assert data["error"]["code"] == "unprovisioned"
        assert data["error"]["message"] == "Account has no employee mapping."


def test_employee_account_data_isolation():
    ari = auth.resolve_identity("00000000-0000-0000-0000-000000000001", "E001")
    other = auth.resolve_identity("00000000-0000-0000-0000-000000000001", "E002")

    ari_balances = services.get_my_leave_balance(ari)
    other_balances = services.get_my_leave_balance(other)

    assert len(ari_balances["balances"]) == 2
    assert len(other_balances["balances"]) == 2
    assert any(b["leave_type"] == "annual" and b["remaining"] == 1 for b in other_balances["balances"])
    assert any(b["leave_type"] == "annual" and b["remaining"] == 18 for b in ari_balances["balances"])

    # Verify other employee cannot confirm an approval belonging to Ari
    draft = services.prepare_leave_request(ari, "2026-12-14", "2026-12-15", "annual", uid())
    with pytest.raises(DomainError) as exc_info:
        services.confirm_approval(other, draft["approval_id"], True)
    assert exc_info.value.code == "not_found"


def test_rich_demo_seed_is_deterministic_idempotent_and_validated():
    assert plan()["leave_requests"] == 70
    assert stable_id("leave", 3) == stable_id("leave", 3)
    first = seed_rich_demo(RICH_TENANT_ID)
    second = seed_rich_demo(RICH_TENANT_ID)
    assert first == second
    assert first["employees"] == 50
    assert first["departments"] == 5
    assert first["managers"] == 4
    assert first["leave_requests"] == 75
    assert first["hr_tickets"] == 40
    assert first["hr_users"] == 3
    assert not first["invalid_manager_links"]
    assert not first["invalid_leave_rows"]


def test_demo_reset_refuses_without_explicit_environment_acknowledgement(monkeypatch):
    monkeypatch.delenv("DEMO_ENVIRONMENT", raising=False)
    with pytest.raises(RuntimeError, match="DEMO_ENVIRONMENT=true"):
        reset_local_demo(RICH_TENANT_ID)


def test_employee_ticket_reads_are_owner_scoped_and_hr_summary_is_derived():
    from agentos.api import app

    tenant = seed_tenant()
    employee = auth.resolve_identity(tenant, "E001")
    other = auth.resolve_identity(tenant, "E002")
    hr = auth.resolve_identity(tenant, "E050")
    with transaction() as session:
        ticket = Ticket(
            tenant_id=tenant,
            employee_id="E001",
            run_id=uid(),
            question="Synthetic ownership test",
            evidence=[],
            checks=["owner_scope"],
            reason="test_fixture",
        )
        session.add(ticket)
        session.flush()
        ticket_id = ticket.id

    with TestClient(app) as client:
        mine = client.get("/tickets/mine", cookies={"agentos_session": auth.sign(employee)})
        assert mine.status_code == 200
        assert [row["id"] for row in mine.json()] == [ticket_id]
        assert client.get(
            f"/tickets/{ticket_id}", cookies={"agentos_session": auth.sign(other)}
        ).status_code == 404
        summary = client.get("/hr/summary", cookies={"agentos_session": auth.sign(hr)})
        assert summary.status_code == 200
        assert summary.json()["employees"] == {"total": 50, "active": 47, "exited": 3}
        assert summary.json()["tickets"]["open"] == 1
        assert client.get(
            "/hr/summary", cookies={"agentos_session": auth.sign(employee)}
        ).status_code == 403

