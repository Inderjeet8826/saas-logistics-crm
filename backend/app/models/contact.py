from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Contact(Base):
    """
    A customer or vendor contact scoped to a company.

    ``type`` must be one of: ``'customer'`` | ``'vendor'``
    """

    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # 'customer' | 'vendor'
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    gst_no = Column(String(50), nullable=True)
    credit_days = Column(Integer, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Contact id={self.id} name={self.name!r} type={self.type!r}>"
