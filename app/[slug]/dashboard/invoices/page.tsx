import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Invoices" }

export default function InvoicesPage() {
  return (
    <ComingSoon
      title="Invoices"
      description="Create, track, and manage company invoices."
    />
  )
}
