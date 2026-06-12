import type { Metadata } from "next"
import { AuditSection } from "@/components/dashboard/admin/audit"

export const metadata: Metadata = { title: "Audit Log" }

export default function AuditPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <AuditSection />
    </div>
  )
}
