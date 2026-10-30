// ============================================================
// MIDDLEWARE — Subdomain & Route Protection
//
// 1. Reads subdomain from Host header (e.g. apex.localhost:3000 -> "apex", admin.localhost:3000 -> "admin")
// 2. Enforces Role Boundary:
//    - admin.localhost -> only for Super Admin
//    - <company>.localhost -> only for Company Tenants
// 3. Guards protected routes against unauthenticated requests
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase(); // e.g. "apex.localhost" or "localhost"

  // ── 1. Extract Subdomain ────────────────────────────────────
  let subdomain: string | null = null;

  // 1a. URL Query Parameter override (useful for testing on Vercel without custom domain: ?tenant=apex or ?subdomain=admin)
  const querySub = searchParams.get("tenant") || searchParams.get("subdomain");
  if (querySub) {
    subdomain = querySub.toLowerCase().trim();
  } else if (hostname.endsWith(".localhost")) {
    subdomain = hostname.replace(".localhost", "");
  } else if (hostname.endsWith(".vercel.app")) {
    const parts = hostname.split(".");
    if (parts.length >= 4) {
      // e.g. apex.appname.vercel.app
      subdomain = parts[0];
    } else {
      // Single vercel domain -> read from cookie
      subdomain = request.cookies.get("current_subdomain")?.value || null;
    }
  } else if (hostname.includes(".") && !hostname.startsWith("127.")) {
    // For custom domain (e.g. apex.yourapp.com)
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      subdomain = parts[0];
    } else {
      subdomain = request.cookies.get("current_subdomain")?.value || null;
    }
  } else {
    subdomain = request.cookies.get("current_subdomain")?.value || null;
  }

  // ── 2. Handle Public Routes ─────────────────────────────────
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();
    if (subdomain) {
      response.cookies.set("current_subdomain", subdomain, { path: "/" });
    }
    return response;
  }

  // Root redirect
  if (pathname === "/") {
    const target = subdomain === "admin" ? "/super-admin" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // ── 3. Check Authentication ─────────────────────────────────
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (subdomain) {
      response.cookies.set("current_subdomain", subdomain, { path: "/" });
    }
    return response;
  }

  // ── 4. Role Subdomain Boundary Guard ───────────────────────
  // If on admin subdomain, don't let them browse tenant CRM routes
  if (subdomain === "admin" && (pathname === "/enquiries" || pathname === "/jobs" || pathname === "/contacts" || pathname === "/financials")) {
    return NextResponse.redirect(new URL("/super-admin", request.url));
  }

  // If on tenant subdomain, don't let them browse super-admin console
  if (subdomain && subdomain !== "admin" && pathname.startsWith("/super-admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();
  if (subdomain) {
    response.cookies.set("current_subdomain", subdomain, { path: "/" });
  } else {
    response.cookies.delete("current_subdomain");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
