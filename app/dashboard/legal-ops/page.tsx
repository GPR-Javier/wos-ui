import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Legal Operations" }

export default function LegalOpsPage() {
  return (
    <ComingSoon
      title="Legal Operations"
      description="Oversee legal matters, compliance actions, and corporate documentation."
    />
  )
}
