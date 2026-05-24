import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Official Receipts" }

export default function ReceiptsPage() {
  return <ComingSoon title="Official Receipts" description="Manage and process official receipt submissions." />
}
