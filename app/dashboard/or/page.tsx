import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "OR Requests" }

export default function OrPage() {
  return <ComingSoon title="OR Requests" description="Review and act on employee official business requests." />
}
