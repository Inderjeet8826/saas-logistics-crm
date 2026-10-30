from __future__ import annotations

import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.tenant import require_company_tenant
from app.database import get_db
from app.models.contact import Contact
from app.models.financial import Financial
from app.models.job import Job
from app.schemas.financial import FinancialCreate, FinancialResponse, FinancialUpdate

router = APIRouter(
    prefix="/api/financials",
    tags=["financials"],
    dependencies=[Depends(get_current_user)],
)


def _get_financial_or_404(financial_id: int, company_id: int, db: Session) -> Financial:
    rec = (
        db.query(Financial)
        .filter(Financial.id == financial_id, Financial.company_id == company_id)
        .first()
    )
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial record not found")
    return rec


@router.get("", response_model=list[FinancialResponse])
def list_financials(
    job_id: Optional[int] = None,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """List all financial records (optionally scoped to a specific job)."""
    query = db.query(Financial).filter(Financial.company_id == company_id)
    if job_id:
        query = query.filter(Financial.job_id == job_id)
    return query.order_by(Financial.created_at.desc()).all()


@router.post("", response_model=FinancialResponse, status_code=status.HTTP_201_CREATED)
def create_financial(
    body: FinancialCreate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Create a financial entry for a job."""
    # Validate job belongs to this company
    job = db.query(Job).filter(Job.id == body.job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    rec = Financial(company_id=company_id, **body.model_dump())
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/aging-alert", response_model=list[FinancialResponse])
def aging_alert(
    days: int = 30,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """
    Return financial records where the customer has NOT fully paid AND
    the record is older than *days* days (default 30).

    Useful for accounts-receivable aging reports.
    """
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    results = (
        db.query(Financial)
        .filter(
            Financial.company_id == company_id,
            Financial.created_at <= cutoff,
            Financial.customer_paid_amount < Financial.sales_amount,
        )
        .order_by(Financial.created_at.asc())
        .all()
    )
    return results


@router.get("/{financial_id}", response_model=FinancialResponse)
def get_financial(
    financial_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Fetch a single financial record."""
    return _get_financial_or_404(financial_id, company_id, db)


@router.patch("/{financial_id}", response_model=FinancialResponse)
def update_financial(
    financial_id: int,
    body: FinancialUpdate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Update a financial record (e.g., record a payment)."""
    rec = _get_financial_or_404(financial_id, company_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/{financial_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_financial(
    financial_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Delete a financial record."""
    rec = _get_financial_or_404(financial_id, company_id, db)
    db.delete(rec)
    db.commit()
