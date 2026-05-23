import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Schedule Change Request" }

export default function MySchedulePage() {
  return <ComingSoon title="Schedule Change Request" description="File and track your schedule change requests." />
}
