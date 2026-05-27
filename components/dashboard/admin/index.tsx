"use client"

import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  Calendar01Icon,
  Alert01Icon,
  UserCircleIcon,
  BarChartIcon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useHrStats, useLeaveRequests, useApproveLeave, useRejectLeave } from "@/hooks/use-hr"
import { useTeamAttendance } from "@/hooks/use-admin-attendance"
import { PayrollSchedule, DEFAULT_PAYROLL_CONFIG } from "@/components/dashboard/payroll/payroll-schedule"

const today = new Date().toISOString().split("T")[0]!

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MOCK_ATTENDANCE_TREND = [88, 92, 85, 90, 78, 94, 91]
const MOCK_LATE_TREND = [4, 6, 3, 8, 5, 2, 4]
const MOCK_OT_TREND = [12, 8, 15, 10, 18, 14, 11]
const MOCK_DEPT = [
  { name: "Engineering", pct: 94 },
  { name: "Design", pct: 88 },
  { name: "Sales", pct: 91 },
  { name: "People Ops", pct: 85 },
  { name: "Finance", pct: 97 },
]
const ALERTS = [
  { text: "3 employees missing timeout logs today", level: "warn" as const },
  { text: "Payroll cutoff in 2 days — 5 disputes unresolved", level: "crit" as const },
  { text: "2 active HR disputes pending action", level: "warn" as const },
  { text: "Policy violation flagged — 4 tardiness incidents this week", level: "crit" as const },
]

const STATUS_VARIANT: Record<string, "green" | "amber" | "red" | "blue" | "gray" | "purple"> = {
  present: "green",
  late: "amber",
  absent: "red",
  leave: "blue",
  overtime: "purple",
  undertime: "red",
  restday: "gray",
  holiday: "gray",
}

function Sparkline({ data, color = "bg-primary" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-sm", color)}
          style={{ height: `${Math.max((v / max) * 100, 5)}%`, opacity: 0.7 + (i / data.length) * 0.3 }}
        />
      ))}
    </div>
  )
}

function ini(first: string, last: string) {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase()
}

