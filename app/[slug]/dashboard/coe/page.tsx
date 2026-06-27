import type { Metadata } from "next"
import { CoeManagementSection } from "@/components/dashboard/admin/coe-management"

export const metadata: Metadata = { title: "COE Requests" }

export default function CoePage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <CoeManagementSection />
    </div>
  )
}
