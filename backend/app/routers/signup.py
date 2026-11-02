from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.email import send_registration_received_email
from app.core.security import hash_password
from app.database import get_db
from app.models.company import Company
from app.models.super_admin import SuperAdmin
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/api/signup", tags=["signup"])

RESERVED_SUBDOMAINS = {
    "admin",
    "superadmin",
    "super-admin",
    "api",
    "app",
    "www",
    "localhost",
    "system",
    "mail",
    "portal",
    "root",
    "auth",
    "demo",
    "dev",
    "staging",
}


@router.post("", status_code=status.HTTP_201_CREATED)
def signup(body: CompanyCreate, db: Session = Depends(get_db)):
    """
    Public self-service registration endpoint with strict duplicate validation.

    Checks:
    1. Subdomain is not a reserved system keyword.
    2. Subdomain is not already registered (case-insensitive).
    3. Company Legal Name is not already registered (case-insensitive).
    4. Admin email is not already in use by another tenant user or super admin.
    """
    clean_subdomain = body.subdomain.strip().lower()
    clean_name = body.name.strip()

    # 1. Check reserved subdomain
    if clean_subdomain in RESERVED_SUBDOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The subdomain '{clean_subdomain}' is reserved for platform operations. Please choose a different subdomain.",
        )

    # 2. Check duplicate subdomain
    existing_subdomain = (
        db.query(Company)
        .filter(func.lower(Company.subdomain) == clean_subdomain)
        .first()
    )
    if existing_subdomain:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subdomain '{clean_subdomain}' is already taken. Please choose another one.",
        )

    # 3. Check duplicate company name
    existing_name = (
        db.query(Company)
        .filter(func.lower(Company.name) == clean_name.lower())
        .first()
    )
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A logistics company named '{clean_name}' is already registered.",
        )

    # 4. Check duplicate admin email (if provided)
    clean_email = body.admin_email.strip().lower() if body.admin_email else None
    if clean_email:
        # Check SuperAdmin
        super_admin_exists = (
            db.query(SuperAdmin)
            .filter(func.lower(SuperAdmin.email) == clean_email)
            .first()
        )
        if super_admin_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"The email address '{clean_email}' is already registered on the platform.",
            )

        # Check existing company users
        user_exists = (
            db.query(User)
            .filter(func.lower(User.email) == clean_email)
            .first()
        )
        if user_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{clean_email}' already exists. Please sign in or use another email address.",
            )

    company = Company(
        name=clean_name,
        subdomain=clean_subdomain,
        plan=body.plan,
        subscription_status="pending",
    )
    db.add(company)
    db.flush()

    if clean_email and body.admin_password:
        admin_user = User(
            company_id=company.id,
            name=body.admin_name or f"{clean_name} Admin",
            email=clean_email,
            password_hash=hash_password(body.admin_password),
            role="admin",
            is_active=False,  # inactive until approved by super-admin
        )
        db.add(admin_user)

    db.commit()
    db.refresh(company)

    # Send registration confirmation email to company admin
    if clean_email:
        send_registration_received_email(
            to_email=clean_email,
            company_name=company.name,
            subdomain=company.subdomain,
            plan=company.plan,
            admin_name=body.admin_name or f"{clean_name} Admin",
        )

    return {
        "message": "Registration submitted! Your account is pending review by platform administration.",
        "company_id": company.id,
        "subdomain": company.subdomain,
    }
