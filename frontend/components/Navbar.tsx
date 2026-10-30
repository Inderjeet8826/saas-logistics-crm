"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-10">
      {/* Left side: welcome/context */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium text-slate-300">
          Welcome back, <span className="text-white font-semibold">{user?.name || "User"}</span>
        </h1>
        {user?.company_id && (
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700">
            Tenant ID: #{user.company_id}
          </span>
        )}
      </div>

      {/* Right side: user badge + logout */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-semibold text-white leading-none">
            {user?.email}
          </p>
          <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider block mt-0.5">
            {user?.role?.replace("_", " ")}
          </span>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 transition cursor-pointer"
          title="Sign out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
