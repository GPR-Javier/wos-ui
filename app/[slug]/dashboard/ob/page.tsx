import type { Metadata } from "next"
import { ObManagementSection } from "@/components/dashboard/admin/ob-management"

export const metadata: Metadata = { title: "Official Business" }

export default function ObPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ObManagementSection />
    </div>
  )
}
