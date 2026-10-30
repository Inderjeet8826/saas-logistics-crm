"""
Print a full snapshot of everything in the logistics_crm database.
Usage:
    python view_db.py
"""
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.super_admin import SuperAdmin
from app.models.company import Company
from app.models.user import User
from app.models.contact import Contact
from app.models.enquiry import Enquiry
from app.models.job import Job
from app.models.financial import Financial

def inspect_db():
    db = SessionLocal()
    try:
        print("\n" + "=" * 60)
        print("          🗄️  LOGISTICS CRM DATABASE SNAPSHOT")
        print("=" * 60)

        # 1. Super Admins
        super_admins = db.query(SuperAdmin).all()
        print(f"\n👑 SUPER ADMINS ({len(super_admins)} total):")
        for sa in super_admins:
            print(f"   • ID: {sa.id} | Name: {sa.name} | Email: {sa.email}")

        # 2. Companies
        companies = db.query(Company).all()
        print(f"\n🏢 TENANT COMPANIES ({len(companies)} total):")
        for c in companies:
            print(f"   • ID: {c.id} | Name: {c.name:<22} | Subdomain: {c.subdomain:<15} | Status: {c.subscription_status}")

        # 3. Users
        users = db.query(User).all()
        print(f"\n👥 USERS ({len(users)} total):")
        for u in users:
            print(f"   • ID: {u.id} | Company ID: {u.company_id} | Name: {u.name:<18} | Email: {u.email:<24} | Role: {u.role}")

        # 4. Contacts
        contacts = db.query(Contact).all()
        print(f"\n👥 CONTACTS ({len(contacts)} total):")
        for ct in contacts:
            print(f"   • ID: {ct.id} | Company ID: {ct.company_id} | [{ct.type.upper()}] {ct.name:<20} | Phone: {ct.phone or '—'}")

        # 5. Enquiries
        enquiries = db.query(Enquiry).all()
        print(f"\n📋 ENQUIRIES ({len(enquiries)} total):")
        for e in enquiries:
            print(f"   • ID: {e.id} | Company ID: {e.company_id} | {e.enquiry_no} | Route: {e.pol} -> {e.pod} | Rate: ${e.rate_offered} | Status: {e.status.upper()}")

        # 6. Jobs
        jobs = db.query(Job).all()
        print(f"\n🚢 SHIPMENT JOBS ({len(jobs)} total):")
        for j in jobs:
            print(f"   • ID: {j.id} | Company ID: {j.company_id} | {j.job_no} | Enq Ref: #{j.enquiry_id} | Container: {j.container_no or 'Awaiting'} | Status: {j.job_status.upper()}")

        # 7. Financials
        financials = db.query(Financial).all()
        print(f"\n💰 FINANCIAL RECORDS ({len(financials)} total):")
        for f in financials:
            profit = f.sales_amount - f.purchase_amount
            receivable = f.sales_amount - f.customer_paid_amount
            print(f"   • ID: {f.id} | Job Ref: #{f.job_id} | Sales: ${f.sales_amount} | Cost: ${f.purchase_amount} | Profit: ${profit} | Due: ${receivable}")

        print("\n" + "=" * 60 + "\n")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_db()
