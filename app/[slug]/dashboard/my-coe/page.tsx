import type { Metadata } from "next"
import { MyCOESection } from "@/components/dashboard/employee/my-coe"

export const metadata: Metadata = { title: "COE Requests" }

export default function MyCOEPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <MyCOESection />
    </div>
  )
}
