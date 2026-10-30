"""
Unified database initialization and seed script for production / staging.
1. Creates all tables if they don't exist (Base.metadata.create_all)
2. Stamps Alembic to latest head
3. Seeds default Super Admin (admin@logistics.com / Admin@1234)
4. Seeds default Demo Tenant (Apex Global Logistics / admin@apex.com / Apex@1234)
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine
import app.models  # registers all tables with metadata
from seed_super_admin import seed as seed_super_admin
from seed_tenant_data import seed_tenant as seed_tenant_data


def init_and_seed():
    print("🔨 Step 1: Ensuring all database tables exist...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables verified / created successfully!")

    # Attempt to stamp alembic head so future migrations remain aligned
    try:
        from alembic.config import Config
        from alembic import command
        alembic_ini_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic.ini")
        if os.path.exists(alembic_ini_path):
            alembic_cfg = Config(alembic_ini_path)
            command.stamp(alembic_cfg, "head")
            print("✅ Alembic stamped to head revision.")
    except Exception as e:
        print(f"ℹ️ Alembic stamp skipped ({e}), tables are ready.")

    print("\n🌱 Step 2: Seeding Super Admin...")
    seed_super_admin()

    print("\n🌱 Step 3: Seeding Demo Tenant Data (Apex Logistics)...")
    seed_tenant_data()

    print("\n🚀 Database initialization & seeding 100% complete!")


if __name__ == "__main__":
    init_and_seed()
