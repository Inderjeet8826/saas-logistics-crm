# Backend Setup Prompt
## Paste this into Claude Code (or any AI coding tool) to scaffold the backend

> Before using this prompt, also share `PROJECT_CONTEXT.md` in the same conversation/session so
> the tool understands the full application logic and doesn't build anything inconsistent with it.

---

## THE PROMPT (copy everything below this line)

---

I'm building the backend for a multi-tenant SaaS Logistics CRM using **FastAPI** and
**PostgreSQL**, with **SQLAlchemy 2.0** and **Alembic** for migrations. I want you to set up the
initial project structure, install dependencies, and create the basic (empty/skeleton) files —
**do not implement business logic yet**, I will build each module myself piece by piece. I want
full control and understanding of every file, so keep this step to structure and setup only.

### 1. Create this folder structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app entrypoint
│   ├── config.py                   # Settings loaded from .env (pydantic-settings)
│   ├── database.py                 # SQLAlchemy engine + session setup
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py             # password hashing, JWT create/verify (empty functions for now)
│   │   └── tenant.py                # subdomain → company_id resolution dependency (empty for now)
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── super_admin.py
│   │   ├── company.py
│   │   ├── user.py
│   │   ├── contact.py
│   │   ├── enquiry.py
│   │   ├── job.py
│   │   ├── job_milestone.py
│   │   └── financial.py
│   │
│   ├── schemas/                    # Pydantic request/response models (empty placeholders)
│   │   ├── __init__.py
│   │   ├── super_admin.py
│   │   ├── company.py
│   │   ├── user.py
│   │   ├── contact.py
│   │   ├── enquiry.py
│   │   ├── job.py
│   │   └── financial.py
│   │
│   ├── routers/                    # API route files (empty routers, no logic yet)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── super_admin.py
│   │   ├── signup.py
│   │   ├── users.py
│   │   ├── contacts.py
│   │   ├── enquiries.py
│   │   ├── jobs.py
│   │   ├── financials.py
│   │   ├── dashboard.py
│   │   └── export.py
│   │
│   └── crud/                       # DB access functions per module (empty placeholders)
│       ├── __init__.py
│       └── (mirror the routers list above, empty files for now)
│
├── alembic/                        # created by `alembic init`
├── alembic.ini
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

### 2. Install these dependencies (add to `requirements.txt` and install)

```
fastapi
uvicorn[standard]
sqlalchemy>=2.0
alembic
psycopg2-binary
pydantic
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
python-multipart
python-dotenv
openpyxl
```

### 3. `app/config.py` should:
- Use `pydantic-settings` to load from a `.env` file
- Include: `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`,
  `JWT_REFRESH_TOKEN_EXPIRE_DAYS`, `BASE_DOMAIN` (e.g. `yourapp.com`, used for subdomain parsing)

### 4. `app/database.py` should:
- Create the SQLAlchemy engine from `DATABASE_URL`
- Create `SessionLocal` and a `get_db()` dependency generator
- Create a `Base` declarative class that all models will import

### 5. `app/main.py` should:
- Create the FastAPI app
- Include CORS middleware (allow the Next.js frontend origin from settings)
- Register all routers from `app/routers/` under sensible prefixes (e.g. `/api/auth`,
  `/api/super-admin`, `/api/contacts`, etc.)
- A basic `GET /health` endpoint returning `{"status": "ok"}` so I can verify the server runs

### 6. Models (`app/models/*.py`)
Create SQLAlchemy models matching this schema exactly (types/nullability as appropriate) — no
extra fields, no extra tables:

- `super_admins`: id, name, email (unique), password_hash, created_at — **no company_id**
- `companies`: id, name, subdomain (unique), plan, subscription_status, created_at
- `users`: id, company_id (FK), name, email, password_hash, role, is_active, created_at
- `contacts`: id, company_id (FK), type, name, contact_person, phone, email, gst_no, credit_days, remarks, created_at
- `enquiries`: id, company_id (FK), enquiry_no, enquiry_date, customer_id (FK->contacts), sales_person_id (FK->users), shipper, consignee, pol, pod, commodity, mode, container_size, rate_offered, quoted_by, status, lost_reason, follow_up_date, remarks, created_at
- `jobs`: id, company_id (FK), job_no, enquiry_id (FK->enquiries, required), booking_date, customer_id (FK->contacts), shipper, consignee, shipment_type, pol, pod, shipping_line, vessel, etd, eta, container_no, commodity, job_status, created_at
- `job_milestones`: id, job_id (FK->jobs), empty_pickup_date, stuffing_date, gate_in_date, customs_clearance_date, sb_be_no, bl_released_date, sailing_date, arrival_date, delivery_date
- `financials`: id, company_id (FK), job_id (FK->jobs, required), customer_id, vendor_id, sales_amount, purchase_amount, customer_invoice_no, vendor_invoice_no, customer_paid_amount, vendor_paid_amount, created_at
  - Do NOT add columns for profit/receivable/payable/payment_status — these will be computed in code later, not stored.

### 7. Routers
For each router file, just create the `APIRouter()` instance with the correct `prefix` and `tags`,
and register it in `main.py`. Leave route functions out entirely for now — I will add endpoints
myself module by module. Just get the file registered and importable.

### 8. `app/core/tenant.py`
Create an empty function stub `get_current_tenant()` with a docstring explaining: "This will read
the subdomain from the request, resolve it to either a super_admin context or a company_id, and
will later be used as a FastAPI dependency on every tenant-scoped route." Don't implement the logic
yet — just the stub and docstring so I know where it belongs.

### 9. `app/core/security.py`
Same — empty stub functions with docstrings for: `hash_password`, `verify_password`,
`create_access_token`, `create_refresh_token`, `decode_token`. No implementation yet.

### 10. Alembic setup
- Run `alembic init alembic`
- Configure `alembic/env.py` to import `Base` from `app/database.py` and all models so
  autogenerate will work once I start adding columns
- Point `sqlalchemy.url` in `alembic.ini` to read from the `.env` `DATABASE_URL` instead of being
  hardcoded

### 11. `.env.example`
Create with placeholder values for all settings from `config.py`, so I can copy it to `.env` and
fill in real values.

### 12. `README.md`
A short README with: how to create a virtualenv, install dependencies, set up `.env`, run
migrations (`alembic upgrade head`), and start the dev server (`uvicorn app.main:app --reload`).

### After setup, verify for me:
1. The server starts with `uvicorn app.main:app --reload`
2. `GET /health` returns `{"status": "ok"}`
3. `/docs` (Swagger UI) loads and shows all registered (empty) routers

**Important**: Keep every file minimal and empty of business logic beyond what's described above.
I want to write the actual CRUD logic, auth logic, and tenant filtering myself, module by module,
so I fully understand and control what's happening in each part of the app.

---

## END OF PROMPT

---

### After you run this prompt

Once the skeleton is set up and verified, the recommended build order (matches `PROJECT_CONTEXT.md`) is:

1. `app/core/security.py` — implement password hashing + JWT functions
2. `app/core/tenant.py` — implement subdomain → company_id resolution
3. `auth` router — login/refresh/logout/me
4. `contacts` router — first real CRUD module (simplest, good for testing the whole pattern end to end)
5. `enquiries` router — including the `convert-to-job` action
6. `jobs` router — including milestone updates
7. `financials` router — including computed fields
8. `dashboard` router
9. `super_admin` + `signup` routers
10. `export` router
