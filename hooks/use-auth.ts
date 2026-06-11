"use client"

import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  authApi,
  sessionApi,
  companyApi,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  SessionRolePayload,
} from "@/lib/auth-api"
import { useAuthStore } from "@/store/auth-store"
import { resolveLandingPath } from "@/lib/nav-config"

export const AUTH_KEYS = {
  me: ["auth", "me"] as const,
}

// ── Current user ──────────────────────────────────────────────────────────────

export function useMe() {
  const { apiRole, setUser } = useAuthStore()
  const q = useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: authApi.me,
    enabled: !!apiRole,
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (q.data) setUser(q.data)
  }, [q.data]) // eslint-disable-line react-hooks/exhaustive-deps

  return q
}

// ── Login ─────────────────────────────────────────────────────────────────────

export function useLogin() {
  const qc = useQueryClient()
  const router = useRouter()
  const { setFromAuth } = useAuthStore()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      // 1. Authenticate identity (gpr-auth sets the cookie + returns the user's companies).
      const company = await authApi.login(payload)
      if (company.requiresCompanySelection) {
        return { companySelect: company.companies } // caller shows the company picker
      }
      // 2. Single company (token already scoped) → WorkOS resolves roles + mints the role token.
      return sessionApi.establish()
    },
    onSuccess: (data) => {
      if ("companySelect" in data) return // caller handles company picker
      if (data.requiresRoleSelection) return // caller handles role picker
      const res = data as AuthResponse
      setFromAuth(res) // cookies set by server automatically
      qc.invalidateQueries({ queryKey: AUTH_KEYS.me })
      redirectAfterAuth(res, router)
    },
  })
}

// ── Select company (when requiresCompanySelection: true) ─────────────────────────

export function useSelectCompany() {
  const qc = useQueryClient()
  const router = useRouter()
  const { setFromAuth } = useAuthStore()

  return useMutation({
    mutationFn: async (companyId: number) => {
      await companyApi.select(companyId) // re-mints the identity token with companyId
      return sessionApi.establish() // then resolve WorkOS roles within that company
    },
    onSuccess: (data) => {
      if (data.requiresRoleSelection) return // caller handles role picker
      const res = data as AuthResponse
      setFromAuth(res)
      qc.invalidateQueries({ queryKey: AUTH_KEYS.me })
      redirectAfterAuth(res, router)
    },
  })
}

// ── Switch company (mid-session) ─────────────────────────────────────────────────

export function useSwitchCompany() {
  const qc = useQueryClient()
  const router = useRouter()
  const { setFromAuth } = useAuthStore()

  return useMutation({
    mutationFn: async (companyId: number) => {
      await companyApi.switch(companyId)
      return sessionApi.establish()
    },
    onSuccess: (data) => {
      if (data.requiresRoleSelection) return
      const res = data as AuthResponse
      setFromAuth(res)
      qc.invalidateQueries({ queryKey: AUTH_KEYS.me })
      redirectAfterAuth(res, router)
    },
  })
}

// ── Select role (when requiresRoleSelection: true) ───────────────────────────

export function useSelectRole() {
  const qc = useQueryClient()
  const router = useRouter()
  const { setFromAuth } = useAuthStore()

  return useMutation({
    mutationFn: (payload: SessionRolePayload) => sessionApi.selectRole(payload),
    onSuccess: (res) => {
      setFromAuth(res) // cookies set by server automatically
      qc.invalidateQueries({ queryKey: AUTH_KEYS.me })
      redirectAfterAuth(res, router)
    },
  })
}

// ── Switch role (mid-session) ─────────────────────────────────────────────────

export function useSwitchRole() {
  const qc = useQueryClient()
  const { setFromAuth, setActiveUserRoleId } = useAuthStore()

  return useMutation({
    mutationFn: (payload: SessionRolePayload) => sessionApi.switchRole(payload),
    onSuccess: (res, { userRoleId }) => {
      setFromAuth(res)
      setActiveUserRoleId(userRoleId)
      qc.invalidateQueries({ queryKey: AUTH_KEYS.me })
    },
  })
}

// ── Logout ────────────────────────────────────────────────────────────────────

export function useLogout() {
  const qc = useQueryClient()
  const { clear } = useAuthStore()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clear()
      qc.clear()
      // Hard redirect: unloads the current page immediately so React never
      // re-renders the dashboard with cleared auth state (no flash).
      window.location.replace("/auth/login")
    },
  })
}

// ── Helper ────────────────────────────────────────────────────────────────────

function redirectAfterAuth(
  res: AuthResponse,
  router: ReturnType<typeof useRouter>
) {
  // Honour an explicit post-login destination (e.g. a job a guest tried to open
  // before signing in): /auth/login?redirect=/dashboard/careers/12. Only same-origin
  // absolute paths are allowed — never protocol-relative ("//host") or external URLs.
  if (typeof window !== "undefined") {
    const redirect = new URLSearchParams(window.location.search).get("redirect")
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      router.replace(redirect)
      return
    }
  }

  // Applicants enter the dashboard shell and land on the first page their config
  // (authorities) grants — same sidebar-driven layout as employees. Everyone else
  // lands on the dashboard overview.
  if (res.role?.toUpperCase() === "APPLICANT") {
    router.replace(resolveLandingPath(res.authorities ?? []))
  } else {
    router.replace("/dashboard")
  }
}

// ── Register (creates a company-less Applicant account) ──────────────────────

export function useRegister() {
  const qc = useQueryClient()
  const router = useRouter()
  const { setFromAuth } = useAuthStore()

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      // 1. Create the identity (gpr-auth sets the identity cookie; no company yet).
      await authApi.register(payload)
      // 2. WorkOS resolves the global Applicant role and mints the role-bearing token.
      return sessionApi.establish()
    },
    onSuccess: (data) => {
      if (data.requiresRoleSelection) return // not expected for a fresh applicant
      const res = data as AuthResponse
      setFromAuth(res)
      qc.invalidateQueries({ queryKey: AUTH_KEYS.me })
      redirectAfterAuth(res, router)
    },
  })
}
