"use client"

import { useRouter } from "next/navigation"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ClockWidget } from "@/components/custom/clock-widget"
import { Progress } from "@/components/ui/progress"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  Calendar01Icon,
  Alert01Icon,
  UserCircleIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"
import {
  useEmployeeStats,
  useAttendance,
  useLeaveBalances,
} from "@/hooks/use-employee"
import { useMyPolicy } from "@/hooks/use-schedule-policy"

// ── helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const STATUS_VARIANT: Record<
  string,
  "green" | "amber" | "red" | "blue" | "gray"
> = {
  present: "green",
  late: "amber",
  absent: "red",
  leave: "blue",
  holiday: "gray",
  restday: "gray",
  overtime: "green",
  overbreak: "amber",
  undertime: "amber",
}

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  leave: "On Leave",
  holiday: "Holiday",
  restday: "Rest Day",
  overtime: "Overtime",
  overbreak: "Overbreak",
  undertime: "Undertime",
}

const LEAVE_COLOR: Record<string, string> = {
  "Vacation Leave": "bg-primary",
  "Sick Leave": "bg-success",
  "Emergency Leave": "bg-warning",
  "Special Leave": "bg-purple-500",
}

// 7-day personal analytics mock trends
const MOCK_ATTENDANCE_RATE = [100, 100, 0, 100, 100, 100, 100]
const MOCK_WORKED_HRS = [8, 8.5, 0, 7.5, 9, 8, 8.2]
const MOCK_LATE_TREND = [0, 0, 0, 15, 0, 0, 0]
const MOCK_OT_TREND = [0, 1, 0, 0, 2, 0, 0.5]
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function Sparkline({
  data,
  color = "bg-primary",
}: {
  data: number[]
  color?: string
}) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex h-9 items-end gap-0.5">
      {data.map((v, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-sm", color)}
          style={{
            height: `${Math.max((v / max) * 100, v > 0 ? 8 : 3)}%`,
            opacity: v > 0 ? 0.85 : 0.2,
          }}
        />
      ))}
    </div>
  )
}

const NOTIFICATIONS = [
  {
    text: "Your schedule for next week has been updated.",
    type: "info" as const,
    time: "2h ago",
  },
  {
    text: "Leave request approved — Dec 25–26.",
    type: "success" as const,
    time: "Yesterday",
  },
  {
    text: "Reminder: You have a missing time-out log from Monday.",
    type: "warn" as const,
    time: "2d ago",
  },
  {
    text: "Upcoming shift tomorrow: 8:00 AM – 5:00 PM.",
    type: "info" as const,
    time: "3d ago",
  },
]

const REQUEST_TYPES = [
  { label: "Leave Requests", section: "request", color: "bg-blue-500" },
  {
    label: "Attendance Corrections",
    section: "my-change-time",
    color: "bg-amber-500",
  },
  { label: "OT Requests", section: "my-overtime", color: "bg-purple-500" },
  { label: "Schedule Changes", section: "my-schedule", color: "bg-green-500" },
]

// ── main ──────────────────────────────────────────────────────────────────────

