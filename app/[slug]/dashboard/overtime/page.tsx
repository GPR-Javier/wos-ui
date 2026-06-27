import type { Metadata } from "next"
import { OvertimeManagementSection } from "@/components/dashboard/admin/overtime-management"

export const metadata: Metadata = { title: "Overtime Management" }

export default function OvertimePage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <OvertimeManagementSection />
    </div>
  )
}
