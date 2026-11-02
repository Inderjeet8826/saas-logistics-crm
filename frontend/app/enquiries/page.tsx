"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { downloadExcel } from "@/lib/export";
import type { Enquiry, Contact } from "@/types";

export default function EnquiriesPage() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [shipper, setShipper] = useState("");
  const [consignee, setConsignee] = useState("");
  const [pol, setPol] = useState("");
  const [pod, setPod] = useState("");
  const [commodity, setCommodity] = useState("");
  const [mode, setMode] = useState("FCL Sea Freight");
  const [containerSize, setContainerSize] = useState("1x40ft HC");
  const [rateOffered, setRateOffered] = useState<number | "">("");
  const [quotedBy, setQuotedBy] = useState("Sales Team");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lost Reason Modal
  const [lostEnquiryId, setLostEnquiryId] = useState<number | null>(null);
  const [lostReason, setLostReason] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url = filterStatus === "all" ? "/api/enquiries" : `/api/enquiries?status=${filterStatus}`;
      const [enqRes, custRes] = await Promise.all([
        api.get<Enquiry[]>(url),
        api.get<Contact[]>("/api/contacts?type=customer"),
      ]);
      setEnquiries(enqRes.data);
      setCustomers(custRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load enquiries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/api/enquiries", {
        enquiry_date: new Date().toISOString().split("T")[0],
        customer_id: customerId ? Number(customerId) : undefined,
        shipper: shipper || undefined,
        consignee: consignee || undefined,
        pol,
        pod,
        commodity,
        mode,
        container_size: containerSize,
        rate_offered: rateOffered ? Number(rateOffered) : undefined,
        quoted_by: quotedBy,
        remarks: remarks || undefined,
      });
      setIsModalOpen(false);
      // Reset
      setPol("");
      setPod("");
      setCommodity("");
      setRateOffered("");
      setShipper("");
      setConsignee("");
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create enquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToJob = async (enquiryId: number) => {
    if (!confirm("Are you sure you want to mark this enquiry as WON and auto-create the shipment JOB?")) {
      return;
    }
    try {
      const res = await api.post(`/api/enquiries/${enquiryId}/convert-to-job`);
      alert(`🎉 Job created successfully! Job Number: ${res.data.job_no}`);
      router.push("/jobs");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to convert enquiry to job");
    }
  };

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostEnquiryId || !lostReason) return;
    try {
      await api.patch(`/api/enquiries/${lostEnquiryId}/status`, {
        status: "lost",
        lost_reason: lostReason,
      });
      setLostEnquiryId(null);
      setLostReason("");
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales Enquiries</h1>
          <p className="text-sm text-slate-400 mt-1">
            Freight quote requests from customers. Mark &quot;Won&quot; to automatically spawn an operational Shipment Job.
          </p>
        </div>

        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => downloadExcel("enquiries")}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-medium border border-slate-700 transition cursor-pointer"
          >
            <span>📥 Export Excel</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <span>+ New Enquiry</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none flex-nowrap">
        {[
          { label: "All Enquiries", value: "all" },
          { label: "Open (Pending)", value: "open" },
          { label: "Won (Converted)", value: "won" },
          { label: "Lost", value: "lost" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filterStatus === tab.value
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Enquiry No</th>
                <th className="px-6 py-3.5">Route (POL &rarr; POD)</th>
                <th className="px-6 py-3.5">Commodity & Mode</th>
                <th className="px-6 py-3.5">Quoted Rate</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading pipeline...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No enquiries found. Click &quot;+ New Enquiry&quot; to register a customer quote request.
                  </td>
                </tr>
              ) : (
                enquiries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-blue-400">{e.enquiry_no}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <span className="font-semibold text-white">{e.pol}</span>
                        <span className="text-slate-500 mx-1.5">&rarr;</span>
                        <span className="font-semibold text-white">{e.pod}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="text-white">{e.commodity}</p>
                        <p className="text-slate-400">{e.mode} ({e.container_size || "Standard"})</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">
                      ${Number(e.rate_offered || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                          e.status === "won"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : e.status === "lost"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {e.status === "open" && (
                        <>
                          <button
                            onClick={() => handleConvertToJob(e.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer shadow-sm shadow-emerald-600/30"
                          >
                            ✓ Won &rarr; Auto Job
                          </button>
                          <button
                            onClick={() => setLostEnquiryId(e.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 transition cursor-pointer"
                          >
                            ✕ Mark Lost
                          </button>
                        </>
                      )}
                      {e.status === "won" && (
                        <span className="text-xs text-slate-500 italic">Job Spawned ✓</span>
                      )}
                      {e.status === "lost" && (
                        <span className="text-xs text-slate-500 italic" title={e.lost_reason || ""}>
                          Reason: {e.lost_reason || "None"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Enquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl space-y-5 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white">Create New Freight Enquiry</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="">-- Select Customer (or create in Contacts) --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Port of Loading (POL) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nhava Sheva (INNSA)"
                    value={pol}
                    onChange={(e) => setPol(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Port of Discharge (POD) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hamburg (DEHAM)"
                    value={pod}
                    onChange={(e) => setPod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Commodity *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spare Parts"
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quoted Rate (USD) *</label>
                  <input
                    type="number"
                    required
                    placeholder="4800"
                    value={rateOffered}
                    onChange={(e) => setRateOffered(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="FCL Sea Freight">FCL Sea Freight</option>
                    <option value="LCL Sea Freight">LCL Sea Freight</option>
                    <option value="Air Freight">Air Freight</option>
                    <option value="Road Transportation">Road Transportation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Container Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 2x40ft HC"
                    value={containerSize}
                    onChange={(e) => setContainerSize(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lost Reason Modal */}
      {lostEnquiryId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Record Lost Reason</h3>
            <p className="text-xs text-slate-400">
              Why was this business lost? This data improves future quote competitiveness.
            </p>
            <form onSubmit={handleMarkLost} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="e.g. Client received a lower rate from MSC / schedule not matching"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLostEnquiryId(null)}
                  className="flex-1 py-2 px-4 bg-slate-800 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold"
                >
                  Confirm Lost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
