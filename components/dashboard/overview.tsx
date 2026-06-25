"use client"

import { useAuthStore } from "@/store/auth-store"
import { OverviewSection as EmployeeOverview } from "@/components/dashboard/employee"
import { OverviewSection as AdminOverview } from "@/components/dashboard/admin"
import { OverviewSection as ApplicantOverview } from "@/components/dashboard/applicant"

/**
 * Picks the dashboard archetype for the active session. Only two management/self-service archetypes
 * exist — Admin and Employee — plus the Applicant portal; there is no separate HR overview. The coarse
 * apiRole drives the choice today; this is the seam to make it config/authority-based later.
 */
export function DashboardOverview() {
  const apiRole = useAuthStore((s) => s.apiRole)

  if (apiRole === "ADMIN") return <AdminOverview />
  if (apiRole === "APPLICANT") return <ApplicantOverview />
  return <EmployeeOverview />
}
