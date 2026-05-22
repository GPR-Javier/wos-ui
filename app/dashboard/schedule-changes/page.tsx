import type { Metadata } from "next"
import { ChangeRequestQueueSection } from "@/components/dashboard/admin/change-request-queue"

export const metadata: Metadata = { title: "Schedule Change Requests" }

export default function ScheduleChangesPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ChangeRequestQueueSection />
    </div>
  )
}
