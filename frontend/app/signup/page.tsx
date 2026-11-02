"use client";

import React, { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [plan, setPlan] = useState("standard");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/api/signup", {
        name,
        subdomain: subdomain.toLowerCase().trim(),
        plan,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: password,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-md bg-slate-800 p-5 sm:p-8 rounded-2xl shadow-2xl border border-slate-700 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Application Submitted!</h2>
            <p className="text-sm text-slate-300">
              Your company registration request for <span className="font-semibold text-blue-400">{name}</span> has been received.
            </p>
            <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300 text-left space-y-1.5 mt-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <span>✉️</span>
                <span>Confirmation Email Sent</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                We have dispatched an acknowledgment email to <code className="text-white font-mono">{adminEmail}</code> with your application details.
              </p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              Our administration team will review and activate your subscription shortly. Once activated, you can immediately sign into your workspace.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-700/60">
            <Link
              href="/login"
              className="inline-flex justify-center items-center w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="w-full max-w-lg space-y-6 sm:space-y-8 bg-slate-800 p-5 sm:p-8 rounded-2xl shadow-2xl border border-slate-700">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-3 shadow-lg shadow-blue-500/30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Register Your Logistics Company
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Start managing shipments, customs milestones & freight financials
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">1. Company Profile</p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Express Freight Solutions"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Desired Workspace Subdomain *</label>
              <div className="flex items-center w-full rounded-xl bg-slate-900 border border-slate-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden">
                <input
                  type="text"
                  required
                  placeholder="e.g. express"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-white text-sm font-mono focus:outline-none placeholder-slate-500"
                />
                <span className="px-3.5 py-2.5 bg-slate-800 text-slate-400 text-xs font-mono border-l border-slate-700 whitespace-nowrap select-none">
                  .yourapp
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Your portal will be accessible at:{" "}
                <span className="text-blue-400 font-mono">
                  {subdomain ? `${subdomain}.yourapp` : "yourcompany.yourapp"}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subscription Plan *</label>
              <div className="relative">
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none pr-10"
                >
                  <option value="starter">Starter Plan (Up to 5 Users)</option>
                  <option value="standard">Standard Plan (Unlimited)</option>
                  <option value="enterprise">Enterprise Plan (Dedicated)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-700/60">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">2. Company Admin Credentials</p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Chandra"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email *</label>
              <input
                type="email"
                required
                placeholder="ramesh@expressfreight.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20"
          >
            {isSubmitting ? "Submitting Application..." : "Submit Registration Request"}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Already have an active company portal?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
