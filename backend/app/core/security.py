from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------

def _build_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    payload.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(data: dict) -> str:
    """Create a short-lived JWT access token."""
    return _build_token(
        {**data, "token_type": "access"},
        timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(data: dict) -> str:
    """Create a longer-lived JWT refresh token."""
    return _build_token(
        {**data, "token_type": "refresh"},
        timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )


# ---------------------------------------------------------------------------
# Token decoding
# ---------------------------------------------------------------------------

def decode_token(token: str) -> dict:
    """Decode and validate a JWT.  Raises HTTP 401 on any failure."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise credentials_exception


# ---------------------------------------------------------------------------
# FastAPI dependency — current user
# ---------------------------------------------------------------------------

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
):
    """
    Decode the bearer token and return the authenticated User ORM object.

    Supports both regular User and SuperAdmin tokens:
      - payload["role"] == "super_admin"  → fetch from super_admins table
      - otherwise                          → fetch from users table
    """
    # Import here to avoid circular imports at module load time
    from app.models.user import User
    from app.models.super_admin import SuperAdmin

    payload = decode_token(token)

    if payload.get("token_type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[int] = payload.get("user_id")
    role: Optional[str] = payload.get("role")

    if user_id is None or role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload incomplete",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if role == "super_admin":
        user = db.query(SuperAdmin).filter(SuperAdmin.id == user_id).first()
    else:
        user = db.query(User).filter(User.id == user_id).first()
        if user and not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user account",
            )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
