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
import {
  useHrStats,
  useHrTrends,
  useLeaveRequests,
  useApproveLeave,
  useRejectLeave,
} from "@/hooks/use-hr"
import { useTeamAttendance } from "@/hooks/use-admin-attendance"
import {
  PayrollSchedule,
  DEFAULT_PAYROLL_CONFIG,
} from "@/components/dashboard/payroll/payroll-schedule"

const today = new Date().toISOString().split("T")[0]!

const STATUS_VARIANT: Record<
  string,
  "green" | "amber" | "red" | "blue" | "gray" | "purple"
> = {
  present: "green",
  late: "amber",
  absent: "red",
  leave: "blue",
  overtime: "purple",
  undertime: "red",
  restday: "gray",
  holiday: "gray",
}

function Sparkline({
  data,
  color = "bg-primary",
}: {
  data: number[]
  color?: string
}) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex h-10 items-end gap-0.5">
      {data.map((v, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-sm", color)}
          style={{
            height: `${Math.max((v / max) * 100, 5)}%`,
            opacity: 0.7 + (i / data.length) * 0.3,
          }}
        />
      ))}
    </div>
  )
}

function ini(first: string, last: string) {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase()
}

/** A single analytics card: title, sparkline, and per-day labels (real trend series). */
function TrendCard({
  title,
  subtitle,
  data,
  days,
  color,
  loading,
}: {
  title: string
  subtitle: string
  data: number[]
  days: string[]
  color: string
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[12px] font-semibold text-foreground">{title}</p>
      <p className="mb-3 text-[11px] text-muted-foreground">{subtitle}</p>
      {loading ? (
        <Skeleton className="h-10 w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-10 items-center text-[11px] text-muted-foreground">
          No data yet
        </div>
      ) : (
        <>
          <Sparkline data={data} color={color} />
          <div className="mt-2 flex justify-between">
            {days.map((d, i) => (
              <span key={i} className="text-[9px] text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function OverviewSection() {
  const hrStatsQ = useHrStats()
  const trendsQ = useHrTrends(7)
  const attendanceQ = useTeamAttendance({ date: today })
  const pendingQ = useLeaveRequests({ status: "pending", size: 8 })
  const approve = useApproveLeave()
  const reject = useRejectLeave()

  const hrStats = hrStatsQ.data
  const team = attendanceQ.data?.content ?? []
  const pending = pendingQ.data?.content ?? []

  // ── Real 7-day trend series (company-scoped) ──────────────────────────────
  const trend = trendsQ.data ?? []
  const trendDays = trend.map((t) => t.day)
  const attendanceTrend = trend.map((t) => t.attendancePct)
  const lateTrend = trend.map((t) => t.lateCount)
  const otTrend = trend.map((t) => t.otHours)
  const avgAttendance = trend.length
    ? Math.round(attendanceTrend.reduce((a, b) => a + b, 0) / trend.length)
    : 0
  const totalLate = lateTrend.reduce((a, b) => a + b, 0)
  const totalOt = Math.round(otTrend.reduce((a, b) => a + b, 0) * 10) / 10

  // ── Alerts derived from live data (replaces the old static list) ──────────
  const absentToday = team.filter((r) => r.status === "absent").length
  const openSessions = team.filter((r) => r.timeIn && !r.timeOut).length
  const alerts: { text: string; level: "warn" | "crit" }[] = []
  if (hrStats && hrStats.lateToday > 0)
    alerts.push({
      text: `${hrStats.lateToday} late arrival${hrStats.lateToday > 1 ? "s" : ""} today`,
      level: hrStats.lateToday >= 5 ? "crit" : "warn",
    })
  if (absentToday > 0)
    alerts.push({
      text: `${absentToday} employee${absentToday > 1 ? "s" : ""} marked absent today`,
      level: absentToday >= 5 ? "crit" : "warn",
    })
  if (hrStats && hrStats.pendingRequests > 0)
    alerts.push({
      text: `${hrStats.pendingRequests} request${hrStats.pendingRequests > 1 ? "s" : ""} awaiting approval (${hrStats.leaveRequests} leave · ${hrStats.dtrRequests} DTR)`,
      level: "warn",
    })
  if (openSessions > 0)
    alerts.push({
      text: `${openSessions} employee${openSessions > 1 ? "s" : ""} still clocked in / missing time-out`,
      level: "warn",
    })

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Workforce Management
          </p>
          <h1 className="mt-0.5 text-[20px] leading-tight font-bold text-foreground">
            Manage the workforce.
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Real-time visibility into attendance, requests, and team
            performance.
          </p>
        </div>
        <p className="shrink-0 text-[12px] text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="text-[12px]">
            <HugeiconsIcon
              icon={DashboardSquare01Icon}
              size={13}
              strokeWidth={1.8}
            />
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
                meta={
                  hrStats
                    ? `${hrStats.attendanceRate}% attendance rate`
                    : "Workforce active"
                }
                accent="green"
                icon={
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={16}
                    strokeWidth={1.8}
                  />
                }
              />
              <StatCard
                title="Late Employees"
                value={hrStats ? String(hrStats.lateToday) : "—"}
                meta="Attendance issues"
                accent="amber"
                icon={
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    size={16}
                    strokeWidth={1.8}
                  />
                }
              />
              <StatCard
                title="On Leave"
                value={hrStats ? String(hrStats.onLeave) : "—"}
                meta={
                  hrStats
                    ? `${hrStats.approvedLeave} approved · ${hrStats.pendingLeave} pending`
                    : "Leave visibility"
                }
                accent="blue"
                icon={
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    size={16}
                    strokeWidth={1.8}
                  />
                }
              />
              <StatCard
                title="Pending Requests"
                value={hrStats ? String(hrStats.pendingRequests) : "—"}
                meta={
                  hrStats
                    ? `${hrStats.leaveRequests} leave · ${hrStats.dtrRequests} DTR`
                    : "Needs approval"
                }
                accent="red"
                icon={
                  <HugeiconsIcon
                    icon={Alert01Icon}
                    size={16}
                    strokeWidth={1.8}
                  />
                }
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
                icon={
                  <HugeiconsIcon
                    icon={UserCircleIcon}
                    size={16}
                    strokeWidth={1.8}
                  />
                }
              />
            </div>

            {/* ── 2. Live Feed + Pending Approvals ─────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Live Attendance Feed */}
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 animate-pulse rounded-full bg-green-500" />
                    <p className="text-[13px] font-semibold">
                      Live Attendance Feed
                    </p>
                  </div>
                  <StatusBadge variant="green">
                    {team.length} logged
                  </StatusBadge>
                </div>
                <div className="max-h-72 divide-y divide-border overflow-y-auto">
                  {attendanceQ.isLoading ? (
                    [0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <Skeleton className="size-7 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-2.5 w-16" />
                        </div>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                    ))
                  ) : team.length === 0 ? (
                    <p className="py-8 text-center text-[12px] text-muted-foreground">
                      No records for today.
                    </p>
                  ) : (
                    team.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {ini(r.firstName, r.lastName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium">
                            {r.firstName} {r.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {r.timeIn ?? "—"}
                          </p>
                        </div>
                        <StatusBadge
                          variant={STATUS_VARIANT[r.status] ?? "gray"}
                          className="shrink-0 text-[10px]"
                        >
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </StatusBadge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-[13px] font-semibold">Pending Approvals</p>
                  {pending.length > 0 && (
                    <StatusBadge variant="amber">
                      {pending.length} pending
                    </StatusBadge>
                  )}
                </div>
                <div className="max-h-72 divide-y divide-border overflow-y-auto">
                  {pendingQ.isLoading ? (
                    [0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3"
                      >
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
                  ) : pending.length === 0 ? (
                    <p className="py-8 text-center text-[12px] text-muted-foreground">
                      No pending approvals.
                    </p>
                  ) : (
                    pending.map((r) => {
                      const av = r.employeeName
                        .split(" ")
                        .map((n) => n[0] ?? "")
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {av}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium">
                              {r.employeeName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {r.leaveType} · {r.days}d · {r.startDate}
                            </p>
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
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── 3. Schedule & Workforce ───────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Today's Shifts */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Today's Shifts
                </p>
                <div className="space-y-2.5">
                  {[
                    {
                      label: "Day Shift",
                      count: team.filter((r) => r.shift === "day").length,
                      dot: "bg-amber-500",
                    },
                    {
                      label: "Graveyard",
                      count: team.filter((r) => r.shift === "graveyard").length,
                      dot: "bg-indigo-500",
                    },
                    {
                      label: "Present",
                      count: team.filter((r) => r.status === "present").length,
                      dot: "bg-green-500",
                    },
                    {
                      label: "On Leave",
                      count: team.filter((r) => r.status === "leave").length,
                      dot: "bg-blue-500",
                    },
                    {
                      label: "Absent",
                      count: team.filter((r) => r.status === "absent").length,
                      dot: "bg-red-500",
                    },
                  ].map(({ label, count, dot }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span
                        className={cn("size-2 shrink-0 rounded-full", dot)}
                      />
                      <span className="flex-1 text-[12px] text-muted-foreground">
                        {label}
                      </span>
                      <span className="text-[13px] font-semibold text-foreground tabular-nums">
                        {attendanceQ.isLoading ? "—" : count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Leaves */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Upcoming Leaves
                </p>
                <div className="space-y-2.5">
                  {pendingQ.isLoading ? (
                    [0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="size-6 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-2.5 w-20" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    ))
                  ) : pending.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      No upcoming leaves.
                    </p>
                  ) : (
                    pending.slice(0, 5).map((r) => {
                      const av = r.employeeName
                        .split(" ")
                        .map((n) => n[0] ?? "")
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                      return (
                        <div key={r.id} className="flex items-center gap-3">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {av}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium">
                              {r.employeeName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {r.startDate} · {r.days}d
                            </p>
                          </div>
                          <StatusBadge
                            variant="amber"
                            className="shrink-0 text-[10px]"
                          >
                            {r.leaveType}
                          </StatusBadge>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── 4. Analytics ─────────────────────────────────────── */}
            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Analytics
              </p>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {/* Attendance Trends */}
                <TrendCard
                  title="Attendance Trends"
                  subtitle="Last 7 days (%)"
                  data={attendanceTrend}
                  days={trendDays}
                  color="bg-green-500"
                  loading={trendsQ.isLoading}
                />

                {/* Late Trends */}
                <TrendCard
                  title="Late Trends"
                  subtitle="Last 7 days (count)"
                  data={lateTrend}
                  days={trendDays}
                  color="bg-amber-500"
                  loading={trendsQ.isLoading}
                />

                {/* OT Trends */}
                <TrendCard
                  title="OT Trends"
                  subtitle="Last 7 days (hrs)"
                  data={otTrend}
                  days={trendDays}
                  color="bg-purple-500"
                  loading={trendsQ.isLoading}
                />

                {/* 7-Day Summary — real aggregates from the trend series */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[12px] font-semibold text-foreground">
                    7-Day Summary
                  </p>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Company-wide
                  </p>
                  <div className="space-y-2.5">
                    {[
                      {
                        label: "Avg attendance",
                        value: `${avgAttendance}%`,
                        dot: "bg-green-500",
                      },
                      {
                        label: "Total late",
                        value: String(totalLate),
                        dot: "bg-amber-500",
                      },
                      {
                        label: "Total OT",
                        value: `${totalOt}h`,
                        dot: "bg-purple-500",
                      },
                    ].map(({ label, value, dot }) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <span
                          className={cn("size-2 shrink-0 rounded-full", dot)}
                        />
                        <span className="flex-1 text-[12px] text-muted-foreground">
                          {label}
                        </span>
                        <span className="text-[13px] font-semibold text-foreground tabular-nums">
                          {trendsQ.isLoading ? "—" : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. Notifications & Alerts ────────────────────────── */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Notifications & Alerts
              </p>
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-900/40 dark:bg-green-900/10">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 text-green-500"
                    />
                    <p className="text-[12px] text-green-700 dark:text-green-300">
                      All clear — no issues flagged right now.
                    </p>
                  </div>
                ) : (
                  alerts.map((a, i) => (
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
                        className={cn(
                          "mt-0.5 shrink-0",
                          a.level === "crit" ? "text-red-500" : "text-amber-500"
                        )}
                      />
                      <p
                        className={cn(
                          "text-[12px]",
                          a.level === "crit"
                            ? "text-red-700 dark:text-red-300"
                            : "text-amber-700 dark:text-amber-300"
                        )}
                      >
                        {a.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
