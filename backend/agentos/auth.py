import hashlib
from datetime import timedelta
from functools import lru_cache

import jwt
from jwt import PyJWKClient
from pydantic import BaseModel, ConfigDict

from .config import settings
from .db import transaction
from .errors import DomainError
from .models import AuthIdentity, Employee, Tenant, now
from .seed import LEGACY_DEMO_TENANT_ID


class Identity(BaseModel):
    model_config = ConfigDict(frozen=True)
    tenant_id: str
    employee_id: str
    role: str
    name: str = ""
    demo: bool = False


def resolve_identity(tenant: str, employee: str) -> Identity:
    with transaction() as s:
        row = s.get(Employee, (tenant, employee))
        if not row or (row.exited_on and row.exited_on <= now().date()):
            raise DomainError("unauthorized", "This session is not active.", 401)
        return Identity(
            tenant_id=tenant,
            employee_id=employee,
            role=row.role,
            name=row.name,
            demo=tenant == LEGACY_DEMO_TENANT_ID
            or s.get(Tenant, tenant).kind in {"demo", "hosted_demo", "local"},
        )


def key(purpose: str):
    return hashlib.sha256((settings().session_secret + ":" + purpose).encode()).digest()


def sign(identity: Identity, purpose="session", minutes=480):
    return jwt.encode(
        {
            "sub": identity.employee_id,
            "tenant": identity.tenant_id,
            "aud": purpose,
            "exp": now() + timedelta(minutes=minutes),
            "iat": now(),
        },
        key(purpose),
        algorithm="HS256",
    )


def verify(token: str, purpose="session") -> Identity:
    try:
        p = jwt.decode(
            token,
            key(purpose),
            algorithms=["HS256"],
            audience=purpose,
            options={"require": ["exp", "iat", "sub", "tenant", "aud"]},
        )
    except jwt.PyJWTError:
        raise DomainError("unauthorized", "Invalid or expired session.", 401) from None
    return resolve_identity(p["tenant"], p["sub"])


@lru_cache
def jwks():
    return PyJWKClient(settings().supabase_url + "/auth/v1/.well-known/jwks.json", cache_jwk_set=True)


def supabase_claims(token: str):
    try:
        signing_key = jwks().get_signing_key_from_jwt(token)
        p = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience=settings().supabase_jwt_audience,
            issuer=settings().supabase_url + "/auth/v1",
            options={"require": ["sub", "exp", "aud", "iss"]},
        )
    except Exception:
        raise DomainError("unauthorized", "Supabase authentication failed.", 401) from None
    return p


def supabase_identity(token: str):
    p = supabase_claims(token)
    with transaction() as s:
        mapping = s.get(AuthIdentity, p["sub"])
        if not mapping:
            raise DomainError("unprovisioned", "Account has no employee mapping.", 403)
        return resolve_identity(mapping.tenant_id, mapping.employee_id)


def require_role(identity, *roles):
    if identity.role not in roles:
        raise DomainError("forbidden", "This action is not available to your role.", 403)
