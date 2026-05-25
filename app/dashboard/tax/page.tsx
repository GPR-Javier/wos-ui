import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Tax" }

export default function TaxPage() {
  return (
    <ComingSoon
      title="Tax"
      description="Track tax filings, deductions, and compliance records."
    />
  )
}
