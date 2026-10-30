"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardData {
  enquiries: {
    total: number;
    by_status: Record<string, number>;
  };
  jobs: {
    total: number;
    by_status: Record<string, number>;
  };
  financials: {
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    total_receivable: number;
    total_payable: number;
  };
  contacts: {
    customers: number;
    vendors: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If super admin has no company_id, dashboard/summary won't work for them directly
    if (user?.role === "super_admin" && !user.company_id) {
      setIsLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get<DashboardData>("/api/dashboard/summary");
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load dashboard summary");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [user]);

  if (user?.role === "super_admin" && !user.company_id) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Super Admin Workspace</h2>
          <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
            You are logged in with the platform owner role. Company-scoped dashboards represent individual logistics tenant accounts.
          </p>
          <div className="pt-2">
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <span>Go to Platform Admin Console</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading dashboard metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Quick actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time shipment flow, sales conversions, and calculated financial positions
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/enquiries"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <span>+ New Enquiry</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Financial KPIs (Auto-calculated on read) */}
      <div>
        <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider mb-4">
          Financial Position (Live Computed)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-400">Total Billed Revenue</p>
            <p className="text-2xl font-extrabold text-white mt-2">
              ${(data?.financials.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Sales invoiced to customers</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-400">Total Vendor Cost</p>
            <p className="text-2xl font-extrabold text-slate-300 mt-2">
              ${(data?.financials.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Carrier & vendor expenses</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-400">Gross Profit (Margin)</p>
            <p className={`text-2xl font-extrabold mt-2 ${(data?.financials.gross_profit || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              ${(data?.financials.gross_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Revenue minus Cost</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-400">Pending Receivables</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-2">
              ${(data?.financials.total_receivable || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Uncollected customer balance</span>
          </div>
        </div>
      </div>

      {/* Operational Flow Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enquiries Pipeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Sales Pipeline (Enquiries)</h3>
              <p className="text-xs text-slate-400">Tracking incoming freight quotes</p>
            </div>
            <Link href="/enquiries" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              View All &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700/40">
              <span className="text-xs text-slate-400 font-medium">Open</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {data?.enquiries.by_status?.open || 0}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700/40">
              <span className="text-xs text-slate-400 font-medium">Won (Booked)</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {data?.enquiries.by_status?.won || 0}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700/40">
              <span className="text-xs text-slate-400 font-medium">Lost</span>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {data?.enquiries.by_status?.lost || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Shipment Jobs Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Operations (Shipment Jobs)</h3>
              <p className="text-xs text-slate-400">Milestone executions in transit</p>
            </div>
            <Link href="/jobs" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              View All &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700/40">
              <span className="text-xs text-slate-400 font-medium">Active In-Transit</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {data?.jobs.by_status?.active || 0}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700/40">
              <span className="text-xs text-slate-400 font-medium">Completed / Delivered</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {data?.jobs.by_status?.completed || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
