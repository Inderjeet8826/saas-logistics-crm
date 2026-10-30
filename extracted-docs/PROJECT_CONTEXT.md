# Logistics CRM — Multi-Tenant SaaS
## Project Context Document

> **Purpose of this document**: This is the single source of truth for what this application is
> and how it works. Give this document to any AI tool, developer, or teammate before asking them
> to build or modify any part of this system — it prevents logic from being reinvented or broken
> in a way that's inconsistent with the rest of the app.

---

## 1. What This Application Is

This is a **multi-tenant SaaS product** — a Logistics / Freight-Forwarding CRM that is sold as a
subscription to multiple logistics companies. It is **not** a single-company internal tool; it is
a product with paying customers (companies), each of whom manages their own shipments, customers,
and finances inside the same platform, completely isolated from every other company's data.

**Two builders (the founders) run the platform itself.** They do not do freight-forwarding work —
they manage which companies are allowed to use the product, and they can see cross-company platform
stats.

**Every logistics company that subscribes** gets its own account and uses the CRM to manage their
actual shipping business: tracking customer enquiries, converting them into shipment jobs, tracking
the shipment's physical progress, and recording the money side (what's owed, what's been paid,
profit made).

---

## 2. Roles

| Role | Who | Scope |
|---|---|---|
| **Super Admin** | The founders/platform owners | Not tied to any company. Approves new companies, manages subscriptions, can see cross-company stats. Has no `company_id`. |
| **Admin** (per company) | The logistics company's user | Currently the ONLY role inside a company. Does everything: Enquiry, Job tracking, Financials, Dashboard. |
| *(Future, not built yet)* Sales / Operations / Accounts | Future per-company roles | Not implemented yet, but the `users` table and permission-check pattern must already support adding these without a schema change. Sales would only touch Enquiries, Operations only Jobs, Accounts only Financials. |

**Do not build Sales/Operations/Accounts screens or restrict Admin's access right now** — Admin
currently has full access to everything inside their company. The groundwork (role column,
permission-check pattern) should exist, but should not restrict Admin today.

---

## 3. Multi-Tenancy Model (how company data stays separate)

- **Single shared PostgreSQL database.** There is no separate database per company, and no
  separate "control plane" database. Super Admin data and every company's data live in the same
  database, same connection.
- **Isolation is done with a `company_id` column** on every company-owned table (`users`,
  `contacts`, `enquiries`, `jobs`, `financials`). Every single query against these tables MUST be
  filtered by `company_id`. This filter should be applied by ONE central, reusable mechanism
  (e.g. a FastAPI dependency) — never written manually and separately inside each endpoint. This
  is the single most important rule in this entire system: **if this filter is ever missed on an
  endpoint, one company can see another company's data.**
- **`super_admins` is a separate table with no `company_id`** — a super admin does not belong to
  any company.
- **Subdomains identify the tenant.** Each company gets a subdomain (e.g. `abc.yourapp.com`).
  Super Admin uses a fixed subdomain (`admin.yourapp.com`). The backend reads the subdomain on
  every request to decide: (a) is this the Super Admin, or (b) which company's `company_id` should
  be attached to this request.
- The resolved `company_id` (or "this is a super admin" flag) is attached to the JWT / session
  after login so it doesn't need to be re-derived from the subdomain on every single request.

---

## 4. Core CRM Flow (this logic must never change)

This is the heart of the product. It is the same regardless of multi-tenancy — it just now runs
once per company instead of once globally.

```
1. SALES/ADMIN creates an ENQUIRY
   - customer, route (POL/POD), commodity, quoted rate
   - status = "Open"

2. Enquiry status changes to:
   - "Lost" (with a lost_reason) → flow ends here, OR
   - "Won" → triggers step 3

3. System AUTO-CREATES a JOB when an enquiry is marked "Won"
   - Job gets its own job_no
   - Job stays linked back to the originating enquiry (enquiry_id FK)
   - A Job is NEVER created directly — it only comes from a Won enquiry

4. OPERATIONS/ADMIN tracks JOB MILESTONES as the shipment physically progresses:
   Empty Pickup → Stuffing → Gate-in → Customs Clearance → Sailing → Arrival → Delivery
   - Job status: Active → Completed (once delivered)

5. ACCOUNTS/ADMIN enters FINANCIALS against the Job:
   - sales_amount (billed to customer), purchase_amount (owed to vendor)
   - customer_paid_amount, vendor_paid_amount

6. System AUTO-CALCULATES (never store these — always compute on read):
   - Gross Profit = sales_amount − purchase_amount
   - Receivable = sales_amount − customer_paid_amount
   - Payable = purchase_amount − vendor_paid_amount
   - Payment Status = Paid / Partial / Pending (derived from the above)

7. DASHBOARD rolls up totals for that company:
   total enquiries, jobs booked, active shipments, revenue, cost, gross profit,
   pending receivables & payables
```

