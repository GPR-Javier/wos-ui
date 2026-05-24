import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Business Trip" }

export default function BusinessTripPage() {
  return <ComingSoon title="Business Trip" description="Review and approve business travel requests." />
}
