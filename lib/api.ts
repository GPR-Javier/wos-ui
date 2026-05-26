import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

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

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    if (original.url?.includes("/refresh")) {
      if (typeof window !== "undefined") window.location.href = "/auth/login"
      return Promise.reject(err)
    }

    original._retry = true

    try {
      if (!refreshing) {
        refreshing = api
          .post("/auth/refresh")
          .then(() => {})
          .finally(() => { refreshing = null })
      }
      await refreshing
      return api(original)
    } catch {
      if (typeof window !== "undefined") window.location.href = "/auth/login"
      return Promise.reject(err)
    }
  }
)
