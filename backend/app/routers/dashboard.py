from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.tenant import require_company_tenant
from app.database import get_db
from app.models.contact import Contact
from app.models.enquiry import Enquiry
from app.models.financial import Financial
from app.models.job import Job

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/summary")
def dashboard_summary(
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """
    Return high-level KPIs for the company dashboard:
    - Enquiry counts by status
    - Job counts by status
    - Total revenue, total cost, gross profit
    - Total receivable and payable
    - Contact counts
    """
    # Enquiry stats
    enquiry_stats = (
        db.query(Enquiry.status, func.count(Enquiry.id))
        .filter(Enquiry.company_id == company_id)
        .group_by(Enquiry.status)
        .all()
    )
    enquiry_by_status = {row[0]: row[1] for row in enquiry_stats}

    # Job stats
    job_stats = (
        db.query(Job.job_status, func.count(Job.id))
        .filter(Job.company_id == company_id)
        .group_by(Job.job_status)
        .all()
    )
    job_by_status = {row[0]: row[1] for row in job_stats}

    # Financial aggregates
    fin_agg = (
        db.query(
            func.coalesce(func.sum(Financial.sales_amount), 0).label("total_revenue"),
            func.coalesce(func.sum(Financial.purchase_amount), 0).label("total_cost"),
            func.coalesce(func.sum(Financial.customer_paid_amount), 0).label("total_received"),
            func.coalesce(func.sum(Financial.vendor_paid_amount), 0).label("total_paid"),
        )
        .filter(Financial.company_id == company_id)
        .one()
    )

    total_revenue = Decimal(str(fin_agg.total_revenue))
    total_cost = Decimal(str(fin_agg.total_cost))
    total_received = Decimal(str(fin_agg.total_received))
    total_paid = Decimal(str(fin_agg.total_paid))

    # Contact counts
    customer_count = (
        db.query(Contact)
        .filter(Contact.company_id == company_id, Contact.type == "customer")
        .count()
    )
    vendor_count = (
        db.query(Contact)
        .filter(Contact.company_id == company_id, Contact.type == "vendor")
        .count()
    )

    return {
        "enquiries": {
            "total": sum(enquiry_by_status.values()),
            "by_status": enquiry_by_status,
        },
        "jobs": {
            "total": sum(job_by_status.values()),
            "by_status": job_by_status,
        },
        "financials": {
            "total_revenue": float(total_revenue),
            "total_cost": float(total_cost),
            "gross_profit": float(total_revenue - total_cost),
            "total_receivable": float(total_revenue - total_received),
            "total_payable": float(total_cost - total_paid),
        },
        "contacts": {
            "customers": customer_count,
            "vendors": vendor_count,
        },
    }
