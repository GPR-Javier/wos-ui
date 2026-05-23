import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Overtime" }

export default function OvertimePage() {
  return <ComingSoon title="Overtime" description="Review and act on employee overtime requests." />
}
