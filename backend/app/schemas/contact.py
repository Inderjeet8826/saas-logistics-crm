from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ContactCreate(BaseModel):
    type: str  # 'customer' | 'vendor'
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_no: Optional[str] = None
    credit_days: Optional[int] = None
    remarks: Optional[str] = None


class ContactUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_no: Optional[str] = None
    credit_days: Optional[int] = None
    remarks: Optional[str] = None


class ContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    type: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_no: Optional[str] = None
    credit_days: Optional[int] = None
    remarks: Optional[str] = None
    created_at: datetime
