"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { downloadExcel } from "@/lib/export";
import type { Financial } from "@/types";

export default function FinancialsPage() {
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [agingAlerts, setAgingAlerts] = useState<Financial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit/Payment Modal
  const [selectedRecord, setSelectedRecord] = useState<Financial | null>(null);
  const [custPaid, setCustPaid] = useState<number | "">("");
  const [vendorPaid, setVendorPaid] = useState<number | "">("");
  const [custInv, setCustInv] = useState("");
  const [vendorInv, setVendorInv] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [finRes, alertRes] = await Promise.all([
        api.get<Financial[]>("/api/financials"),
        api.get<Financial[]>("/api/financials/aging-alert?days=15"),
      ]);
      setFinancials(finRes.data);
      setAgingAlerts(alertRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load financial records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPaymentModal = (f: Financial) => {
    setSelectedRecord(f);
    setCustPaid(f.customer_paid_amount || 0);
    setVendorPaid(f.vendor_paid_amount || 0);
    setCustInv(f.customer_invoice_no || "");
    setVendorInv(f.vendor_invoice_no || "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setIsSaving(true);
    try {
      await api.patch(`/api/financials/${selectedRecord.id}`, {
        customer_paid_amount: Number(custPaid || 0),
        vendor_paid_amount: Number(vendorPaid || 0),
        customer_invoice_no: custInv || null,
        vendor_invoice_no: vendorInv || null,
      });
      setSelectedRecord(null);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update financial payment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Shipment Financials & P&L</h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated freight billing calculations. Gross profit and pending receivables/payables are computed live at read-time.
          </p>
        </div>

        <button
          onClick={() => downloadExcel("financials")}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium border border-slate-700 transition cursor-pointer"
        >
          <span>📥 Export Excel</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Aging Alert Notice if any */}
      {agingAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="text-sm font-bold text-amber-400">
              Receivables Aging Alert ({agingAlerts.length} overdue shipments)
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              These shipments have uncollected customer balances older than 15 days. Please follow up with the respective client accounts desk.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Job Ref</th>
                <th className="px-6 py-3.5">Sales Billed</th>
                <th className="px-6 py-3.5">Carrier Cost</th>
                <th className="px-6 py-3.5">Gross Profit</th>
                <th className="px-6 py-3.5">Customer Balance</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Accounting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading ledger...
                  </td>
                </tr>
              ) : financials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No financial ledgers found. Financials are registered against active shipment jobs.
                  </td>
                </tr>
              ) : (
                financials.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-blue-400">
                      Job #{f.job_id}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">
                        ${Number(f.sales_amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Inv: {f.customer_invoice_no || "Unbilled"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-300">
                        ${Number(f.purchase_amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Vendor: {f.vendor_invoice_no || "Unbilled"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${f.gross_profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${Number(f.gross_profit || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-amber-400">
                      ${Number(f.receivable || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          f.payment_status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : f.payment_status === "Partial"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {f.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openPaymentModal(f)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium border border-slate-700 transition cursor-pointer"
                      >
                        💵 Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Record Invoice / Payment</h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Invoice No</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-0089"
                  value={custInv}
                  onChange={(e) => setCustInv(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Paid Amount ($) (Total Billed: ${Number(selectedRecord.sales_amount).toLocaleString()})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={custPaid}
                  onChange={(e) => setCustPaid(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor Invoice No</label>
                <input
                  type="text"
                  placeholder="e.g. MAE-4421"
                  value={vendorInv}
                  onChange={(e) => setVendorInv(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vendor Paid Amount ($) (Total Cost: ${Number(selectedRecord.purchase_amount).toLocaleString()})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={vendorPaid}
                  onChange={(e) => setVendorPaid(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Update Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
