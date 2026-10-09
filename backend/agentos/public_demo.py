"""Visitor-isolated hosted demos backed by Supabase anonymous identities.
This never accepts an arbitrary tenant or employee ID from the browser.
"""

from sqlalchemy import text

from .auth import resolve_identity, supabase_claims
from .config import settings
from .db import transaction
from .errors import DomainError
from .models import AuthIdentity, Tenant
from .seed import DEMO_IDS, seed_tenant


def select_demo_persona(token, persona):
    if not settings().enable_public_demo or settings().auth_mode != "supabase":
        raise DomainError("disabled", "Hosted anonymous demo is not configured.", 403)
    claims = supabase_claims(token)
    if claims.get("is_anonymous") is not True:
        raise DomainError(
            "forbidden", "Persona selection is restricted to isolated anonymous demo sessions.", 403
        )
    if persona not in DEMO_IDS:
        raise DomainError("persona", "Unknown demo identity.")
    with transaction() as s:
        # Transaction advisory lock prevents concurrent initialization creating
        # two mappings for one verified Supabase anonymous subject.
        s.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:subject,0))"), {"subject": claims["sub"]}
        )
        mapping = s.get(AuthIdentity, claims["sub"])
        if mapping:
            tenant = s.get(Tenant, mapping.tenant_id)
            if tenant.kind != "hosted_demo":
                raise DomainError("forbidden", "This identity is not an isolated demo.", 403)
            mapping.employee_id = DEMO_IDS[persona]
            tenant_id = mapping.tenant_id
        else:
            tenant_id = seed_tenant(kind="hosted_demo")
            s.add(AuthIdentity(subject=claims["sub"], tenant_id=tenant_id, employee_id=DEMO_IDS[persona]))
    return resolve_identity(tenant_id, DEMO_IDS[persona])
