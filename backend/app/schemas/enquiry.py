from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class EnquiryCreate(BaseModel):
    enquiry_date: date
    customer_id: Optional[int] = None
    sales_person_id: Optional[int] = None
    shipper: Optional[str] = None
    consignee: Optional[str] = None
    pol: str
    pod: str
    commodity: str
    mode: Optional[str] = None
    container_size: Optional[str] = None
    rate_offered: Optional[Decimal] = None
    quoted_by: Optional[str] = None
    follow_up_date: Optional[date] = None
    remarks: Optional[str] = None


class EnquiryUpdate(BaseModel):
    enquiry_date: Optional[date] = None
    customer_id: Optional[int] = None
    sales_person_id: Optional[int] = None
    shipper: Optional[str] = None
    consignee: Optional[str] = None
    pol: Optional[str] = None
    pod: Optional[str] = None
    commodity: Optional[str] = None
    mode: Optional[str] = None
    container_size: Optional[str] = None
    rate_offered: Optional[Decimal] = None
    quoted_by: Optional[str] = None
    status: Optional[str] = None
    lost_reason: Optional[str] = None
    follow_up_date: Optional[date] = None
    remarks: Optional[str] = None


class EnquiryStatusUpdate(BaseModel):
    status: Literal["open", "won", "lost"]
    lost_reason: Optional[str] = None


class EnquiryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    enquiry_no: str
    enquiry_date: date
    customer_id: Optional[int] = None
    sales_person_id: Optional[int] = None
    shipper: Optional[str] = None
    consignee: Optional[str] = None
    pol: str
    pod: str
    commodity: str
    mode: Optional[str] = None
    container_size: Optional[str] = None
    rate_offered: Optional[Decimal] = None
    quoted_by: Optional[str] = None
    status: str
    lost_reason: Optional[str] = None
    follow_up_date: Optional[date] = None
    remarks: Optional[str] = None
    created_at: datetime
