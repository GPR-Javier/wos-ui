import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Contracts" }

export default function ContractsPage() {
  return <ComingSoon title="Contracts" description="Manage employment and business contract documents." />
}
