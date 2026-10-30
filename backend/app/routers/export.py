from __future__ import annotations

from io import BytesIO
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.tenant import require_company_tenant
from app.database import get_db
from app.models.contact import Contact
from app.models.enquiry import Enquiry
from app.models.financial import Financial
from app.models.job import Job

router = APIRouter(
    prefix="/api/export",
    tags=["export"],
    dependencies=[Depends(get_current_user)],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

EXPORTABLE_MODULES = Literal["enquiries", "jobs", "contacts", "financials"]


def _enquiries_to_rows(db: Session, company_id: int):
    rows = db.query(Enquiry).filter(Enquiry.company_id == company_id).all()
    headers = [
        "ID", "Enquiry No", "Date", "Customer ID", "POL", "POD",
        "Commodity", "Mode", "Rate Offered", "Status", "Created At",
    ]
    data = [
        [
            r.id, r.enquiry_no, r.enquiry_date, r.customer_id,
            r.pol, r.pod, r.commodity, r.mode, r.rate_offered,
            r.status, r.created_at,
        ]
        for r in rows
    ]
    return headers, data


def _jobs_to_rows(db: Session, company_id: int):
    rows = db.query(Job).filter(Job.company_id == company_id).all()
    headers = [
        "ID", "Job No", "Booking Date", "Customer ID", "POL", "POD",
        "Shipping Line", "Vessel", "ETD", "ETA", "Status", "Created At",
    ]
    data = [
        [
            r.id, r.job_no, r.booking_date, r.customer_id,
            r.pol, r.pod, r.shipping_line, r.vessel,
            r.etd, r.eta, r.job_status, r.created_at,
        ]
        for r in rows
    ]
    return headers, data


def _contacts_to_rows(db: Session, company_id: int):
    rows = db.query(Contact).filter(Contact.company_id == company_id).all()
    headers = ["ID", "Type", "Name", "Contact Person", "Phone", "Email", "GST No", "Credit Days"]
    data = [
        [r.id, r.type, r.name, r.contact_person, r.phone, r.email, r.gst_no, r.credit_days]
        for r in rows
    ]
    return headers, data


def _financials_to_rows(db: Session, company_id: int):
    rows = db.query(Financial).filter(Financial.company_id == company_id).all()
    headers = [
        "ID", "Job ID", "Sales Amount", "Purchase Amount",
        "Customer Paid", "Vendor Paid", "Gross Profit", "Receivable", "Payable",
    ]
    data = [
        [
            r.id, r.job_id, r.sales_amount, r.purchase_amount,
            r.customer_paid_amount, r.vendor_paid_amount,
            r.sales_amount - r.purchase_amount,
            r.sales_amount - r.customer_paid_amount,
            r.purchase_amount - r.vendor_paid_amount,
        ]
        for r in rows
    ]
    return headers, data


EXTRACTORS = {
    "enquiries": _enquiries_to_rows,
    "jobs": _jobs_to_rows,
    "contacts": _contacts_to_rows,
    "financials": _financials_to_rows,
}


@router.get("/{module}")
def export_module(
    module: str,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """
    Export a module's data as an Excel (.xlsx) file.

    Supported modules: ``enquiries`` | ``jobs`` | ``contacts`` | ``financials``
    """
    try:
        import openpyxl
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="openpyxl is not installed",
        )

    extractor = EXTRACTORS.get(module)
    if not extractor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown module '{module}'. Choose from: {list(EXTRACTORS)}",
        )

    headers, data = extractor(db, company_id)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = module.capitalize()
    ws.append(headers)
    for row in data:
        ws.append([str(cell) if cell is not None else "" for cell in row])

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"{module}_export.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
