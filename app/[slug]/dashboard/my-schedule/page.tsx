import type { Metadata } from "next"
import { MyScheduleSection } from "@/components/dashboard/employee/my-schedule"

export const metadata: Metadata = { title: "Change Schedule" }

export default function MySchedulePage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <MyScheduleSection />
    </div>
  )
}
