import type { Metadata } from "next"
import { SalaryDisputeManagementSection } from "@/components/dashboard/admin/salary-dispute-management"

export const metadata: Metadata = { title: "Salary Disputes" }

export default function SalaryDisputesPage() {
  return <SalaryDisputeManagementSection />
}
