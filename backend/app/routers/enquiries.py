from __future__ import annotations

import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.tenant import require_company_tenant
from app.database import get_db
from app.models.enquiry import Enquiry
from app.models.job import Job
from app.models.job_milestone import JobMilestone
from app.schemas.enquiry import (
    EnquiryCreate,
    EnquiryResponse,
    EnquiryStatusUpdate,
    EnquiryUpdate,
)
from app.schemas.job import JobResponse

router = APIRouter(
    prefix="/api/enquiries",
    tags=["enquiries"],
    dependencies=[Depends(get_current_user)],
)


def _next_enquiry_no(db: Session, company_id: int) -> str:
    """Generate the next sequential enquiry number for the company."""
    count = db.query(Enquiry).filter(Enquiry.company_id == company_id).count()
    return f"ENQ-{company_id:04d}-{count + 1:05d}"


def _next_job_no(db: Session, company_id: int) -> str:
    """Generate the next sequential job number for the company."""
    count = db.query(Job).filter(Job.company_id == company_id).count()
    return f"JOB-{company_id:04d}-{count + 1:05d}"


@router.get("", response_model=list[EnquiryResponse])
def list_enquiries(
    status: Optional[str] = None,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """List all enquiries for the tenant (optionally filtered by status)."""
    query = db.query(Enquiry).filter(Enquiry.company_id == company_id)
    if status:
        query = query.filter(Enquiry.status == status)
    return query.order_by(Enquiry.created_at.desc()).all()


@router.post("", response_model=EnquiryResponse, status_code=status.HTTP_201_CREATED)
def create_enquiry(
    body: EnquiryCreate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Create a new sales enquiry."""
    enquiry = Enquiry(
        company_id=company_id,
        enquiry_no=_next_enquiry_no(db, company_id),
        **body.model_dump(),
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.get("/{enquiry_id}", response_model=EnquiryResponse)
def get_enquiry(
    enquiry_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Fetch a single enquiry by ID."""
    enquiry = (
        db.query(Enquiry)
        .filter(Enquiry.id == enquiry_id, Enquiry.company_id == company_id)
        .first()
    )
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    return enquiry


@router.patch("/{enquiry_id}", response_model=EnquiryResponse)
def update_enquiry(
    enquiry_id: int,
    body: EnquiryUpdate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Update an enquiry's fields."""
    enquiry = (
        db.query(Enquiry)
        .filter(Enquiry.id == enquiry_id, Enquiry.company_id == company_id)
        .first()
    )
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(enquiry, field, value)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.delete("/{enquiry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enquiry(
    enquiry_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Delete an enquiry (only if it has not been converted to a job)."""
    enquiry = (
        db.query(Enquiry)
        .filter(Enquiry.id == enquiry_id, Enquiry.company_id == company_id)
        .first()
    )
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    if enquiry.job:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete an enquiry that has been converted to a job",
        )
    db.delete(enquiry)
    db.commit()


@router.patch("/{enquiry_id}/status", response_model=EnquiryResponse)
def update_enquiry_status(
    enquiry_id: int,
    body: EnquiryStatusUpdate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Update the status of an enquiry (open / won / lost)."""
    enquiry = (
        db.query(Enquiry)
        .filter(Enquiry.id == enquiry_id, Enquiry.company_id == company_id)
        .first()
    )
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")

    if body.status == "lost" and not body.lost_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="lost_reason is required when marking an enquiry as lost",
        )

    enquiry.status = body.status
    if body.lost_reason:
        enquiry.lost_reason = body.lost_reason
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.post("/{enquiry_id}/convert-to-job", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def convert_to_job(
    enquiry_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """
    Convert a 'won' enquiry into a Job.

    - Sets enquiry.status = 'won'
    - Creates a Job record (copying key fields from the enquiry)
    - Creates an empty JobMilestone stub for the job
    - Idempotent: if a Job already exists for this enquiry, returns it
    """
    enquiry = (
        db.query(Enquiry)
        .filter(Enquiry.id == enquiry_id, Enquiry.company_id == company_id)
        .first()
    )
    if not enquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")

    # Idempotency: return existing job if already converted
    if enquiry.job:
        return enquiry.job

    # Mark enquiry as won
    enquiry.status = "won"

    job = Job(
        company_id=company_id,
        job_no=_next_job_no(db, company_id),
        enquiry_id=enquiry.id,
        booking_date=datetime.date.today(),
        customer_id=enquiry.customer_id,
        shipper=enquiry.shipper,
        consignee=enquiry.consignee,
        shipment_type=enquiry.mode,
        pol=enquiry.pol,
        pod=enquiry.pod,
        commodity=enquiry.commodity,
        job_status="active",
    )
    db.add(job)
    db.flush()  # get job.id before creating milestone

    milestone = JobMilestone(job_id=job.id)
    db.add(milestone)
    db.commit()
    db.refresh(job)
    return job
