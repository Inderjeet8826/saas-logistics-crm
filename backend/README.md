# Logistics CRM — Backend

A production-ready **multi-tenant SaaS Logistics CRM** backend built with:

| Layer | Technology |
|---|---|
| API Framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic 1.13 |
| Database | PostgreSQL |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Validation | Pydantic v2 |
| Excel Export | openpyxl |

---

## Project Overview

The CRM follows this core flow:

```
Enquiry → Won → Job (auto-created) → Milestones → Financials → Dashboard
```

Multi-tenancy is achieved via a **single PostgreSQL database** with `company_id`
isolation on every table.  Tenant resolution happens via HTTP Host-header
subdomain parsing (`acme.yourapp.com` → company `acme`).

Two top-level actor types:
* **super_admin** — platform-level, no `company_id`, accesses `admin.yourapp.com`
* **admin** — per-company user, accesses `<subdomain>.yourapp.com`

---

## Prerequisites

* Python **3.11+**
* PostgreSQL **14+**
* (Optional) [virtualenv](https://docs.python.org/3/library/venv.html) or [uv](https://github.com/astral-sh/uv)

---

## Setup

### 1. Clone & enter the backend directory

```bash
cd backend
```

### 2. Create & activate a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and JWT_SECRET_KEY
```

### 5. Create the database (PostgreSQL)

```sql
CREATE DATABASE logistics_crm;
```

### 6. Run Alembic migrations

```bash
# Generate first migration from models
alembic revision --autogenerate -m "initial schema"

# Apply to database
alembic upgrade head
```

---

## Running the Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs:
* Swagger UI → http://localhost:8000/docs
* ReDoc      → http://localhost:8000/redoc
* OpenAPI    → http://localhost:8000/openapi.json

Health check:
```bash
curl http://localhost:8000/health
# {"status":"ok","version":"1.0.0"}
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Obtain access + refresh tokens |
| POST | `/api/auth/refresh` | Renew token pair |
| POST | `/api/auth/logout` | Stateless logout |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/signup` | Self-service company registration |
| GET | `/api/super-admin/companies` | List all companies (super-admin) |
| POST | `/api/super-admin/companies` | Create company (super-admin) |
| PATCH | `/api/super-admin/companies/{id}` | Update company (super-admin) |
| DELETE | `/api/super-admin/companies/{id}` | Delete company (super-admin) |
| GET | `/api/super-admin/stats` | Platform-wide statistics |
| GET/POST | `/api/users` | List / create users |
| GET/PATCH/DELETE | `/api/users/{id}` | Manage a single user |
| GET/POST | `/api/contacts` | List / create contacts |
| GET/PATCH/DELETE | `/api/contacts/{id}` | Manage a single contact |
| GET/POST | `/api/enquiries` | List / create enquiries |
| GET/PATCH/DELETE | `/api/enquiries/{id}` | Manage an enquiry |
| PATCH | `/api/enquiries/{id}/status` | Update enquiry status |
| POST | `/api/enquiries/{id}/convert-to-job` | Convert won enquiry to job |
| GET | `/api/jobs` | List jobs |
| GET/PATCH | `/api/jobs/{id}` | Get / update a job |
| GET/PATCH | `/api/jobs/{id}/milestones` | Get / update milestones |
| GET/POST | `/api/financials` | List / create financial records |
| GET/PATCH/DELETE | `/api/financials/{id}` | Manage a financial record |
| GET | `/api/financials/aging-alert` | Accounts-receivable aging report |
| GET | `/api/dashboard/summary` | Company KPI dashboard |
| GET | `/api/export/{module}` | Download Excel export |

---

## Creating the First Super-Admin

Alembic does not seed data.  Insert the first super-admin directly:

```python
# run once via Python shell or a seed script
from app.database import SessionLocal
from app.models.super_admin import SuperAdmin
from app.core.security import hash_password

db = SessionLocal()
sa = SuperAdmin(name="Platform Admin", email="admin@yourapp.com", password_hash=hash_password("changeme"))
db.add(sa); db.commit()
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET_KEY` | Secret for signing JWTs | — |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime (min) | `30` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime (days) | `7` |
| `BASE_DOMAIN` | Root domain for subdomain resolution | `yourapp.com` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `ENVIRONMENT` | `development` / `production` | `development` |

---

## Project Structure

```
backend/
├── alembic/
│   ├── env.py              # Alembic environment configuration
│   ├── script.py.mako      # Migration file template
│   └── versions/           # Auto-generated migration files
├── app/
│   ├── core/
│   │   ├── security.py     # JWT, hashing, auth dependency
│   │   └── tenant.py       # Subdomain-based tenant resolution
│   ├── crud/               # Service/CRUD layer (expand here)
│   ├── models/             # SQLAlchemy ORM models
│   ├── routers/            # FastAPI route handlers
│   ├── schemas/            # Pydantic request/response models
│   ├── config.py           # Pydantic-settings configuration
│   ├── database.py         # Engine, session, Base
│   └── main.py             # FastAPI app + router registration
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```
