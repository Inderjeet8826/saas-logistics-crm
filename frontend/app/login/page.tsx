"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface TenantInfo {
  subdomain: string | null;
  name: string;
  is_super_admin: boolean;
  status?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portalMode, setPortalMode] = useState<"tenant" | "admin">("tenant");
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [tenantInfo, setTenantInfo] = useState<TenantInfo>({
    subdomain: "apex",
    name: "Apex Global Logistics",
    is_super_admin: false,
  });

  const isAdmin = portalMode === "admin";

  const loadSubdomainInfo = (sub: string | null) => {
    if (!sub) return;
    api
      .get<TenantInfo>(`/api/auth/tenant-info?subdomain=${sub}`)
      .then((res) => {
        if (res.data.is_super_admin) {
          setPortalMode("admin");
          setTenantInfo(res.data);
          setEmail((prev) => prev || "admin@logistics.com");
        } else if (res.data.subdomain) {
          setTenantInfo(res.data);
          setEmail((prev) => prev || `admin@${res.data.subdomain}.com`);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    // 1. Query param check (e.g. ?tenant=apex or ?subdomain=admin)
    let detectedSub: string | null = null;
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get("tenant") || urlParams.get("subdomain");
      if (q) {
        detectedSub = q.toLowerCase().trim();
        Cookies.set("current_subdomain", detectedSub, { path: "/" });
      }
    }

    // 2. Cookie check
    if (!detectedSub) {
      detectedSub = Cookies.get("current_subdomain") || null;
    }

    // 3. Hostname check
    if (!detectedSub && typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (host.endsWith(".localhost")) {
        detectedSub = host.replace(".localhost", "");
      } else if (!host.endsWith(".vercel.app") && host.includes(".") && !host.startsWith("127.")) {
        const parts = host.split(".");
        if (parts.length > 2 && parts[0] !== "www") {
          detectedSub = parts[0];
        }
      }
    }

    if (detectedSub === "admin") {
      setPortalMode("admin");
      setTenantInfo({
        subdomain: "admin",
        name: "Super Admin Console",
        is_super_admin: true,
      });
      setEmail("admin@logistics.com");
      setPassword("Admin@1234");
    } else if (detectedSub) {
      setPortalMode("tenant");
      setTenantInfo({
        subdomain: detectedSub,
        name: detectedSub === "apex" ? "Apex Global Logistics" : `${detectedSub.toUpperCase()} Logistics`,
        is_super_admin: false,
      });
      setEmail(detectedSub === "apex" ? "admin@apex.com" : `admin@${detectedSub}.com`);
      if (detectedSub === "apex") setPassword("Apex@1234");
      loadSubdomainInfo(detectedSub);
    } else {
      // Default to apex tenant
      setEmail("admin@apex.com");
      setPassword("Apex@1234");
    }
  }, []);

  const handleSelectPortal = (mode: "tenant" | "admin", sub?: string) => {
    setError(null);
    setPortalMode(mode);

    if (mode === "admin") {
      Cookies.set("current_subdomain", "admin", { path: "/" });
      setTenantInfo({
        subdomain: "admin",
        name: "Super Admin Console",
        is_super_admin: true,
      });
      setEmail("admin@logistics.com");
      setPassword("Admin@1234");
      loadSubdomainInfo("admin");
    } else {
      const targetSub = sub || customSubdomain || "apex";
      Cookies.set("current_subdomain", targetSub, { path: "/" });
      setTenantInfo({
        subdomain: targetSub,
        name: targetSub === "apex" ? "Apex Global Logistics" : targetSub === "thakurlogistics" ? "Thakur Logistics" : "Logistics CRM",
        is_super_admin: false,
      });
      setEmail(targetSub === "apex" ? "admin@apex.com" : `admin@${targetSub}.com`);
      setPassword(targetSub === "apex" ? "Apex@1234" : "");
      loadSubdomainInfo(targetSub);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || "Invalid email or password. Please try again.";
      setError(typeof detail === "string" ? detail : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 bg-slate-800 p-5 sm:p-8 rounded-2xl shadow-2xl border border-slate-700">
        {/* Brand / Logo */}
        <div className="text-center">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl text-white mb-3 sm:mb-4 shadow-lg transition-colors ${
              isAdmin
                ? "bg-amber-600 shadow-amber-500/30"
                : "bg-blue-600 shadow-blue-500/30"
            }`}
          >
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isAdmin ? "Super Admin Console" : tenantInfo.name}
          </h2>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-400">
            {isAdmin
              ? "Platform owner control plane & tenant management"
              : tenantInfo.subdomain
              ? `Sign in to the ${tenantInfo.name} shipment workspace`
              : "Sign in to access your dashboard & shipment workflows"}
          </p>

          {!isAdmin && tenantInfo.subdomain && (
            <span className="inline-block mt-2 font-mono text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
              {tenantInfo.subdomain} workspace
            </span>
          )}
        </div>

        {/* Instant Portal Switcher */}
        <div className="space-y-2">
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-700/60 text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => handleSelectPortal("tenant")}
              className={`flex-1 py-2 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
                !isAdmin
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🏢 Company Tenant CRM
            </button>
            <button
              type="button"
              onClick={() => handleSelectPortal("admin")}
              className={`flex-1 py-2 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
                isAdmin
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              👑 Super Admin Portal
            </button>
          </div>

          {!isAdmin && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-400 bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-[11px] sm:text-xs">Quick Demo Tenants:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectPortal("tenant", "apex")}
                  className={`px-2 py-0.5 rounded transition cursor-pointer font-mono text-xs ${
                    tenantInfo.subdomain === "apex" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "hover:text-white"
                  }`}
                >
                  apex
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPortal("tenant", "thakurlogistics")}
                  className={`px-2 py-0.5 rounded transition cursor-pointer font-mono text-xs ${
                    tenantInfo.subdomain === "thakurlogistics" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "hover:text-white"
                  }`}
                >
                  thakurlogistics
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-xs sm:text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="mt-6 sm:mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-slate-300 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAdmin ? "admin@logistics.com" : "admin@apex.com"}
                className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-slate-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition cursor-pointer ${
              isAdmin
                ? "bg-amber-600 hover:bg-amber-500 focus:ring-amber-500 shadow-amber-600/20"
                : "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500 shadow-blue-500/20"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Signing in...</span>
              </div>
            ) : (
              `Sign in as ${isAdmin ? "Super Admin" : "Company User"}`
            )}
          </button>

          {!isAdmin && (
            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                New logistics company?{" "}
                <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold">
                  Register for portal access &rarr;
                </Link>
              </p>
            </div>
          )}
        </form>

        {/* Helper Hint */}
        <div className="pt-4 border-t border-slate-700/60 text-center">
          <p className="text-xs text-slate-400 leading-relaxed">
            {isAdmin ? (
              <>
                Super Admin Login: <code className="text-amber-400 font-mono">admin@logistics.com</code> /{" "}
                <code className="text-amber-400 font-mono">Admin@1234</code>
              </>
            ) : tenantInfo.subdomain === "apex" ? (
              <>
                Apex Admin Demo: <code className="text-blue-400 font-mono">admin@apex.com</code> /{" "}
                <code className="text-blue-400 font-mono">Apex@1234</code>
              </>
            ) : (
              <>
                Logistics SaaS Platform — Multi-tenant shipment tracking
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
