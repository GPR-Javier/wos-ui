"use client"

import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  authApi,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  SelectRolePayload,
  SwitchRolePayload,
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
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      if (data.requiresRoleSelection) return // caller handles role picker
      const res = data as AuthResponse
      setFromAuth(res) // cookies set by server automatically
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
    mutationFn: (payload: SelectRolePayload) => authApi.selectRole(payload),
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
    mutationFn: (payload: SwitchRolePayload) => authApi.switchRole(payload),
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

// ── Register (creates Applicant account) ─────────────────────────────────────

export function useRegister() {
  const qc = useQueryClient()
  const router = useRouter()
  const { setFromAuth } = useAuthStore()

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (data) => {
      setFromAuth(data)
      qc.invalidateQueries({ queryKey: AUTH_KEYS.me })
      redirectAfterAuth(data, router)
    },
  })
}
