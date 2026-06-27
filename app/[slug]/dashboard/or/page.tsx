import type { Metadata } from "next"
import { OrManagement } from "@/components/dashboard/admin/or-management"

export const metadata: Metadata = { title: "Official Receipts" }

export default function OrPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <OrManagement />
    </div>
  )
}
