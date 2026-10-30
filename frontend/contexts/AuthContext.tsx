"use client";
// ============================================================
// AUTH CONTEXT — React Context
//
// Ye ek "global store" ki tarah hai sirf authentication ke liye.
// Iske andar:
//   - currentUser (logged in user ki info)
//   - login() function
//   - logout() function
//   - isLoading (check kar raha hai ki user logged in hai ya nahi)
//
// Koi bhi component poori app mein useAuth() hook se
// in cheezein access kar sakta hai — kahi bhi, kabhi bhi!
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api, {
  setAccessToken,
  setRefreshToken,
  clearTokens,
  getRefreshToken,
} from "@/lib/api";
import type { CurrentUser, LoginRequest, TokenResponse } from "@/types";

// ── Context ka shape define karo ─────────────────────────────
interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context banao ─────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider: ye poori app ko wrap karega ────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // start true — check kar rahe hain
  const router = useRouter();

  // ── App start hone pe: kya user pehle se logged in hai? ──
  // Agar refresh token cookie mein hai → silently naya access token lo
  const initializeAuth = useCallback(async () => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    try {
      // Refresh token se naya access token lo
      const { data } = await api.post<TokenResponse>("/api/auth/refresh", {
        refresh_token: refreshToken,
      });

      setAccessToken(data.access_token);
      setRefreshToken(data.refresh_token);

      // Apni profile fetch karo
      const { data: me } = await api.get<CurrentUser>("/api/auth/me");
      setUser(me);
    } catch {
      // Refresh fail → tokens invalid hain, clear karo
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // ── LOGIN function ────────────────────────────────────────
  const login = async (credentials: LoginRequest) => {
    const { data } = await api.post<TokenResponse>("/api/auth/login", credentials);

    // Access token → memory mein
    setAccessToken(data.access_token);
    // Refresh token → cookie mein
    setRefreshToken(data.refresh_token);

    // Apni profile fetch karo
    const { data: me } = await api.get<CurrentUser>("/api/auth/me");
    setUser(me);

    // Role ke hisaab se redirect karo
    if (me.role === "super_admin") {
      router.push("/super-admin");
    } else {
      router.push("/dashboard");
    }
  };

  // ── LOGOUT function ───────────────────────────────────────
  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Even if API fails, clear local tokens
    } finally {
      clearTokens();
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── useAuth hook — koi bhi component yahan se use karega ─────
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
