from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/api/signup", tags=["signup"])


@router.post("", status_code=status.HTTP_201_CREATED)
def signup(body: CompanyCreate, db: Session = Depends(get_db)):
    """
    Public self-service registration endpoint.

    Creates a pending Company record.  A super-admin must later activate it
    (or you can auto-activate in development by setting subscription_status='active').
    """
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
        subscription_status="pending",
    )
    db.add(company)
    db.flush()

    if body.admin_email and body.admin_password:
        admin_user = User(
            company_id=company.id,
            name=body.admin_name or f"{body.name} Admin",
            email=body.admin_email,
            password_hash=hash_password(body.admin_password),
            role="admin",
            is_active=False,  # inactive until approved by super-admin
        )
        db.add(admin_user)

    db.commit()
    db.refresh(company)

    return {
        "message": "Registration submitted! Your account is pending review by platform administration.",
        "company_id": company.id,
        "subdomain": company.subdomain,
    }
