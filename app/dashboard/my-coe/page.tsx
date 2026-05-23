import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "COE Requests" }

export default function MyCOEPage() {
  return <ComingSoon title="COE Requests" description="Request and track your certificates of employment." />
}
