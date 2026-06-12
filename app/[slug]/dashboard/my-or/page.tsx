import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "OR Requests" }

export default function MyORPage() {
  return (
    <ComingSoon
      title="OR Requests"
      description="File and track your official business requests."
    />
  )
}
