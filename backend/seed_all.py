"""
Unified seed script for production / staging database.
Usage:
    python seed_all.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from seed_super_admin import seed as seed_super_admin
from seed_tenant_data import seed_tenant as seed_tenant_data

if __name__ == "__main__":
    print("🌱 Seeding Super Admin...")
    seed_super_admin()
    print("\n🌱 Seeding Demo Tenant Data (Apex Logistics)...")
    seed_tenant_data()
    print("\n🚀 Database seeding complete!")
