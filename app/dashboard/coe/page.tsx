import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "COE Requests" }

export default function CoePage() {
  return <ComingSoon title="COE Requests" description="Review and act on employee certificate of employment requests." />
}
