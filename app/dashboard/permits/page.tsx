import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Permits" }

export default function PermitsPage() {
  return <ComingSoon title="Permits" description="Manage government and company permit documents." />
}
