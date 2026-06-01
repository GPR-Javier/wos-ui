"use client"

import { useAuthStore } from "@/store/auth-store"
import { OverviewSection as EmployeeOverview } from "@/components/dashboard/employee"
import { OverviewSection as HROverview } from "@/components/dashboard/hr"
import { OverviewSection as AdminOverview } from "@/components/dashboard/admin"
import { OverviewSection as ApplicantOverview } from "@/components/dashboard/applicant"

export function DashboardOverview() {
  const apiRole = useAuthStore((s) => s.apiRole)

  if (apiRole === "ADMIN") return <AdminOverview />
  if (apiRole === "HR") return <HROverview />
  if (apiRole === "APPLICANT") return <ApplicantOverview />
  return <EmployeeOverview />
}
