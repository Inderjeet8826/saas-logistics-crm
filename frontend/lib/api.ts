// ============================================================
// API CLIENT — Ye file sabse important hai!
//
// Yahan hum ek "smart" axios instance banate hain jo:
// 1. Har request mein automatically access token lagate hai
// 2. Agar token expire ho jaye → refresh token se naya token le lata hai
// 3. Agar refresh bhi fail ho → user ko login pe bhej deta hai
//
// Ye INTERCEPTORS ki wajah se hota hai — jaise ek security guard
// jo har request check karta hai aane-jaane se pehle
// ============================================================

import axios from "axios";
import Cookies from "js-cookie";

// Backend ka base URL
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Access token SIRF memory mein store hoga (XSS safe) ──────
// localStorage mein nahi — wahan JavaScript access kar sakta hai
// aur hackers bhi!
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// ── Refresh token httpOnly cookie mein store hoga ─────────────
// (Backend set karega — JavaScript access nahi kar sakta)
// Yahan hum sirf regular cookie use kar rahe hain dev ke liye
// Production mein backend httpOnly set karega
export const setRefreshToken = (token: string) => {
  Cookies.set("refresh_token", token, {
    expires: 7,        // 7 din
    sameSite: "strict", // CSRF protection
    // secure: true    // Production mein uncomment karo (HTTPS only)
  });
};

export const getRefreshToken = () => Cookies.get("refresh_token");

export const clearTokens = () => {
  accessToken = null;
  Cookies.remove("refresh_token");
};

// ── Main Axios Instance ───────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── REQUEST INTERCEPTOR ───────────────────────────────────────
// Har request jaane se PEHLE yahan aati hai
// Hum yahan access token automatically attach karte hain
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const subdomain = Cookies.get("current_subdomain");
    if (subdomain) {
      config.headers["X-Tenant-Subdomain"] = subdomain;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────
// Har response aane ke BAAD yahan se guzarta hai
// Agar 401 (Unauthorized) mile → refresh token se naya access token lo
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  // Success: seedha return kar do
  (response) => response,

  // Error: 401 check karo
  async (error) => {
    const originalRequest = error.config;

    // Agar 401 aaya aur ye retry nahi hai
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Agar already refresh ho raha hai → queue mein dalo
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        // Refresh token nahi hai → logout
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Naya access token lo
        const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        setAccessToken(access_token);
        setRefreshToken(refresh_token);

        processQueue(null, access_token);

        // Original request retry karo naye token ke saath
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh fail → logout
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
