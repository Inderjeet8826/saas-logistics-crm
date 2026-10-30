from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CompanyCreate(BaseModel):
    name: str
    subdomain: str
    plan: str
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    subscription_status: Optional[str] = None


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    subdomain: str
    plan: str
    subscription_status: str
    created_at: datetime
