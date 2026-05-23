"use client"

import { AdminAttendance } from "./admin-attendance"

export function AttendanceSection() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Attendance</h1>
        <p className="text-[13px] text-muted-foreground">
          Monitor team attendance records, shifts, and punctuality.
        </p>
      </div>
      <AdminAttendance />
    </div>
  )
}
