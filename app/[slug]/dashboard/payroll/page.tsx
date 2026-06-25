"use client"

import { useAuthStore } from "@/store/auth-store"
import { AdminPayrollSection } from "@/components/dashboard/payroll"
import { PayrollSection } from "@/components/dashboard/employee/payroll"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export default function PayrollPage() {
  const apiRole = useAuthStore((s) => s.apiRole)
  const canManagePayroll = apiRole?.toUpperCase() === "ADMIN"

  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ScreenOnboarding screenKey="payroll" />
      {canManagePayroll ? <AdminPayrollSection /> : <PayrollSection />}
    </div>
  )
}
