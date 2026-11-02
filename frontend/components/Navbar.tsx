"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export default function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3.5 sm:px-6 z-10 sticky top-0">
      {/* Left side: Mobile Hamburger + Welcome context */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[140px] sm:max-w-none">
            Welcome, <span className="text-white font-semibold">{user?.name || "User"}</span>
          </h1>
          {user?.company_id && (
            <span className="hidden sm:inline-block text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 whitespace-nowrap">
              Tenant #{user.company_id}
            </span>
          )}
        </div>
      </div>

      {/* Right side: user badge + logout */}
      <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-white leading-none truncate max-w-[180px]">
            {user?.email}
          </p>
          <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider block mt-0.5">
            {user?.role?.replace("_", " ")}
          </span>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 transition cursor-pointer"
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
          <span className="hidden xs:inline sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
