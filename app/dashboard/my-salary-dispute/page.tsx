import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Salary Dispute" }

export default function MySalaryDisputePage() {
  return <ComingSoon title="Salary Dispute" description="File and track your salary dispute requests." />
}
