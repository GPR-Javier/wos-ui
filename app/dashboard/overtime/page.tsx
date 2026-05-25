import type { Metadata } from "next"
import { OvertimeManagementSection } from "@/components/dashboard/admin/overtime-management"

export const metadata: Metadata = { title: "Overtime Management" }

export default function OvertimePage() {
  return <OvertimeManagementSection />
}
