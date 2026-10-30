"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { downloadExcel } from "@/lib/export";
import type { Job, JobMilestone } from "@/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Job for Milestones Modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [milestones, setMilestones] = useState<JobMilestone | null>(null);
  const [isMilestoneLoading, setIsMilestoneLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Milestone form state
  const [emptyPickup, setEmptyPickup] = useState("");
  const [stuffing, setStuffing] = useState("");
  const [gateIn, setGateIn] = useState("");
  const [customs, setCustoms] = useState("");
  const [sbBeNo, setSbBeNo] = useState("");
  const [blReleased, setBlReleased] = useState("");
  const [sailing, setSailing] = useState("");
  const [arrival, setArrival] = useState("");
  const [delivery, setDelivery] = useState("");
  const [jobStatus, setJobStatus] = useState<"active" | "completed">("active");

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url = filterStatus === "all" ? "/api/jobs" : `/api/jobs?job_status=${filterStatus}`;
      const res = await api.get<Job[]>(url);
      setJobs(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filterStatus]);

  const openMilestoneModal = async (job: Job) => {
    setSelectedJob(job);
    setJobStatus(job.job_status);
    setIsMilestoneLoading(true);
    try {
      const res = await api.get<JobMilestone>(`/api/jobs/${job.id}/milestones`);
      const m = res.data;
      setMilestones(m);
      setEmptyPickup(m.empty_pickup_date || "");
      setStuffing(m.stuffing_date || "");
      setGateIn(m.gate_in_date || "");
      setCustoms(m.customs_clearance_date || "");
      setSbBeNo(m.sb_be_no || "");
      setBlReleased(m.bl_released_date || "");
      setSailing(m.sailing_date || "");
      setArrival(m.arrival_date || "");
      setDelivery(m.delivery_date || "");
    } catch {
      // Milestone stub will be auto-created on save
    } finally {
      setIsMilestoneLoading(false);
    }
  };

  const handleSaveMilestones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setIsSaving(true);
    try {
      await Promise.all([
        api.patch(`/api/jobs/${selectedJob.id}/milestones`, {
          empty_pickup_date: emptyPickup || null,
          stuffing_date: stuffing || null,
          gate_in_date: gateIn || null,
          customs_clearance_date: customs || null,
          sb_be_no: sbBeNo || null,
          bl_released_date: blReleased || null,
          sailing_date: sailing || null,
          arrival_date: arrival || null,
          delivery_date: delivery || null,
        }),
        api.patch(`/api/jobs/${selectedJob.id}`, {
          job_status: jobStatus,
        }),
      ]);
      setSelectedJob(null);
      await fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update milestones");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Shipment Jobs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Operational shipment execution. Track live physical milestones from empty container release to cargo delivery.
          </p>
        </div>

        <button
          onClick={() => downloadExcel("jobs")}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium border border-slate-700 transition cursor-pointer"
        >
          <span>📥 Export Excel</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        {[
          { label: "All Shipments", value: "all" },
          { label: "Active In-Transit", value: "active" },
          { label: "Delivered / Completed", value: "completed" },
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
                <th className="px-6 py-3.5">Job No</th>
                <th className="px-6 py-3.5">Route</th>
                <th className="px-6 py-3.5">Carrier & Vessel</th>
                <th className="px-6 py-3.5">Container No</th>
                <th className="px-6 py-3.5">Commodity</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Tracking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading jobs...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No shipment jobs found. Jobs are auto-created when an Enquiry is marked &quot;Won&quot;.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-blue-400">{j.job_no}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <span className="font-semibold text-white">{j.pol}</span>
                        <span className="text-slate-500 mx-1">&rarr;</span>
                        <span className="font-semibold text-white">{j.pod}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="text-white font-medium">{j.shipping_line || "Carrier Assigned"}</p>
                        <p className="text-slate-400 font-mono text-[11px]">{j.vessel || "Pending Schedule"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-amber-400">
                      {j.container_no || "Awaiting Gate-in"}
                    </td>
                    <td className="px-6 py-4 text-xs">{j.commodity}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                          j.job_status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {j.job_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openMilestoneModal(j)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer shadow-sm shadow-blue-600/30"
                      >
                        ⏱ Update Milestones
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Milestones Stepper / Update Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Milestone Progress — <span className="font-mono text-blue-400">{selectedJob.job_no}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedJob.pol} &rarr; {selectedJob.pod} | Container: {selectedJob.container_no || "Unassigned"}
                </p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {isMilestoneLoading ? (
              <p className="text-center py-8 text-slate-500">Loading milestone history...</p>
            ) : (
              <form onSubmit={handleSaveMilestones} className="space-y-4">
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Overall Shipment Status</label>
                  <select
                    value={jobStatus}
                    onChange={(e) => setJobStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="active">Active (Cargo in transit / processing)</option>
                    <option value="completed">Completed (Cargo delivered to consignee)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">1. Empty Pickup Date</label>
                    <input
                      type="date"
                      value={emptyPickup}
                      onChange={(e) => setEmptyPickup(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">2. Factory Stuffing Date</label>
                    <input
                      type="date"
                      value={stuffing}
                      onChange={(e) => setStuffing(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">3. Port Gate-In Date</label>
                    <input
                      type="date"
                      value={gateIn}
                      onChange={(e) => setGateIn(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">4. Customs Clearance Date</label>
                    <input
                      type="date"
                      value={customs}
                      onChange={(e) => setCustoms(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Shipping Bill / BE No</label>
                    <input
                      type="text"
                      placeholder="e.g. SB-INNSA-982341"
                      value={sbBeNo}
                      onChange={(e) => setSbBeNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">5. Bill of Lading (BL) Released</label>
                    <input
                      type="date"
                      value={blReleased}
                      onChange={(e) => setBlReleased(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">6. Sailing Date</label>
                    <input
                      type="date"
                      value={sailing}
                      onChange={(e) => setSailing(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">7. Port Arrival Date</label>
                    <input
                      type="date"
                      value={arrival}
                      onChange={(e) => setArrival(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">8. Final Delivery Date</label>
                    <input
                      type="date"
                      value={delivery}
                      onChange={(e) => setDelivery(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedJob(null)}
                    className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Milestone Updates"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
