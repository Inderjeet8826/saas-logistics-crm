"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api, { setAccessToken, setRefreshToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Company, TokenResponse, CurrentUser } from "@/types";

interface PlatformStats {
  total_companies: number;
  active_companies: number;
  total_users: number;
  total_jobs: number;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state to add a new company
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [plan, setPlan] = useState("standard");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseDomain, setBaseDomain] = useState("localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.host; // e.g. "admin.localhost:3000" or "myapp.vercel.app"
      if (host.includes(".localhost")) {
        setBaseDomain("localhost:3000");
      } else if (host.endsWith(".vercel.app")) {
        setBaseDomain(host); // On Vercel without custom domain, baseDomain is the vercel app host
      } else {
        // Remove leading subdomain if in production (e.g. admin.yourapp.com -> yourapp.com)
        const parts = host.split(".");
        if (parts.length > 2) {
          setBaseDomain(parts.slice(1).join("."));
        } else {
          setBaseDomain(host);
        }
      }
    }
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [statsRes, companiesRes] = await Promise.all([
        api.get<PlatformStats>("/api/super-admin/stats"),
        api.get<Company[]>("/api/super-admin/companies"),
      ]);
      setStats(statsRes.data);
      setCompanies(companiesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load platform data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/api/super-admin/companies", {
        name,
        subdomain: subdomain.toLowerCase().trim(),
        plan,
        admin_name: adminName || undefined,
        admin_email: adminEmail || undefined,
        admin_password: adminPassword || undefined,
      });
      setName("");
      setSubdomain("");
      setPlan("standard");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (companyId: number, newStatus: string) => {
    try {
      const company = companies.find((c) => c.id === companyId);
      await api.patch(`/api/super-admin/companies/${companyId}`, {
        subscription_status: newStatus,
      });
      if (newStatus === "active" && company?.subscription_status === "pending") {
        alert(`✅ ${company.name} has been approved & activated! An activation email has been dispatched to the company admin.`);
      }
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update status");
    }
  };

  // Jump into the Tenant's CRM dashboard directly
  const handleViewAsTenant = async (companyId: number) => {
    try {
      const company = companies.find((c) => c.id === companyId);
      const res = await api.post<TokenResponse>(`/api/super-admin/impersonate/${companyId}`);
      setAccessToken(res.data.access_token);
      setRefreshToken(res.data.refresh_token);
      if (company?.subdomain) {
        Cookies.set("current_subdomain", company.subdomain, { path: "/" });
      }
      // Hard redirect to dashboard to re-initialize tenant context
      window.location.href = "/dashboard";
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to enter tenant workspace");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading platform stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Platform Administration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Provision tenant logistics companies, configure credentials & inspect company workflows
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Provision Tenant Company</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Total Tenants</p>
          <p className="text-3xl font-extrabold text-white mt-2">
            {stats?.total_companies ?? 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered companies</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Active Subscriptions</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">
            {stats?.active_companies ?? 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Active paying tenants</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Total Users</p>
          <p className="text-3xl font-extrabold text-blue-400 mt-2">
            {stats?.total_users ?? 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Cross-tenant team accounts</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Jobs Booked</p>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">
            {stats?.total_jobs ?? 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Total shipments processed</span>
        </div>
      </div>

      {/* Companies Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">Logistics Companies</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Each company operates within an isolated database slice with their own users & shipments
            </p>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
            {companies.length} tenants
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Company</th>
                <th className="px-6 py-3.5">Subdomain</th>
                <th className="px-6 py-3.5">Plan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No tenant companies registered yet. Click &quot;+ Provision Tenant Company&quot; above to create one.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-white">{c.name}</td>
                    <td className="px-6 py-4">
                      <a
                        href={
                          baseDomain.endsWith(".vercel.app")
                            ? `/login?tenant=${c.subdomain}`
                            : `${typeof window !== "undefined" ? window.location.protocol : "http:"}//${c.subdomain}.${baseDomain}`
                        }
                        target={baseDomain.endsWith(".vercel.app") ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md border border-blue-500/20 inline-flex items-center gap-1.5 transition cursor-pointer"
                        title={`Open ${c.name}`}
                      >
                        <span>{baseDomain.endsWith(".vercel.app") ? `${c.subdomain} (demo link)` : `${c.subdomain}.${baseDomain}`}</span>
                        <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </td>
                    <td className="px-6 py-4 capitalize">{c.plan}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          c.subscription_status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : c.subscription_status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {c.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleViewAsTenant(c.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer shadow-sm shadow-blue-600/30"
                        title="Open this company's CRM directly"
                      >
                        👁️ Open CRM
                      </button>

                      {c.subscription_status !== "active" ? (
                        <button
                          onClick={() => handleStatusChange(c.id, "active")}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-sm ${
                            c.subscription_status === "pending"
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                              : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30"
                          }`}
                        >
                          {c.subscription_status === "pending" ? "✓ Approve & Activate" : "Reactivate"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(c.id, "suspended")}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 transition cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Tenant Company with Admin Credentials */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Provision New Tenant</h3>
                <p className="text-xs text-slate-400">Setup company account and initial admin login</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              {/* Company Details */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-400">1. Company Details</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Logistics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subdomain *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. apex"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subscription Plan
                  </label>
                  <div className="relative">
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none pr-10"
                    >
                      <option value="starter">Starter Plan</option>
                      <option value="standard">Standard Plan</option>
                      <option value="enterprise">Enterprise Plan</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Tenant Admin Credentials */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">2. Initial Admin Login</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Admin Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@apex.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Provisioning..." : "Create Tenant & Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
