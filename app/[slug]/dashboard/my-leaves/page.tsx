import type { Metadata } from "next"
import { MyLeavesSection } from "@/components/dashboard/employee/my-leaves"

export const metadata: Metadata = { title: "My Leave" }

export default function MyLeavesPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <MyLeavesSection />
    </div>
  )
}