export function OverviewSection() {
  const router = useRouter()
  const { user } = useAuthStore()
  const statsQ = useEmployeeStats()
  const attendanceQ = useAttendance({ size: 7 })
  const balancesQ = useLeaveBalances()
  const policyQ = useMyPolicy()

  const stats = statsQ.data
  const records = attendanceQ.data?.content ?? []
  const todayEntry = records[0]
  const balances = balancesQ.data ?? []
  const policy = policyQ.data

  const firstName = user?.firstName ?? "there"
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const shiftLabel = policy
    ? `${policy.earliestClockIn ?? "—"} – ${policy.latestClockIn ?? "—"}`
    : "—"

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            My Dashboard
          </p>
          <h1 className="mt-0.5 text-[20px] leading-tight font-bold text-foreground">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Manage your workday — here's everything you need today.
          </p>
        </div>
        <p className="shrink-0 text-[12px] text-muted-foreground">{dateStr}</p>
      </div>

      {/* ── 1. Six Summary KPIs ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Today's Status"
          value={
            todayEntry ? (
              <StatusBadge
                variant={STATUS_VARIANT[todayEntry.status] ?? "gray"}
                className="text-sm font-bold"
              >
                {STATUS_LABEL[todayEntry.status] ?? todayEntry.status}
              </StatusBadge>
            ) : statsQ.isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )
          }
          meta="Current attendance"
          accent={
            todayEntry
              ? STATUS_VARIANT[todayEntry.status] === "green"
                ? "green"
                : STATUS_VARIANT[todayEntry.status] === "amber"
                  ? "amber"
                  : "red"
              : "gray"
          }
          icon={
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={15}
              strokeWidth={1.8}
            />
          }
        />
        <StatCard
          title="Worked Hours"
          value={
            todayEntry?.hoursWorked ??
            (attendanceQ.isLoading ? <Skeleton className="h-6 w-12" /> : "—")
          }
          meta="Today"
          accent="green"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={15} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Late Count"
          value={
            stats ? (
              String(stats.lateIncidents)
            ) : statsQ.isLoading ? (
              <Skeleton className="h-6 w-8" />
            ) : (
              "—"
            )
          }
          meta="This year"
          accent={stats && stats.lateIncidents > 0 ? "amber" : "green"}
          icon={
            <HugeiconsIcon icon={Alert01Icon} size={15} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="OT Hours"
          value={
            todayEntry?.otHours ??
            (attendanceQ.isLoading ? <Skeleton className="h-6 w-12" /> : "0h")
          }
          meta="Today"
          accent="purple"
          icon={
            <HugeiconsIcon icon={UserCircleIcon} size={15} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Pending Requests"
          value="—"
          meta="Across all types"
          accent="red"
          icon={
            <HugeiconsIcon icon={Calendar01Icon} size={15} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Next Shift"
          value={
            <span className="text-sm font-semibold tabular-nums">
              {shiftLabel}
            </span>
          }
          meta={
            policy
              ? `${policy.requiredHours ?? "—"}h required`
              : "Schedule policy"
          }
          accent="blue"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={15} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── 2. Today's Attendance + My Schedule ──────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Today's Attendance — ClockWidget + detail */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[12px] font-semibold text-foreground">
            Today's Attendance
          </p>
          <ClockWidget />
          {todayEntry && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: "Time In", value: todayEntry.timeIn || "—" },
                { label: "Time Out", value: todayEntry.timeOut || "—" },
                { label: "Hours Worked", value: todayEntry.hoursWorked || "—" },
                { label: "OT Hours", value: todayEntry.otHours || "0h" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-[13px] font-semibold text-foreground tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Schedule */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[12px] font-semibold text-foreground">
            My Schedule
          </p>
          <div className="space-y-2.5">
            {[
              {
                label: "Today's Shift",
                value: policy
                  ? `${policy.earliestClockIn} – ${policy.latestClockIn}`
                  : "—",
                sub: policy
                  ? `${policy.requiredHours}h · Grace ${policy.lateGraceMins ?? 0}m`
                  : "",
                dot: "bg-green-500",
              },
              {
                label: "Tomorrow's Shift",
                value: policy
                  ? `${policy.earliestClockIn} – ${policy.latestClockIn}`
                  : "—",
                sub: "Same schedule",
                dot: "bg-blue-500",
              },
              {
                label: "Rest Day",
                value: "Saturday & Sunday",
                sub: "Fixed rest days",
                dot: "bg-gray-400",
              },
              {
                label: "Pending Shift Changes",
                value: "—",
                sub: "No changes filed",
                dot: "bg-amber-500",
              },
            ].map(({ label, value, sub, dot }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <span
                  className={cn("mt-1 size-2 shrink-0 rounded-full", dot)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-[13px] font-semibold text-foreground">
                    {value}
                  </p>
                  {sub && (
                    <p className="text-[10px] text-muted-foreground">{sub}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Leave balance mini */}
          {balances.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Leave Balance
              </p>
              {balances.slice(0, 3).map((l) => (
                <div key={l.type}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {l.type}
                    </span>
                    <span className="text-[11px] font-semibold">
                      {l.remaining}/{l.total} days
                    </span>
                  </div>
                  <Progress
                    value={(l.remaining / l.total) * 100}
                    className="h-1"
                    indicatorClassName={LEAVE_COLOR[l.type] ?? "bg-primary"}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Requests Area ─────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          My Requests
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {REQUEST_TYPES.map(({ label, section, color }) => (
            <button
              key={section}
              onClick={() => router.push(`/dashboard/${section}`)}
              className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={cn("size-2 rounded-full", color)} />
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={12}
                  strokeWidth={2}
                  className="text-muted-foreground/40 transition-colors group-hover:text-primary"
                />
              </div>
              <p className="text-[13px] font-semibold text-foreground">
                {label}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(["Pending", "Approved", "Rejected"] as const).map((s) => (
                  <span
                    key={s}
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      s === "Pending" &&
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                      s === "Approved" &&
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                      s === "Rejected" &&
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    )}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Personal Analytics ────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Personal Analytics
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground">
              Attendance Rate
            </p>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Last 7 days
            </p>
            <Sparkline data={MOCK_ATTENDANCE_RATE} color="bg-green-500" />
            <div className="mt-1 flex justify-between">
              {DAYS.map((d) => (
                <span key={d} className="text-[9px] text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground">
              Monthly Hours
            </p>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Hours worked
            </p>
            <Sparkline data={MOCK_WORKED_HRS} color="bg-blue-500" />
            <div className="mt-1 flex justify-between">
              {DAYS.map((d) => (
                <span key={d} className="text-[9px] text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>
            {stats && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                YTD:{" "}
                <span className="font-semibold text-foreground">
                  {stats.totalHoursWorked.toLocaleString()}h
                </span>
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground">
              Late Trend
            </p>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Minutes late per day
            </p>
            <Sparkline data={MOCK_LATE_TREND} color="bg-amber-500" />
            <div className="mt-1 flex justify-between">
              {DAYS.map((d) => (
                <span key={d} className="text-[9px] text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>
            {stats && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {stats.lateIncidents} incident
                {stats.lateIncidents !== 1 ? "s" : ""} this year
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-semibold text-foreground">
              OT Summary
            </p>
            <p className="mb-3 text-[11px] text-muted-foreground">
              OT hours per day
            </p>
            <Sparkline data={MOCK_OT_TREND} color="bg-purple-500" />
            <div className="mt-1 flex justify-between">
              {DAYS.map((d) => (
                <span key={d} className="text-[9px] text-muted-foreground">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Notifications ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Notifications
        </p>
        <div className="space-y-2">
          {NOTIFICATIONS.map((n, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                n.type === "warn" &&
                  "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10",
                n.type === "success" &&
                  "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10",
                n.type === "info" && "border-border bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 size-1.5 shrink-0 rounded-full",
                  n.type === "warn" && "bg-amber-500",
                  n.type === "success" && "bg-green-500",
                  n.type === "info" && "bg-primary"
                )}
              />
              <p
                className={cn(
                  "flex-1 text-[12px]",
                  n.type === "warn" && "text-amber-700 dark:text-amber-300",
                  n.type === "success" && "text-green-700 dark:text-green-300",
                  n.type === "info" && "text-foreground"
                )}
              >
                {n.text}
              </p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {n.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
