import type { Metadata } from "next"
import { AttendanceSection } from "@/components/dashboard/attendance"

export const metadata: Metadata = { title: "Attendance Logs" }

export default function AttendancePage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <AttendanceSection />
    </div>
  )
}
