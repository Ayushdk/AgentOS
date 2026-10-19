"""Visitor-isolated hosted demos backed by Supabase anonymous identities.
This never accepts an arbitrary tenant or employee ID from the browser.
"""

from sqlalchemy import text

from .auth import resolve_identity, supabase_claims
from .config import settings
from .db import transaction
from .errors import DomainError
from .models import AuthIdentity, Tenant
from .seed import DEMO_IDS, LEGACY_DEMO_TENANT_ID, seed_tenant


def select_demo_persona(token, persona):
    if settings().auth_mode != "supabase":
        raise DomainError("disabled", "Hosted demo identity switching is not configured.", 403)
    claims = supabase_claims(token)
    if persona not in DEMO_IDS:
        raise DomainError("persona", "Unknown demo identity.")
    with transaction() as s:
        # Transaction advisory lock prevents concurrent initialization creating
        # two mappings for one verified Supabase anonymous subject.
        s.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:subject,0))"), {"subject": claims["sub"]}
        )
        mapping = s.get(AuthIdentity, claims["sub"])
        if claims.get("is_anonymous") is True:
            if not settings().enable_public_demo:
                raise DomainError("disabled", "Hosted anonymous demo is not configured.", 403)
            if mapping:
                tenant = s.get(Tenant, mapping.tenant_id)
                if not tenant or tenant.kind != "hosted_demo":
                    raise DomainError("forbidden", "This identity is not an isolated demo.", 403)
                mapping.employee_id = DEMO_IDS[persona]
                tenant_id = mapping.tenant_id
            else:
                tenant_id = seed_tenant(kind="hosted_demo")
                s.add(
                    AuthIdentity(
                        subject=claims["sub"],
                        tenant_id=tenant_id,
                        employee_id=DEMO_IDS[persona],
                    )
                )
        elif mapping:
            tenant = s.get(Tenant, mapping.tenant_id)
            if not tenant or (
                tenant.id != LEGACY_DEMO_TENANT_ID and tenant.kind not in {"demo", "local"}
            ):
                raise DomainError(
                    "forbidden",
                    "Identity switching is available only in the synthetic demo workspace.",
                    403,
                )
            mapping.employee_id = DEMO_IDS[persona]
            tenant_id = mapping.tenant_id
        else:
            raise DomainError("unprovisioned", "Account has no demo workspace mapping.", 403)
    return resolve_identity(tenant_id, DEMO_IDS[persona])
