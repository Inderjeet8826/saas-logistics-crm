from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    auth,
    contacts,
    dashboard,
    enquiries,
    export,
    financials,
    jobs,
    signup,
    super_admin,
    users,
)

app = FastAPI(
    title="Logistics CRM API",
    version="1.0.0",
    description="Multi-tenant SaaS Logistics CRM — FastAPI backend",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
origin_list = ["http://localhost:3000"]
if settings.FRONTEND_ORIGIN and settings.FRONTEND_ORIGIN not in origin_list:
    origin_list.append(settings.FRONTEND_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origin_list,
    allow_origin_regex=r"^https?://.*(localhost(:\d+)?|\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(super_admin.router)
app.include_router(signup.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(enquiries.router)
app.include_router(jobs.router)
app.include_router(financials.router)
app.include_router(dashboard.router)
app.include_router(export.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health():
    """Liveness probe — returns 200 when the application is running."""
    return {"status": "ok", "version": "1.0.0"}
