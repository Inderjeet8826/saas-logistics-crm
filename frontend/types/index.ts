// ============================================================
// TYPES — Application ka poora data structure yahan define hai
// Jab bhi hum API se data laate hain, wo in types ke format mein hoga
// ============================================================

// ----- AUTH -----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "super_admin" | "sales" | "operations" | "accounts";
  company_id: number | null; // null = super admin
}

// ----- COMPANY -----
export interface Company {
  id: number;
  name: string;
  subdomain: string;
  plan: string;
  subscription_status: "pending" | "active" | "suspended";
  created_at: string;
}

// ----- CONTACT -----
export interface Contact {
  id: number;
  company_id: number;
  type: "customer" | "vendor";
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gst_no: string | null;
  credit_days: number | null;
  remarks: string | null;
  created_at: string;
}

export interface ContactCreate {
  type: "customer" | "vendor";
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gst_no?: string;
  credit_days?: number;
  remarks?: string;
}

// ----- ENQUIRY -----
export interface Enquiry {
  id: number;
  company_id: number;
  enquiry_no: string;
  enquiry_date: string;
  customer_id: number | null;
  sales_person_id: number | null;
  shipper: string | null;
  consignee: string | null;
  pol: string;
  pod: string;
  commodity: string;
  mode: string | null;
  container_size: string | null;
  rate_offered: number | null;
  quoted_by: string | null;
  status: "open" | "won" | "lost";
  lost_reason: string | null;
  follow_up_date: string | null;
  remarks: string | null;
  created_at: string;
}

// ----- JOB -----
export interface Job {
  id: number;
  company_id: number;
  job_no: string;
  enquiry_id: number;
  booking_date: string | null;
  customer_id: number | null;
  shipper: string | null;
  consignee: string | null;
  shipment_type: string | null;
  pol: string | null;
  pod: string | null;
  shipping_line: string | null;
  vessel: string | null;
  etd: string | null;
  eta: string | null;
  container_no: string | null;
  commodity: string | null;
  job_status: "active" | "completed";
  created_at: string;
}

export interface JobMilestone {
  id: number;
  job_id: number;
  empty_pickup_date: string | null;
  stuffing_date: string | null;
  gate_in_date: string | null;
  customs_clearance_date: string | null;
  sb_be_no: string | null;
  bl_released_date: string | null;
  sailing_date: string | null;
  arrival_date: string | null;
  delivery_date: string | null;
}

// ----- FINANCIAL -----
export interface Financial {
  id: number;
  company_id: number;
  job_id: number;
  customer_id: number | null;
  vendor_id: number | null;
  sales_amount: number;
  purchase_amount: number;
  customer_invoice_no: string | null;
  vendor_invoice_no: string | null;
  customer_paid_amount: number;
  vendor_paid_amount: number;
  // Computed fields from backend (never stored in DB)
  gross_profit: number;
  receivable: number;
  payable: number;
  payment_status: "Paid" | "Partial" | "Pending";
  created_at: string;
}

// ----- DASHBOARD -----
export interface DashboardSummary {
  total_enquiries: number;
  open_enquiries: number;
  won_enquiries: number;
  lost_enquiries: number;
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  total_contacts: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  total_receivable: number;
  total_payable: number;
}
