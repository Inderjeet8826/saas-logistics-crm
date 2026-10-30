"""
Seed a sample Tenant Company ('Apex Global Logistics') with realistic CRM data:
- 1 Company (Apex Global Logistics, subdomain: apex)
- 1 Company Admin User (admin@apex.com / Apex@1234)
- 4 Contacts (2 Customers, 2 Shipping Line Vendors)
- 3 Enquiries (1 Open, 1 Lost, 1 Won)
- 1 Active Shipment Job (converted from the Won enquiry)
- 1 Job Milestone progression
- 1 Financial record with revenue & vendor cost

Usage:
    python seed_tenant_data.py
"""
import sys
import datetime
from decimal import Decimal
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.contact import Contact
from app.models.enquiry import Enquiry
from app.models.job import Job
from app.models.job_milestone import JobMilestone
from app.models.financial import Financial
from app.core.security import hash_password

def seed_tenant():
    db = SessionLocal()
    try:
        # 1. Company
        company = db.query(Company).filter(Company.subdomain == "apex").first()
        if not company:
            company = Company(
                name="Apex Global Logistics",
                subdomain="apex",
                plan="enterprise",
                subscription_status="active",
            )
            db.add(company)
            db.flush()
            print(f"✅ Created Company: {company.name} (id: {company.id})")
        else:
            print(f"ℹ️ Company already exists: {company.name} (id: {company.id})")

        # 2. Tenant Admin User
        user = db.query(User).filter(User.company_id == company.id, User.email == "admin@apex.com").first()
        if not user:
            user = User(
                company_id=company.id,
                name="Apex Operations Manager",
                email="admin@apex.com",
                password_hash=hash_password("Apex@1234"),
                role="admin",
                is_active=True,
            )
            db.add(user)
            db.flush()
            print("✅ Created Tenant User: admin@apex.com (Password: Apex@1234)")
        else:
            print("ℹ️ User admin@apex.com already exists")

        # 3. Contacts
        c1 = db.query(Contact).filter(Contact.company_id == company.id, Contact.name == "Tata Motors Ltd").first()
        if not c1:
            c1 = Contact(
                company_id=company.id,
                type="customer",
                name="Tata Motors Ltd",
                contact_person="Rajesh Sharma",
                phone="+91 98200 12345",
                email="shipping@tatamotors.com",
                gst_no="27AAACT2727Q1ZW",
                credit_days=30,
                remarks="Automotive parts export client",
            )
            db.add(c1)

        c2 = db.query(Contact).filter(Contact.company_id == company.id, Contact.name == "Reliance Retail").first()
        if not c2:
            c2 = Contact(
                company_id=company.id,
                type="customer",
                name="Reliance Retail",
                contact_person="Priya Patel",
                phone="+91 98765 43210",
                email="logistics@reliance.com",
                gst_no="24AAACR1234M1Z2",
                credit_days=45,
            )
            db.add(c2)

        v1 = db.query(Contact).filter(Contact.company_id == company.id, Contact.name == "Maersk Line India").first()
        if not v1:
            v1 = Contact(
                company_id=company.id,
                type="vendor",
                name="Maersk Line India",
                contact_person="Vikram Rao",
                phone="+91 22 6677 8899",
                email="bookings@maersk.com",
            )
            db.add(v1)

        db.flush()
        print("✅ Seeded Customers & Vendors")

        # 4. Enquiries
        e1 = db.query(Enquiry).filter(Enquiry.company_id == company.id, Enquiry.enquiry_no == "ENQ-APEX-0001").first()
        if not e1:
            e1 = Enquiry(
                company_id=company.id,
                enquiry_no="ENQ-APEX-0001",
                enquiry_date=datetime.date.today() - datetime.timedelta(days=10),
                customer_id=c1.id,
                sales_person_id=user.id,
                shipper="Tata Motors Sanand Plant",
                consignee="Tata Auto Germany GmbH",
                pol="Nhava Sheva (INNSA)",
                pod="Hamburg (DEHAM)",
                commodity="Engine Spare Parts",
                mode="FCL Sea Freight",
                container_size="2x40ft HC",
                rate_offered=Decimal("4850.00"),
                quoted_by="Apex Sales Desk",
                status="won",
            )
            db.add(e1)
            db.flush()

        e2 = db.query(Enquiry).filter(Enquiry.company_id == company.id, Enquiry.enquiry_no == "ENQ-APEX-0002").first()
        if not e2:
            e2 = Enquiry(
                company_id=company.id,
                enquiry_no="ENQ-APEX-0002",
                enquiry_date=datetime.date.today() - datetime.timedelta(days=4),
                customer_id=c2.id,
                sales_person_id=user.id,
                shipper="Reliance Hazira",
                consignee="Dubai General Trading LLC",
                pol="Mundra (INMUN)",
                pod="Jebel Ali (AEJEA)",
                commodity="Textiles & Garments",
                mode="FCL Sea Freight",
                container_size="1x20ft GP",
                rate_offered=Decimal("1750.00"),
                quoted_by="Apex Sales Desk",
                status="open",
                follow_up_date=datetime.date.today() + datetime.timedelta(days=2),
                remarks="Customer checking rates with competing freight forwarder",
            )
            db.add(e2)

        e3 = db.query(Enquiry).filter(Enquiry.company_id == company.id, Enquiry.enquiry_no == "ENQ-APEX-0003").first()
        if not e3:
            e3 = Enquiry(
                company_id=company.id,
                enquiry_no="ENQ-APEX-0003",
                enquiry_date=datetime.date.today() - datetime.timedelta(days=12),
                customer_id=c2.id,
                sales_person_id=user.id,
                shipper="Reliance Jamnagar",
                consignee="US Chemicals Inc",
                pol="Mundra (INMUN)",
                pod="Houston (USHOU)",
                commodity="Polymer Granules",
                mode="FCL Sea Freight",
                container_size="4x40ft GP",
                rate_offered=Decimal("7200.00"),
                status="lost",
                lost_reason="Competitor provided lower sea freight rate with MSC",
            )
            db.add(e3)

        db.flush()
        print("✅ Seeded Enquiries (Won, Open, Lost)")

        # 5. Job (auto-created from Won enquiry)
        j1 = db.query(Job).filter(Job.enquiry_id == e1.id).first()
        if not j1:
            j1 = Job(
                company_id=company.id,
                job_no="JOB-APEX-0001",
                enquiry_id=e1.id,
                booking_date=datetime.date.today() - datetime.timedelta(days=8),
                customer_id=c1.id,
                shipper=e1.shipper,
                consignee=e1.consignee,
                shipment_type=e1.mode,
                pol=e1.pol,
                pod=e1.pod,
                shipping_line="Maersk Line",
                vessel="MAERSK MC-KINNEY MOLLER / V.2401E",
                etd=datetime.date.today() + datetime.timedelta(days=3),
                eta=datetime.date.today() + datetime.timedelta(days=28),
                container_no="MRKU9876543 / 40HC",
                commodity=e1.commodity,
                job_status="active",
            )
            db.add(j1)
            db.flush()

            # Milestones
            m1 = JobMilestone(
                job_id=j1.id,
                empty_pickup_date=datetime.date.today() - datetime.timedelta(days=6),
                stuffing_date=datetime.date.today() - datetime.timedelta(days=5),
                gate_in_date=datetime.date.today() - datetime.timedelta(days=3),
                customs_clearance_date=datetime.date.today() - datetime.timedelta(days=2),
                sb_be_no="SB-INNSA-9823411",
                bl_released_date=datetime.date.today() - datetime.timedelta(days=1),
                sailing_date=None,  # Pending
                arrival_date=None,  # Pending
                delivery_date=None, # Pending
            )
            db.add(m1)

            # Financials
            f1 = Financial(
                company_id=company.id,
                job_id=j1.id,
                customer_id=c1.id,
                vendor_id=v1.id,
                sales_amount=Decimal("4850.00"),
                purchase_amount=Decimal("3700.00"),
                customer_invoice_no="INV-2026-0089",
                vendor_invoice_no="MAE-INV-4421",
                customer_paid_amount=Decimal("2000.00"),
                vendor_paid_amount=Decimal("3700.00"),
            )
            db.add(f1)
            print("✅ Created Active Shipment Job, Milestones & Financials")

        db.commit()
        print("\n🎉 Seed complete! You can now log in as the Tenant Company Admin:")
        print("   Email   : admin@apex.com")
        print("   Password: Apex@1234")
    finally:
        db.close()

if __name__ == "__main__":
    seed_tenant()
