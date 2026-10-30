from __future__ import annotations

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Company(Base):
    """A tenant company on the platform."""

    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    subdomain = Column(String(100), unique=True, nullable=False, index=True)
    plan = Column(String(50), nullable=False, default="starter")
    subscription_status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Company id={self.id} subdomain={self.subdomain!r}>"
