import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthResponse, AvailableRole, MeResponse } from "@/lib/auth-api"
import type { Role } from "@/lib/types"

// Maps API role string → sidebar/dashboard role key
function toDashboardRole(apiRole: string): Role {
  const r = apiRole.toUpperCase()
  if (r === "ADMIN") return "admin"
  if (r === "HR") return "hr"
  return "employee"
}

interface AuthState {
  // Populated after login
  user: MeResponse | null
  apiRole: string | null // "EMPLOYEE" | "ADMIN" | "HR" (from API)
  dashboardRole: Role // mapped to sidebar key
  userRoleNames: string[] // e.g. ["HR Manager"]
  authorities: string[] // e.g. ["DTR:VIEW"]
  availableRoles: AvailableRole[] // all roles the user can switch to
  activeUserRoleId: number | null // currently active role id

  // Actions
  setFromAuth: (res: AuthResponse) => void
  setUser: (user: MeResponse) => void
  setAvailableRoles: (roles: AvailableRole[], activeId: number) => void
  setActiveUserRoleId: (id: number) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      apiRole: null,
      dashboardRole: "employee",
      userRoleNames: [],
      authorities: [],
      availableRoles: [],
      activeUserRoleId: null,

      setFromAuth: (res) =>
        set({
          apiRole: res.role,
          dashboardRole: toDashboardRole(res.role),
          userRoleNames: res.userRoleNames,
          authorities: res.authorities,
        }),

      // Also refreshes the authorities cache so permission changes (toggled via
      // Roles & Permissions) propagate without requiring a fresh login.
      setUser: (user) => set({ user, authorities: user.authorities }),

      setAvailableRoles: (roles, activeId) =>
        set({ availableRoles: roles, activeUserRoleId: activeId }),

      setActiveUserRoleId: (id) => set({ activeUserRoleId: id }),

      clear: () =>
        set({
          user: null,
          apiRole: null,
          dashboardRole: "employee",
          userRoleNames: [],
          authorities: [],
          availableRoles: [],
          activeUserRoleId: null,
        }),
    }),
    {
      name: "wos_auth",
      // Only persist role metadata — tokens live in HttpOnly cookies managed by the server.
      // `authorities` is intentionally NOT persisted so a stale list never bleeds across permission
      // changes; it's re-hydrated on mount from /auth/me via useMe().
      partialize: (s) => ({
        apiRole: s.apiRole,
        dashboardRole: s.dashboardRole,
        userRoleNames: s.userRoleNames,
        user: s.user,
        availableRoles: s.availableRoles,
        activeUserRoleId: s.activeUserRoleId,
      }),
      // After hydration, seed `authorities` from the persisted user object until the next /me fires.
      // Avoids the brief flash where role-gated nav items are missing on page load.
      onRehydrateStorage: () => (state) => {
        if (state?.user?.authorities) {
          state.authorities = state.user.authorities
        }
      },
    }
  )
)
