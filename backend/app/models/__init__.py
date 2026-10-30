"""
Models package — import every ORM model here so Alembic's autogenerate
can discover all tables when it imports this module via env.py.
"""

from app.models.company import Company
from app.models.contact import Contact
from app.models.enquiry import Enquiry
from app.models.financial import Financial
from app.models.job import Job
from app.models.job_milestone import JobMilestone
from app.models.super_admin import SuperAdmin
from app.models.user import User

__all__ = [
    "Company",
    "Contact",
    "Enquiry",
    "Financial",
    "Job",
    "JobMilestone",
    "SuperAdmin",
    "User",
]
