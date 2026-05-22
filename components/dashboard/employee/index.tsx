"use client"

import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatCard } from "@/components/custom/stat-card"
import { ClockWidget } from "@/components/custom/clock-widget"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"
import { useEmployeeStats, useLeaveBalances } from "@/hooks/use-employee"
import { useMyPolicyHistory } from "@/hooks/use-schedule-policy"
import { useState } from "react"
import { MyPolicyHistoryModal } from "@/components/custom/my-policy-history-modal"
import type { PolicyVersion } from "@/lib/schedule-policy-api"

interface ActivityItem {
  dot: string
  title: string
  meta: string
  time: string
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function policyVersionToActivity(v: PolicyVersion): ActivityItem {
  if (v.deletionMarker) {
    return {
      dot: "bg-warning",
      title: "Schedule override removed",
      meta:
        (v.note ?? "Reverted to role / organization default") +
        (v.createdByName ? ` · by ${v.createdByName}` : ""),
      time: formatRelative(v.effectiveFrom),
    }
  }
  const p = v.payload
  const summary = `${p.requiredHours ?? "—"}h/day · ${p.earliestClockIn ?? "—"}–${p.latestClockIn ?? "—"} (grace ${p.lateGraceMins ?? 0}m)`
  return {
    dot: "bg-primary",
    title: "Schedule policy updated",
    meta: summary + (v.createdByName ? ` · by ${v.createdByName}` : ""),
    time: formatRelative(v.effectiveFrom),
  }
}

const LEAVE_COLOR_MAP: Record<string, string> = {
  "Vacation Leave": "bg-primary",
  "Sick Leave": "bg-success",
  "Emergency Leave": "bg-warning",
  "Special Leave": "bg-purple-500",
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export function OverviewSection() {
  const router = useRouter()
  const { user } = useAuthStore()
  const statsQ = useEmployeeStats()
  const balancesQ = useLeaveBalances()
  const policyHistoryQ = useMyPolicyHistory({ size: 5 })
  const [historyOpen, setHistoryOpen] = useState(false)

  const policyActivities: ActivityItem[] = (policyHistoryQ.data?.content ?? [])
    .slice(0, 5)
    .map(policyVersionToActivity)

  const firstName = user?.firstName ?? "—"
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const stats = statsQ.data
  const statsLoading = statsQ.isLoading
  const balances = balancesQ.data ?? []

  const valueSkeleton = <Skeleton className="h-7 w-20" />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[15px] leading-snug font-semibold">
          {getGreeting()}, {firstName}
        </p>
        <p className="text-sm text-muted-foreground">
          {dateStr} · 2 pending items
        </p>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total days present"
          value={
            statsLoading
              ? valueSkeleton
              : String(stats?.totalDaysPresent ?? "—")
          }
          delta={statsLoading ? undefined : "Year to date"}
          deltaUp={true}
          accent="blue"
        />
        <StatCard
          title="Total leave used"
          value={
            statsLoading ? (
              valueSkeleton
            ) : (
              <>
                {stats ? stats.totalLeaveUsed : "—"}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  days
                </span>
              </>
            )
          }
          meta={
            stats
              ? `${stats.leaveVacation} vacation · ${stats.leaveSick} sick`
              : ""
          }
          accent="amber"
        />
        <StatCard
          title="Total hours worked"
          value={
            statsLoading ? (
              valueSkeleton
            ) : (
              <>
                {stats ? stats.totalHoursWorked.toLocaleString() : "—"}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  hrs
                </span>
              </>
            )
          }
          delta={statsLoading ? undefined : "Year to date"}
          deltaUp={true}
          accent="green"
        />
        <StatCard
          title="Total hours late"
          value={
            statsLoading ? (
              valueSkeleton
            ) : (
              <span className="text-danger">
                {stats ? stats.totalHoursLate : "—"}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  hrs
                </span>
              </span>
            )
          }
          delta={
            statsLoading
              ? undefined
              : stats
                ? `${stats.lateIncidents} incidents this year`
                : ""
          }
          deltaUp={false}
          accent="red"
        />
      </div>

      {/* Clock widget + Leave balance */}
      <div className="grid grid-cols-2 gap-4">
        <ClockWidget />

        {/* Leave balance */}
        <Card>
          <CardHeader>
            <CardTitle>Leave balance</CardTitle>
            <CardAction>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/request")}
              >
                + File leave
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {balancesQ.isLoading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                ))}
              </>
            ) : balances.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No leave balance data
              </p>
            ) : (
              balances.map((l) => (
                <div key={l.type}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground">
                      {l.type}
                    </span>
                    <span className="text-[13px] font-semibold">
                      {l.remaining} days
                    </span>
                  </div>
                  <Progress
                    value={(l.remaining / l.total) * 100}
                    className="h-1.5"
                    indicatorClassName={LEAVE_COLOR_MAP[l.type] ?? "bg-primary"}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardAction>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setHistoryOpen(true)}
            >
              View schedule history
            </button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {policyHistoryQ.isLoading ? (
            [0, 1].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="mt-1 size-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-2.5 w-64" />
                </div>
                <Skeleton className="h-2.5 w-10" />
              </div>
            ))
          ) : policyActivities.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted-foreground">
              No recent schedule changes. Your schedule is following your role
              or organization default.
            </p>
          ) : (
            policyActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={cn("mt-1 size-2 shrink-0 rounded-full", a.dot)}
                />
                <div className="flex-1">
                  <p className="text-[13px] font-medium">{a.title}</p>
                  <p className="text-[12px] text-muted-foreground">{a.meta}</p>
                </div>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  {a.time}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <MyPolicyHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  )
}
