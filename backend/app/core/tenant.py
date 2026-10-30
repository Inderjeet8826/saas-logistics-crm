from __future__ import annotations

"""
Tenant resolution middleware / dependency.

Reads the subdomain from the request's Host header and resolves it to a
company.  Every tenant-scoped route MUST use ``get_tenant`` (or one of the
stricter helpers) as a dependency so that company_id isolation is enforced.
"""

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db


@dataclass
class TenantContext:
    """Carries resolved tenant information for the current request."""

    company_id: Optional[int]
    is_super_admin: bool


def _extract_subdomain(host: str) -> str:
    """
    Strip the port (if any) from *host* then return the leftmost label.

    Examples
    --------
    ``acme.yourapp.com``   → ``"acme"``
    ``admin.yourapp.com``  → ``"admin"``
    ``localhost:8000``     → ``"localhost"``
    """
    # Drop port
    host = host.split(":")[0]

    base = settings.BASE_DOMAIN  # e.g. "yourapp.com"
    if host.endswith(f".{base}"):
        subdomain = host[: -(len(base) + 1)]  # everything before ".yourapp.com"
    else:
        # Fallback for local development (e.g., "localhost")
        subdomain = host.split(".")[0]

    return subdomain.lower()


def get_tenant(
    request: Request,
    db: Session = Depends(get_db),
) -> TenantContext:
    """
    FastAPI dependency — resolves the tenant context.

    Resolution order:
    1. Check Authorization Bearer token (PROJECT_CONTEXT rule: resolved company_id
       or super_admin flag is in JWT, so no re-derivation needed on authenticated requests).
    2. Check X-Tenant-Subdomain header (useful for development & testing).
    3. Read subdomain from Host header (e.g. admin.yourapp.com or acme.yourapp.com).
    """
    from app.models.company import Company
    from app.core.security import decode_token

    # 1. Prefer authenticated JWT payload if present
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        try:
            payload = decode_token(token)
            if payload.get("role") == "super_admin":
                return TenantContext(company_id=None, is_super_admin=True)
            company_id = payload.get("company_id")
            if company_id is not None:
                return TenantContext(company_id=company_id, is_super_admin=False)
        except Exception:
            # Token invalid/expired; let authentication dependency handle it
            pass

    # 2. Check explicit header or host subdomain
    header_subdomain = request.headers.get("x-tenant-subdomain")
    if header_subdomain:
        subdomain = header_subdomain.strip().lower()
    else:
        host = request.headers.get("host", "")
        if not host:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Host header",
            )
        subdomain = _extract_subdomain(host)

    if subdomain in ("admin", "localhost"):
        # Default local development or admin subdomain to super-admin context
        return TenantContext(company_id=None, is_super_admin=True)

    company = db.query(Company).filter(Company.subdomain == subdomain).first()
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with subdomain '{subdomain}' not found",
        )

    return TenantContext(company_id=company.id, is_super_admin=False)


def require_company_tenant(
    tenant: TenantContext = Depends(get_tenant),
) -> int:
    """
    Dependency that asserts the request is scoped to a real company.

    Returns ``company_id``.  Raises HTTP 403 if a super-admin token was used
    on a company-scoped route.
    """
    if tenant.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super-admin cannot access company-scoped endpoints directly",
        )
    return tenant.company_id  # type: ignore[return-value]


def require_super_admin_tenant(
    tenant: TenantContext = Depends(get_tenant),
) -> None:
    """
    Dependency that asserts the request is coming from the admin subdomain.

    Raises HTTP 403 if the caller is a regular company user.
    """
    if not tenant.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is restricted to platform administrators",
        )
