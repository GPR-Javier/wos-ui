import type { Metadata } from "next"
import { MySalaryDisputeSection } from "@/components/dashboard/employee/my-salary-dispute"

export const metadata: Metadata = { title: "Salary Dispute" }

export default function MySalaryDisputePage() {
  return <MySalaryDisputeSection />
}
