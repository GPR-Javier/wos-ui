import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Government Documents" }

export default function GovernmentDocsPage() {
  return (
    <ComingSoon
      title="Government Documents"
      description="Store and manage government-required documents and submissions."
    />
  )
}
