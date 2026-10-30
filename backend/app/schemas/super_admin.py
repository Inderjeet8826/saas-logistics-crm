from __future__ import annotations

from pydantic import BaseModel, EmailStr


class SuperAdminLogin(BaseModel):
    email: EmailStr
    password: str


class PlatformStats(BaseModel):
    total_companies: int
    active_companies: int
    total_users: int
    total_jobs: int
