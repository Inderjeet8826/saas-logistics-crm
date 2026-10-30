from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.tenant import require_company_tenant
from app.database import get_db
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate

router = APIRouter(
    prefix="/api/contacts",
    tags=["contacts"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    type: Optional[str] = None,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """List all contacts (optionally filtered by type: customer | vendor)."""
    query = db.query(Contact).filter(Contact.company_id == company_id)
    if type:
        query = query.filter(Contact.type == type)
    return query.order_by(Contact.name).all()


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    body: ContactCreate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Create a new contact (customer or vendor)."""
    contact = Contact(company_id=company_id, **body.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Fetch a single contact by ID."""
    contact = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.company_id == company_id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int,
    body: ContactUpdate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Update a contact."""
    contact = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.company_id == company_id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Delete a contact."""
    contact = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.company_id == company_id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    db.delete(contact)
    db.commit()
