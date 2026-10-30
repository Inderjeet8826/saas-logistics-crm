from __future__ import annotations

from sqlalchemy import Column, Date, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class JobMilestone(Base):
    """
    Logistics milestone dates for a job.
    One record per job (unique FK enforces 1:1).
    All date fields are nullable because they are filled in progressively.
    """

    __tablename__ = "job_milestones"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # 1:1 with Job
    )
    empty_pickup_date = Column(Date, nullable=True)
    stuffing_date = Column(Date, nullable=True)
    gate_in_date = Column(Date, nullable=True)
    customs_clearance_date = Column(Date, nullable=True)
    sb_be_no = Column(String(100), nullable=True)  # Shipping Bill / Bill of Entry number
    bl_released_date = Column(Date, nullable=True)
    sailing_date = Column(Date, nullable=True)
    arrival_date = Column(Date, nullable=True)
    delivery_date = Column(Date, nullable=True)

    # Relationships
    job = relationship("Job", back_populates="milestone")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<JobMilestone id={self.id} job_id={self.job_id}>"
