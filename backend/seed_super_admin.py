"""
Run this ONCE to create the first Super Admin user.
Usage:
    python seed_super_admin.py
"""
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.super_admin import SuperAdmin
from app.core.security import hash_password

# ── Change these before running ──────────────────────────────
NAME     = "Super Admin"
EMAIL    = "admin@logistics.com"
PASSWORD = "Admin@1234"
# ─────────────────────────────────────────────────────────────

def seed():
    db = SessionLocal()
    try:
        existing = db.query(SuperAdmin).filter(SuperAdmin.email == EMAIL).first()
        if existing:
            print(f"⚠️  Super Admin already exists: {EMAIL}")
            return

        admin = SuperAdmin(
            name=NAME,
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
        )
        db.add(admin)
        db.commit()
        print("✅ Super Admin created successfully!")
        print(f"   Email   : {EMAIL}")
        print(f"   Password: {PASSWORD}")
        print()
        print("👉 Login at: http://localhost:8000/docs → POST /api/auth/login")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
