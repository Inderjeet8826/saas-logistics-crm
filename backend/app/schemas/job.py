from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class JobUpdate(BaseModel):
    booking_date: Optional[date] = None
    shipping_line: Optional[str] = None
    vessel: Optional[str] = None
    etd: Optional[date] = None
    eta: Optional[date] = None
    container_no: Optional[str] = None
    job_status: Optional[str] = None
    shipment_type: Optional[str] = None
    pol: Optional[str] = None
    pod: Optional[str] = None
    shipper: Optional[str] = None
    consignee: Optional[str] = None
    commodity: Optional[str] = None
    customer_id: Optional[int] = None


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    job_no: str
    enquiry_id: int
    booking_date: Optional[date] = None
    customer_id: Optional[int] = None
    shipper: Optional[str] = None
    consignee: Optional[str] = None
    shipment_type: Optional[str] = None
    pol: Optional[str] = None
    pod: Optional[str] = None
    shipping_line: Optional[str] = None
    vessel: Optional[str] = None
    etd: Optional[date] = None
    eta: Optional[date] = None
    container_no: Optional[str] = None
    commodity: Optional[str] = None
    job_status: str
    created_at: datetime


class MilestoneUpdate(BaseModel):
    empty_pickup_date: Optional[date] = None
    stuffing_date: Optional[date] = None
    gate_in_date: Optional[date] = None
    customs_clearance_date: Optional[date] = None
    sb_be_no: Optional[str] = None
    bl_released_date: Optional[date] = None
    sailing_date: Optional[date] = None
    arrival_date: Optional[date] = None
    delivery_date: Optional[date] = None


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    empty_pickup_date: Optional[date] = None
    stuffing_date: Optional[date] = None
    gate_in_date: Optional[date] = None
    customs_clearance_date: Optional[date] = None
    sb_be_no: Optional[str] = None
    bl_released_date: Optional[date] = None
    sailing_date: Optional[date] = None
    arrival_date: Optional[date] = None
    delivery_date: Optional[date] = None
