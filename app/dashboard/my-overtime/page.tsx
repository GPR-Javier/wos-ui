import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Overtime" }

export default function MyOvertimePage() {
  return <ComingSoon title="Overtime" description="View and file your overtime requests." />
}
