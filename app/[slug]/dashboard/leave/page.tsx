import type { Metadata } from "next"
import { LeaveSection } from "@/components/dashboard/hr/leave"

export const metadata: Metadata = { title: "Leave Management" }

export default function LeavePage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <LeaveSection />
    </div>
  )
}
