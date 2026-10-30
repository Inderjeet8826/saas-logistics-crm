from __future__ import annotations

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class SuperAdmin(Base):
    """Platform-level administrator — not tied to any company."""

    __tablename__ = "super_admins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<SuperAdmin id={self.id} email={self.email!r}>"
