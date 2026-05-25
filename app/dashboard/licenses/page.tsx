import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Licenses" }

export default function LicensesPage() {
  return (
    <ComingSoon
      title="Licenses"
      description="Track business licenses, renewals, and expiry dates."
    />
  )
}
