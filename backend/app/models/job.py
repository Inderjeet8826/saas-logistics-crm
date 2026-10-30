from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Job(Base):
    """
    Operational job record — auto-created when an Enquiry is marked 'won'.

    One-to-one with Enquiry (enforced by UNIQUE on enquiry_id).
    One-to-one with JobMilestone.
    One-to-many with Financial.
    """

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    job_no = Column(String(50), nullable=False, index=True)
    enquiry_id = Column(
        Integer,
        ForeignKey("enquiries.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,  # enforces 1:1 with Enquiry
    )
    booking_date = Column(Date, nullable=True)
    customer_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    shipper = Column(String(255), nullable=True)
    consignee = Column(String(255), nullable=True)
    shipment_type = Column(String(50), nullable=True)  # FCL | LCL | Air | etc.
    pol = Column(String(100), nullable=True)
    pod = Column(String(100), nullable=True)
    shipping_line = Column(String(255), nullable=True)
    vessel = Column(String(255), nullable=True)
    etd = Column(Date, nullable=True)
    eta = Column(Date, nullable=True)
    container_no = Column(String(100), nullable=True)
    commodity = Column(String(255), nullable=True)
    job_status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    enquiry = relationship("Enquiry", back_populates="job")
    customer = relationship("Contact", foreign_keys=[customer_id])
    milestone = relationship("JobMilestone", back_populates="job", uselist=False, cascade="all, delete-orphan")
    financials = relationship("Financial", back_populates="job", cascade="all, delete-orphan")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Job id={self.id} no={self.job_no!r} status={self.job_status!r}>"
