from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, computed_field


class FinancialCreate(BaseModel):
    job_id: int
    customer_id: Optional[int] = None
    vendor_id: Optional[int] = None
    sales_amount: Decimal = Decimal("0")
    purchase_amount: Decimal = Decimal("0")
    customer_invoice_no: Optional[str] = None
    vendor_invoice_no: Optional[str] = None
    customer_paid_amount: Decimal = Decimal("0")
    vendor_paid_amount: Decimal = Decimal("0")


class FinancialUpdate(BaseModel):
    customer_id: Optional[int] = None
    vendor_id: Optional[int] = None
    sales_amount: Optional[Decimal] = None
    purchase_amount: Optional[Decimal] = None
    customer_invoice_no: Optional[str] = None
    vendor_invoice_no: Optional[str] = None
    customer_paid_amount: Optional[Decimal] = None
    vendor_paid_amount: Optional[Decimal] = None


class FinancialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    job_id: int
    customer_id: Optional[int] = None
    vendor_id: Optional[int] = None
    sales_amount: Decimal
    purchase_amount: Decimal
    customer_invoice_no: Optional[str] = None
    vendor_invoice_no: Optional[str] = None
    customer_paid_amount: Decimal
    vendor_paid_amount: Decimal
    created_at: datetime

    # -----------------------------------------------------------------------
    # Computed fields — derived at serialisation time, never stored in the DB
    # -----------------------------------------------------------------------

    @computed_field  # type: ignore[misc]
    @property
    def gross_profit(self) -> Decimal:
        """sales_amount - purchase_amount"""
        return self.sales_amount - self.purchase_amount

    @computed_field  # type: ignore[misc]
    @property
    def receivable(self) -> Decimal:
        """Amount still owed by the customer."""
        return self.sales_amount - self.customer_paid_amount

    @computed_field  # type: ignore[misc]
    @property
    def payable(self) -> Decimal:
        """Amount still owed to the vendor."""
        return self.purchase_amount - self.vendor_paid_amount

    @computed_field  # type: ignore[misc]
    @property
    def payment_status(self) -> str:
        """
        Paid    → receivable <= 0
        Partial → customer has paid something but not all
        Pending → no customer payment received yet
        """
        if self.receivable <= Decimal("0"):
            return "Paid"
        if self.customer_paid_amount > Decimal("0"):
            return "Partial"
        return "Pending"