export function OverviewSection() {
  const hrStatsQ = useHrStats()
  const attendanceQ = useTeamAttendance({ date: today })
  const pendingQ = useLeaveRequests({ status: "pending", size: 8 })
  const approve = useApproveLeave()
  const reject = useRejectLeave()

  const hrStats = hrStatsQ.data
  const team = attendanceQ.data?.content ?? []
  const pending = pendingQ.data?.content ?? []

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Workforce Management
          </p>
          <h1 className="mt-0.5 text-[20px] font-bold leading-tight text-foreground">
            Manage the workforce.
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Real-time visibility into attendance, requests, and team performance.
          </p>
        </div>
        <p className="shrink-0 text-[12px] text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="text-[12px]">
            <HugeiconsIcon icon={DashboardSquare01Icon} size={13} strokeWidth={1.8} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-[12px]">
            <HugeiconsIcon icon={BarChartIcon} size={13} strokeWidth={1.8} />
            Schedule & Forecast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-5">
          <PayrollSchedule config={DEFAULT_PAYROLL_CONFIG} />
        </TabsContent>

        <TabsContent value="overview" className="mt-5">
        <div className="space-y-6">

      {/* ── 1. Workforce KPIs ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Present Today"
          value={hrStats ? String(hrStats.presentToday) : "—"}
          meta={hrStats ? `${hrStats.attendanceRate}% attendance rate` : "Workforce active"}
          accent="green"
          icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Late Employees"
          value={hrStats ? String(hrStats.lateToday) : "—"}
          meta="Attendance issues"
          accent="amber"
          icon={<HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="On Leave"
          value={hrStats ? String(hrStats.onLeave) : "—"}
          meta={hrStats ? `${hrStats.approvedLeave} approved · ${hrStats.pendingLeave} pending` : "Leave visibility"}
          accent="blue"
          icon={<HugeiconsIcon icon={Calendar01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Pending Requests"
          value={hrStats ? String(hrStats.pendingRequests) : "—"}
          meta={hrStats ? `${hrStats.leaveRequests} leave · ${hrStats.dtrRequests} DTR` : "Needs approval"}
          accent="red"
          icon={<HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="OT Hours Today"
          value={
            hrStats
              ? hrStats.otHoursToday > 0
                ? `${hrStats.otHoursToday.toFixed(1)}h`
                : "0h"
              : "—"
          }
          meta="Overtime monitoring"
          accent={hrStats && hrStats.otHoursToday > 0 ? "amber" : "green"}
          icon={<HugeiconsIcon icon={UserCircleIcon} size={16} strokeWidth={1.8} />}
        />
      </div>

      {/* ── 2. Live Feed + Pending Approvals ─────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Live Attendance Feed */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-green-500" />
              <p className="text-[13px] font-semibold">Live Attendance Feed</p>
            </div>
            <StatusBadge variant="green">{team.length} logged</StatusBadge>
          </div>
          <div className="max-h-72 divide-y divide-border overflow-y-auto">
            {attendanceQ.isLoading
              ? [0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Skeleton className="size-7 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))
              : team.length === 0
                ? <p className="py-8 text-center text-[12px] text-muted-foreground">No records for today.</p>
                : team.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {ini(r.firstName, r.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium">{r.firstName} {r.lastName}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{r.timeIn ?? "—"}</p>
                      </div>
                      <StatusBadge variant={STATUS_VARIANT[r.status] ?? "gray"} className="shrink-0 text-[10px]">
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </StatusBadge>
                    </div>
                  ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[13px] font-semibold">Pending Approvals</p>
            {pending.length > 0 && <StatusBadge variant="amber">{pending.length} pending</StatusBadge>}
          </div>
          <div className="max-h-72 divide-y divide-border overflow-y-auto">
            {pendingQ.isLoading
              ? [0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="size-7 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-40" />
                    </div>
                    <div className="flex gap-1">
                      <Skeleton className="h-6 w-14 rounded" />
                      <Skeleton className="h-6 w-14 rounded" />
                    </div>
                  </div>
                ))
              : pending.length === 0
                ? <p className="py-8 text-center text-[12px] text-muted-foreground">No pending approvals.</p>
                : pending.map((r) => {
                    const av = r.employeeName.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase()
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{av}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium">{r.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground">{r.leaveType} · {r.days}d · {r.startDate}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-6 border-green-300 px-2 text-[11px] text-green-600 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate(r.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-6 border-red-200 px-2 text-[11px] text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                            disabled={reject.isPending}
                            onClick={() => reject.mutate(r.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    )
                  })}
          </div>
        </div>
      </div>

      {/* ── 3. Schedule & Workforce ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Today's Shifts */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Today's Shifts
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Day Shift", count: team.filter((r) => r.shift === "day").length, dot: "bg-amber-500" },
              { label: "Graveyard", count: team.filter((r) => r.shift === "graveyard").length, dot: "bg-indigo-500" },
              { label: "Present", count: team.filter((r) => r.status === "present").length, dot: "bg-green-500" },
              { label: "On Leave", count: team.filter((r) => r.status === "leave").length, dot: "bg-blue-500" },
              { label: "Absent", count: team.filter((r) => r.status === "absent").length, dot: "bg-red-500" },
            ].map(({ label, count, dot }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={cn("size-2 shrink-0 rounded-full", dot)} />
                <span className="flex-1 text-[12px] text-muted-foreground">{label}</span>
                <span className="text-[13px] font-semibold tabular-nums text-foreground">
                  {attendanceQ.isLoading ? "—" : count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Leaves */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming Leaves
          </p>
          <div className="space-y-2.5">
            {pendingQ.isLoading
              ? [0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-6 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              : pending.length === 0
                ? <p className="text-[12px] text-muted-foreground">No upcoming leaves.</p>
                : pending.slice(0, 5).map((r) => {
                    const av = r.employeeName.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase()
                    return (
                      <div key={r.id} className="flex items-center gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {av}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium">{r.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground">{r.startDate} · {r.days}d</p>
                        </div>
                        <StatusBadge variant="amber" className="shrink-0 text-[10px]">{r.leaveType}</StatusBadge>
                      </div>
                    )
                  })}
          </div>
        </div>
      </div>

      {/* ── 4. Analytics ─────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Analytics</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Attendance Trends */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground">Attendance Trends</p>
            <p className="mb-3 text-[11px] text-muted-foreground">Last 7 days (%)</p>
            <Sparkline data={MOCK_ATTENDANCE_TREND} color="bg-green-500" />
            <div className="mt-2 flex justify-between">
              {DAYS.map((d) => <span key={d} className="text-[9px] text-muted-foreground">{d}</span>)}
            </div>
          </div>

          {/* Late Trends */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground">Late Trends</p>
            <p className="mb-3 text-[11px] text-muted-foreground">Last 7 days (count)</p>
            <Sparkline data={MOCK_LATE_TREND} color="bg-amber-500" />
            <div className="mt-2 flex justify-between">
              {DAYS.map((d) => <span key={d} className="text-[9px] text-muted-foreground">{d}</span>)}
            </div>
          </div>

          {/* OT Trends */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground">OT Trends</p>
            <p className="mb-3 text-[11px] text-muted-foreground">Last 7 days (hrs)</p>
            <Sparkline data={MOCK_OT_TREND} color="bg-purple-500" />
            <div className="mt-2 flex justify-between">
              {DAYS.map((d) => <span key={d} className="text-[9px] text-muted-foreground">{d}</span>)}
            </div>
          </div>

          {/* Department Comparison */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground">Department Comparison</p>
            <p className="mb-3 text-[11px] text-muted-foreground">Attendance rate</p>
            <div className="space-y-2">
              {MOCK_DEPT.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[10px] text-muted-foreground">{d.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-7 shrink-0 text-right text-[10px] font-medium tabular-nums">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Notifications & Alerts ────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Notifications & Alerts
        </p>
        <div className="space-y-2">
          {ALERTS.map((a, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                a.level === "crit"
                  ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10"
              )}
            >
              <HugeiconsIcon
                icon={Alert01Icon}
                size={14}
                strokeWidth={2}
                className={cn("mt-0.5 shrink-0", a.level === "crit" ? "text-red-500" : "text-amber-500")}
              />
              <p className={cn("text-[12px]", a.level === "crit" ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300")}>
                {a.text}
              </p>
            </div>
          ))}
        </div>
      </div>

        </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}
