import type { Metadata } from "next"
import { ChangeTimeManagementSection } from "@/components/dashboard/admin/change-time-management"

export const metadata: Metadata = { title: "Change Time In/Time Out" }

export default function ChangeTimePage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ChangeTimeManagementSection />
    </div>
  )
}
