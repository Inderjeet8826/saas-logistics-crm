from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, hash_password
from app.core.tenant import require_company_tenant
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[UserResponse])
def list_users(
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """List all users belonging to the tenant company."""
    return db.query(User).filter(User.company_id == company_id).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Create a new user within the tenant company."""
    existing = (
        db.query(User)
        .filter(User.company_id == company_id, User.email == body.email)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists in your company",
        )
    user = User(
        company_id=company_id,
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Fetch a single user by ID (scoped to tenant)."""
    user = (
        db.query(User)
        .filter(User.id == user_id, User.company_id == company_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserUpdate,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Update a user's profile or role."""
    user = (
        db.query(User)
        .filter(User.id == user_id, User.company_id == company_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    company_id: int = Depends(require_company_tenant),
    db: Session = Depends(get_db),
):
    """Permanently delete a user from the tenant company."""
    user = (
        db.query(User)
        .filter(User.id == user_id, User.company_id == company_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()
