"use client"

import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  UserCircleIcon,
  CheckListIcon,
  Calendar01Icon,
  Clock01Icon,
  Audit01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/custom/status-badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { OverviewTab } from "./overview-tab"
import { AttendanceTab } from "./attendance-tab"
import { LeaveTab } from "./leave-tab"
import { ScheduleTab } from "./schedule-tab"
import { PerformanceTab } from "./performance-tab"
import { PolicyTab } from "./policy-tab"
import { employees } from "@/lib/mock-data"
import { useAuthStore } from "@/store/auth-store"

interface Props {
  employeeId: string
}

export function EmployeeDetailView({ employeeId }: Props) {
  const router = useRouter()
  const canViewSchedulePolicy = useAuthStore((s) =>
    s.authorities.includes("SCHEDULE_POLICY:VIEW")
  )

  const emp =
    employees.find(
      (e) => e.employeeId === employeeId || String(e.id) === employeeId
    ) ?? employees[0]

  // The policy resolver hits the real backend by numeric user id. The URL param
  // may be either a numeric id or a string employee code (e.g. "EMP-001"); fall
  // back to the mock record's id when the URL isn't numeric.
  const fromUrl = Number(employeeId)
  const fromMock = Number(emp.id)
  const policyUserId = Number.isFinite(fromUrl)
    ? fromUrl
    : Number.isFinite(fromMock)
      ? fromMock
      : 0

  const statusVariant =
    emp.status === "active"
      ? "green"
      : emp.status === "on-leave"
        ? "amber"
        : "gray"

  const statusLabel =
    emp.status === "on-leave"
      ? "On leave"
      : emp.status.charAt(0).toUpperCase() + emp.status.slice(1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => router.back()}
          className="mt-0.5 shrink-0"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
        </Button>
        <div className="flex flex-1 items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {emp.initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold">{emp.name}</h1>
              <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>
            </div>
            <p className="text-[13px] text-muted-foreground">
              {emp.position} · {emp.department} · {emp.employeeId}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">
            <HugeiconsIcon
              icon={UserCircleIcon}
              size={14}
              strokeWidth={2}
              className="mr-1.5"
            />
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <HugeiconsIcon
              icon={CheckListIcon}
              size={14}
              strokeWidth={2}
              className="mr-1.5"
            />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave">
            <HugeiconsIcon
              icon={Calendar01Icon}
              size={14}
              strokeWidth={2}
              className="mr-1.5"
            />
            Leave
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <HugeiconsIcon
              icon={Clock01Icon}
              size={14}
              strokeWidth={2}
              className="mr-1.5"
            />
            Schedule
          </TabsTrigger>
          {canViewSchedulePolicy && (
            <TabsTrigger value="policy">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={14}
                strokeWidth={2}
                className="mr-1.5"
              />
              Schedule policy
            </TabsTrigger>
          )}
          <TabsTrigger value="performance">
            <HugeiconsIcon
              icon={Audit01Icon}
              size={14}
              strokeWidth={2}
              className="mr-1.5"
            />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab employee={emp} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab />
        </TabsContent>
        <TabsContent value="leave" className="mt-4">
          <LeaveTab employee={emp} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <ScheduleTab />
        </TabsContent>
        {canViewSchedulePolicy && (
          <TabsContent value="policy" className="mt-4">
            <PolicyTab employeeId={policyUserId} employeeName={emp.name} />
          </TabsContent>
        )}
        <TabsContent value="performance" className="mt-4">
          <PerformanceTab employee={emp} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
