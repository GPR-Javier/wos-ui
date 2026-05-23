import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Change Time In/Time Out" }

export default function MyChangeTimePage() {
  return <ComingSoon title="Change Time In/Time Out" description="File and track your time correction requests." />
}
