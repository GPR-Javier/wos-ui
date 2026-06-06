import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { toastApiError } from "./api-error"

declare module "axios" {
  interface AxiosRequestConfig {
    /** Set true to suppress the global backend-error toast for this request (degrades gracefully). */
    skipErrorToast?: boolean
  }
}

/** No-auth instance for public endpoints — never redirects on 401. */
export const publicApi = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
})

// Single axios instance — one interceptor, shared across all services.
// The service prefix in the URL path drives Next.js proxy routing:
//   /api/auth/*      →  wos-auth    (port 8081)
//   /api/hr/*        →  wos-hr      (port 8083)
//   /api/payroll/*   →  wos-payroll (port 8082)
//   /api/analytics/* →  wos-analytics
export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
  withCredentials: true,
})

let refreshing: Promise<void> | null = null

// Endpoints whose own 401 means "bad credentials / not logged in", NOT "session expired".
// These must never trigger the refresh-and-redirect flow (which hard-reloads the page).
const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/login/select-role",
  "/auth/register",
  "/auth/refresh",
]

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean
          skipErrorToast?: boolean
        })
      | undefined
    const status = err.response?.status
    const isAuthEndpoint =
      !!original?.url && AUTH_ENDPOINTS.some((p) => original.url!.includes(p))

    // 401 → try a one-time refresh, then redirect to login. Auth endpoints handle their own 401s
    // inline (e.g. "invalid credentials"), so never refresh/redirect for those.
    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        if (!refreshing) {
          refreshing = api
            .post("/auth/refresh")
            .then(() => {})
            .finally(() => {
              refreshing = null
            })
        }
        await refreshing
        return api(original)
      } catch {
        if (typeof window !== "undefined") window.location.href = "/auth/login"
        return Promise.reject(err)
      }
    }

    // Globalized backend-error toast. Skipped for: 401s (handled above / redirect), auth endpoints
    // (inline errors), and any request that opts out via `skipErrorToast` (graceful fallbacks).
    if (status !== 401 && !isAuthEndpoint && !original?.skipErrorToast) {
      toastApiError(err)
    }
    return Promise.reject(err)
  }
)
