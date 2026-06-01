import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

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
    const original = err.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    // Let the caller handle 401s from auth endpoints (e.g. show "invalid credentials").
    // Never refresh or hard-redirect — that would wipe the login form.
    if (
      original.url &&
      AUTH_ENDPOINTS.some((path) => original.url!.includes(path))
    ) {
      return Promise.reject(err)
    }

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
)
