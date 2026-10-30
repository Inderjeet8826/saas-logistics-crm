from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.tenant import require_company_tenant
from app.database import get_db
from app.models.job import Job
from app.models.job_milestone import JobMilestone
from app.schemas.job import JobResponse, JobUpdate, MilestoneResponse, MilestoneUpdate

router = APIRouter(
    prefix="/api/jobs",
    tags=["jobs"],
    dependencies=[Depends(get_current_user)],
)


def _get_job_or_404(job_id: int, company_id: int, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("", response_model=list[JobResponse])
def list_jobs(
    job_status: Optional[str] = None,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """List all jobs for the tenant (optionally filtered by status)."""
    query = db.query(Job).filter(Job.company_id == company_id)
    if job_status:
        query = query.filter(Job.job_status == job_status)
    return query.order_by(Job.created_at.desc()).all()


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Fetch a single job by ID."""
    return _get_job_or_404(job_id, company_id, db)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    body: JobUpdate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Update job details (shipping info, status, etc.)."""
    job = _get_job_or_404(job_id, company_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.patch("/{job_id}/milestones", response_model=MilestoneResponse)
def update_milestones(
    job_id: int,
    body: MilestoneUpdate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Update the milestone dates for a job."""
    job = _get_job_or_404(job_id, company_id, db)

    milestone = job.milestone
    if not milestone:
        # Create stub if somehow missing
        milestone = JobMilestone(job_id=job.id)
        db.add(milestone)
        db.flush()

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.get("/{job_id}/milestones", response_model=MilestoneResponse)
def get_milestones(
    job_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Retrieve the milestone record for a job."""
    job = _get_job_or_404(job_id, company_id, db)
    if not job.milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestones not found")
    return job.milestone
