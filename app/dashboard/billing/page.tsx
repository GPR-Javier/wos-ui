import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Billing" }

export default function BillingPage() {
  return (
    <ComingSoon
      title="Billing"
      description="Manage billing records and payment schedules."
    />
  )
}
