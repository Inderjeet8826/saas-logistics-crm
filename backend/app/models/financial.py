from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Financial(Base):
    """
    Financial record for a job.

    Profit, receivable, payable, and payment_status are all COMPUTED values
    and must NOT be stored as columns — they are derived in the Pydantic
    response schema (or service layer) from the stored amounts.

    Computed logic (for reference):
      gross_profit       = sales_amount - purchase_amount
      receivable         = sales_amount - customer_paid_amount
      payable            = purchase_amount - vendor_paid_amount
      payment_status:
        receivable <= 0                         → "Paid"
        customer_paid_amount > 0 (partial)      → "Partial"
        else                                    → "Pending"
    """

    __tablename__ = "financials"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)

    sales_amount = Column(Numeric(15, 2), nullable=False, default=0)
    purchase_amount = Column(Numeric(15, 2), nullable=False, default=0)

    customer_invoice_no = Column(String(100), nullable=True)
    vendor_invoice_no = Column(String(100), nullable=True)

    customer_paid_amount = Column(Numeric(15, 2), nullable=False, default=0)
    vendor_paid_amount = Column(Numeric(15, 2), nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    job = relationship("Job", back_populates="financials")
    customer = relationship("Contact", foreign_keys=[customer_id])
    vendor = relationship("Contact", foreign_keys=[vendor_id])

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Financial id={self.id} job_id={self.job_id} "
            f"sales={self.sales_amount} purchase={self.purchase_amount}>"
        )