**Rules that must not be broken:**
- An Enquiry can only ever produce ONE Job (1:1). Never allow duplicate job creation from the
  same enquiry.
- Computed financial fields (profit, receivable, payable, payment status) must always be
  calculated at read-time from the raw amounts — never stored as static values that could go
  stale.
- A Job cannot exist without a parent Enquiry.
- A Financials record cannot exist without a parent Job.

---

## 5. Database Schema (single shared database)

```sql
-- Platform level — no company_id
super_admins (
  id, name, email, password_hash, created_at
)

-- Master tenant table
companies (
  id, name, subdomain, plan, subscription_status, created_at
)

-- Everything below has company_id and belongs to exactly one company

users (
  id, company_id, name, email, password_hash, role, is_active, created_at
  -- role enum: 'admin' (only one used today; 'sales'/'operations'/'accounts' reserved for later)
)

contacts (
  id, company_id, type, name, contact_person, phone, email,
  gst_no, credit_days, remarks, created_at
  -- type enum: 'customer' | 'vendor'
)

enquiries (
  id, company_id, enquiry_no, enquiry_date, customer_id (FK -> contacts),
  sales_person_id (FK -> users), shipper, consignee, pol, pod, commodity,
  mode, container_size, rate_offered, quoted_by, status, lost_reason,
  follow_up_date, remarks, created_at
  -- status enum: 'open' | 'won' | 'lost'
)

jobs (
  id, company_id, job_no, enquiry_id (FK -> enquiries, required),
  booking_date, customer_id (FK -> contacts), shipper, consignee,
  shipment_type, pol, pod, shipping_line, vessel, etd, eta,
  container_no, commodity, job_status, created_at
  -- job_status enum: 'active' | 'completed'
)

job_milestones (
  id, job_id (FK -> jobs), empty_pickup_date, stuffing_date, gate_in_date,
  customs_clearance_date, sb_be_no, bl_released_date, sailing_date,
  arrival_date, delivery_date
)

financials (
  id, company_id, job_id (FK -> jobs, required), customer_id, vendor_id,
  sales_amount, purchase_amount, customer_invoice_no, vendor_invoice_no,
  customer_paid_amount, vendor_paid_amount, created_at
  -- gross_profit, receivable, payable, payment_status = COMPUTED, not stored
)
```

**Every query against `users`, `contacts`, `enquiries`, `jobs` (via join), and `financials` must
include `WHERE company_id = :current_company_id`.**

---

## 6. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (single shared database) |
| ORM | SQLAlchemy 2.0 + Alembic (migrations) |
| Auth | JWT (access + refresh tokens), carries `user_id`, `role`, `company_id` (null for super admin) |
| Data grids | TanStack Table or AG Grid Community |
| Excel export | `openpyxl` (backend-generated, respects active filters) |
| Hosting | Vercel (frontend) + Railway/Render/VPS (backend + Postgres). Needs wildcard subdomain support (`*.yourapp.com`) |

---

## 7. API Surface (~35 endpoints — see also API list already shared separately)

Grouped by module:
1. **Auth & tenant resolution** — login, refresh, logout, `/auth/me`
2. **Super Admin** — company CRUD, subscription status, platform stats
3. **Signup** — public company signup request endpoint
4. **Users** — CRUD (per company)
5. **Contacts** — CRUD (customer/vendor master)
6. **Enquiries** — CRUD + `POST /enquiries/{id}/convert-to-job` (special action)
7. **Jobs** — read/update + milestone updates (no direct create — only via conversion)
8. **Financials** — CRUD + `/financials/aging-alert` (overdue customers)
9. **Dashboard** — `/dashboard/summary` rollup
10. **Export** — Excel export per module

---

## 8. Things Any Builder/AI Must NOT Do

- Do not create a Job endpoint that allows direct creation without an `enquiry_id` — Jobs only
  come from converting a Won enquiry.
- Do not store computed financial fields (profit/receivable/payable/status) in the database as
  plain columns updated manually — always compute from raw amounts at query/response time.
- Do not write a company-scoped query without a `company_id` filter, even "just for testing" —
  build the shared filtering mechanism first and always use it.
- Do not build Sales/Operations/Accounts-specific screens or restrictions yet — only Admin exists
  today per company.
- Do not introduce a second database, per-tenant database, or separate control-plane database —
  the current design is deliberately a single shared database.
- Do not skip the Super Admin's `company_id = null` handling — treat Super Admin requests as a
  distinct path from company requests, not as "company_id = 0" or similar hacks.
