from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
)
from app.core.tenant import require_super_admin_tenant
from app.database import get_db
from app.models.company import Company
from app.models.job import Job
from app.models.super_admin import SuperAdmin
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.schemas.company import (
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
    ResetCompanyPasswordRequest,
)
from app.schemas.super_admin import PlatformStats

router = APIRouter(
    prefix="/api/super-admin",
    tags=["super-admin"],
    dependencies=[Depends(require_super_admin_tenant), Depends(get_current_user)],
)


@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    """Return all tenant companies registered on the platform with their admin email."""
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    company_ids = [c.id for c in companies]
    
    # Map admin users to companies
    admin_users = (
        db.query(User)
        .filter(User.company_id.in_(company_ids), User.role == "admin")
        .all()
    ) if company_ids else []
    admin_map = {u.company_id: u for u in admin_users}
    
    # Fallback to any user if company doesn't have an admin role user
    missing_ids = [c.id for c in companies if c.id not in admin_map]
    if missing_ids:
        other_users = db.query(User).filter(User.company_id.in_(missing_ids)).all()
        for u in other_users:
            if u.company_id not in admin_map:
                admin_map[u.company_id] = u

    results = []
    for c in companies:
        admin = admin_map.get(c.id)
        results.append(
            CompanyResponse(
                id=c.id,
                name=c.name,
                subdomain=c.subdomain,
                plan=c.plan,
                subscription_status=c.subscription_status,
                created_at=c.created_at,
                admin_email=admin.email if admin else None,
                admin_name=admin.name if admin else None,
            )
        )
    return results


@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(body: CompanyCreate, db: Session = Depends(get_db)):
    """Provision a new tenant company and optionally create its initial admin user."""
    clean_subdomain = body.subdomain.strip().lower()
    clean_name = body.name.strip()

    from app.routers.signup import RESERVED_SUBDOMAINS
    if clean_subdomain in RESERVED_SUBDOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The subdomain '{clean_subdomain}' is reserved and cannot be registered.",
        )

    existing = db.query(Company).filter(func.lower(Company.subdomain) == clean_subdomain).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subdomain '{clean_subdomain}' is already taken",
        )

    existing_name = db.query(Company).filter(func.lower(Company.name) == clean_name.lower()).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A company with the name '{clean_name}' already exists",
        )

    clean_email = body.admin_email.strip().lower() if body.admin_email else None
    if clean_email:
        if db.query(SuperAdmin).filter(func.lower(SuperAdmin.email) == clean_email).first() or \
           db.query(User).filter(func.lower(User.email) == clean_email).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{clean_email}' already exists",
            )

    company = Company(
        name=clean_name,
        subdomain=clean_subdomain,
        plan=body.plan,
        subscription_status="active",
    )
    db.add(company)
    db.flush()

    # If admin credentials are provided, create the initial company admin user
    if clean_email and body.admin_password:
        admin_user = User(
            company_id=company.id,
            name=body.admin_name or f"{clean_name} Admin",
            email=clean_email,
            password_hash=hash_password(body.admin_password),
            role="admin",
            is_active=True,
        )
        db.add(admin_user)

    db.commit()
    db.refresh(company)
    admin_user = (
        db.query(User)
        .filter(User.company_id == company.id, User.role == "admin")
        .first()
        or db.query(User).filter(User.company_id == company.id).first()
    )
    return CompanyResponse(
        id=company.id,
        name=company.name,
        subdomain=company.subdomain,
        plan=company.plan,
        subscription_status=company.subscription_status,
        created_at=company.created_at,
        admin_email=admin_user.email if admin_user else None,
        admin_name=admin_user.name if admin_user else None,
    )


@router.post("/impersonate/{company_id}", response_model=TokenResponse)
def impersonate_company(company_id: int, db: Session = Depends(get_db)):
    """
    Allow platform super-admin to view/manage a tenant company's CRM dashboard directly.
    Issues a scoped token for the target company.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    # Find the company admin or any user
    user = db.query(User).filter(User.company_id == company.id).first()
    user_id = user.id if user else 0

    payload = {"user_id": user_id, "role": "admin", "company_id": company.id}
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
    )


@router.patch("/companies/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, body: CompanyUpdate, db: Session = Depends(get_db)):
    """Update a tenant company's plan or status."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    prev_status = company.subscription_status
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    # Sync company users active status when company status changes
    if body.subscription_status == "active":
        db.query(User).filter(User.company_id == company.id).update({"is_active": True})
        # If transitioning to active, send activation notification email
        if prev_status != "active":
            admin_user = (
                db.query(User)
                .filter(User.company_id == company.id, User.role == "admin")
                .first()
            )
            if admin_user and admin_user.email:
                from app.config import settings
                from app.core.email import send_subscription_activated_email

                send_subscription_activated_email(
                    to_email=admin_user.email,
                    company_name=company.name,
                    subdomain=company.subdomain,
                    plan=company.plan,
                    base_domain=settings.BASE_DOMAIN,
                )
    elif body.subscription_status in ("suspended", "pending"):
        db.query(User).filter(User.company_id == company.id).update({"is_active": False})

    db.commit()
    db.refresh(company)
    admin_user = (
        db.query(User)
        .filter(User.company_id == company.id, User.role == "admin")
        .first()
        or db.query(User).filter(User.company_id == company.id).first()
    )
    return CompanyResponse(
        id=company.id,
        name=company.name,
        subdomain=company.subdomain,
        plan=company.plan,
        subscription_status=company.subscription_status,
        created_at=company.created_at,
        admin_email=admin_user.email if admin_user else None,
        admin_name=admin_user.name if admin_user else None,
    )


@router.post("/companies/{company_id}/reset-password")
def reset_company_password(
    company_id: int,
    body: ResetCompanyPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Allow super-admin to reset or set a new password for a tenant company's admin account.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    admin_user = (
        db.query(User)
        .filter(User.company_id == company.id, User.role == "admin")
        .first()
        or db.query(User).filter(User.company_id == company.id).first()
    )
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No admin user found for this company to reset password.",
        )

    clean_pwd = body.new_password.strip()
    if len(clean_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters.",
        )

    admin_user.password_hash = hash_password(clean_pwd)
    db.commit()
    return {
        "message": f"Password reset successfully for {admin_user.email}",
        "admin_email": admin_user.email,
        "admin_name": admin_user.name,
    }


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int, db: Session = Depends(get_db)):
    """Permanently delete a tenant company and all its data."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    db.delete(company)
    db.commit()


@router.get("/stats", response_model=PlatformStats)
def platform_stats(db: Session = Depends(get_db)):
    """Return high-level platform metrics for the super-admin dashboard."""
    total_companies = db.query(Company).count()
    active_companies = db.query(Company).filter(Company.subscription_status == "active").count()
    total_users = db.query(User).count()
    total_jobs = db.query(Job).count()
    return PlatformStats(
        total_companies=total_companies,
        active_companies=active_companies,
        total_users=total_users,
        total_jobs=total_jobs,
    )
