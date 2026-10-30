from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
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
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate
from app.schemas.super_admin import PlatformStats

router = APIRouter(
    prefix="/api/super-admin",
    tags=["super-admin"],
    dependencies=[Depends(require_super_admin_tenant), Depends(get_current_user)],
)


@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    """Return all tenant companies registered on the platform."""
    return db.query(Company).order_by(Company.created_at.desc()).all()


@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(body: CompanyCreate, db: Session = Depends(get_db)):
    """Provision a new tenant company and optionally create its initial admin user."""
    existing = db.query(Company).filter(Company.subdomain == body.subdomain).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subdomain '{body.subdomain}' is already taken",
        )
    company = Company(
        name=body.name,
        subdomain=body.subdomain,
        plan=body.plan,
        subscription_status="active",
    )
    db.add(company)
    db.flush()

    # If admin credentials are provided, create the initial company admin user
    if body.admin_email and body.admin_password:
        admin_user = User(
            company_id=company.id,
            name=body.admin_name or f"{body.name} Admin",
            email=body.admin_email,
            password_hash=hash_password(body.admin_password),
            role="admin",
            is_active=True,
        )
        db.add(admin_user)

    db.commit()
    db.refresh(company)
    return company


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
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    # Sync company users active status when company status changes
    if body.subscription_status == "active":
        db.query(User).filter(User.company_id == company.id).update({"is_active": True})
    elif body.subscription_status in ("suspended", "pending"):
        db.query(User).filter(User.company_id == company.id).update({"is_active": False})

    db.commit()
    db.refresh(company)
    return company


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
