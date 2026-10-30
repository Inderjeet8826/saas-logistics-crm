from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    verify_password,
)
from app.database import get_db
from app.models.super_admin import SuperAdmin
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserMe

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _build_token_pair(user_id: int, role: str, company_id: Optional[int]) -> TokenResponse:
    payload = {"user_id": user_id, "role": role, "company_id": company_id}
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a company user **or** a super-admin and return JWT tokens.

    The endpoint first looks for a matching super_admin, then falls back to
    the users table.
    """
    # Try super admin first
    super_admin = db.query(SuperAdmin).filter(SuperAdmin.email == body.email).first()
    if super_admin and verify_password(body.password, super_admin.password_hash):
        return _build_token_pair(super_admin.id, "super_admin", None)

    # Try regular user
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return _build_token_pair(user.id, user.role, user.company_id)


@router.get("/tenant-info")
def get_tenant_info(subdomain: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Return public branding info for a tenant subdomain (e.g. apex -> Apex Global Logistics).
    Used by the login page to show company-specific branding.
    """
    from app.models.company import Company

    if not subdomain or subdomain in ("localhost", "www"):
        return {"subdomain": None, "name": "Logistics CRM", "is_super_admin": False}

    if subdomain == "admin":
        return {"subdomain": "admin", "name": "Super Admin Console", "is_super_admin": True}

    company = db.query(Company).filter(Company.subdomain == subdomain.lower()).first()
    if company:
        return {
            "subdomain": company.subdomain,
            "name": company.name,
            "is_super_admin": False,
            "status": company.subscription_status,
        }

    return {"subdomain": subdomain, "name": "Logistics CRM", "is_super_admin": False}


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest):
    """Issue a new access/refresh token pair from a valid refresh token."""
    payload = decode_token(body.refresh_token)
    if payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — expected refresh token",
        )
    new_payload = {
        "user_id": payload["user_id"],
        "role": payload["role"],
        "company_id": payload.get("company_id"),
    }
    return TokenResponse(
        access_token=create_access_token(new_payload),
        refresh_token=create_refresh_token(new_payload),
    )


@router.post("/logout")
def logout():
    """
    Stateless logout — client should discard tokens.

    If you add a token blocklist (Redis), invalidate the JTI here.
    """
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserMe)
def get_me(current_user=Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    company_id = getattr(current_user, "company_id", None)
    role = "super_admin" if isinstance(current_user, SuperAdmin) else current_user.role
    return UserMe(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=role,
        company_id=company_id,
    )
