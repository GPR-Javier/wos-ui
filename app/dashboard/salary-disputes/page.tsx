import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Salary Disputes" }

export default function SalaryDisputesPage() {
  return <ComingSoon title="Salary Disputes" description="Review and resolve employee salary dispute requests." />
}
