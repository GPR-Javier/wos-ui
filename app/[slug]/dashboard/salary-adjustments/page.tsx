import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Salary Adjustments" }

export default function SalaryAdjustmentsPage() {
  return (
    <ComingSoon
      title="Salary Adjustments"
      description="Review and process employee salary adjustments and corrections."
    />
  )
}
