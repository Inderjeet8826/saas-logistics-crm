from __future__ import annotations

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Enquiry(Base):
    """
    Sales enquiry record.  One-to-one with Job when status == 'won'.
    """

    __tablename__ = "enquiries"
    __table_args__ = (
        UniqueConstraint("company_id", "enquiry_no", name="uq_enquiry_company_no"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    enquiry_no = Column(String(50), nullable=False)
    enquiry_date = Column(Date, nullable=False)
    customer_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    sales_person_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    shipper = Column(String(255), nullable=True)
    consignee = Column(String(255), nullable=True)
    pol = Column(String(100), nullable=False)   # Port of Loading
    pod = Column(String(100), nullable=False)   # Port of Discharge
    commodity = Column(String(255), nullable=False)
    mode = Column(String(50), nullable=True)    # FCL | LCL | Air | etc.
    container_size = Column(String(50), nullable=True)
    rate_offered = Column(Numeric(15, 2), nullable=True)
    quoted_by = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="open")  # open | won | lost
    lost_reason = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    customer = relationship("Contact", foreign_keys=[customer_id])
    sales_person = relationship("User", foreign_keys=[sales_person_id])
    job = relationship("Job", back_populates="enquiry", uselist=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Enquiry id={self.id} no={self.enquiry_no!r} status={self.status!r}>"
