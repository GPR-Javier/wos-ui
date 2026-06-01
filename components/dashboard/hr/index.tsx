"use client"

import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  Calendar01Icon,
  Alert01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"
import { useHrStats, useLeaveRequests } from "@/hooks/use-hr"
import { useApproveLeave, useRejectLeave } from "@/hooks/use-hr"

export function OverviewSection() {
  const statsQ = useHrStats()
  const pendingQ = useLeaveRequests({ status: "pending", size: 10 })

  const approveMutation = useApproveLeave()
  const rejectMutation = useRejectLeave()

  const stats = statsQ.data
  const pending = pendingQ.data?.content ?? []

  return (
    <div className="space-y-6">
      {/* ── Workforce KPIs ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Present Today"
          value={stats ? String(stats.presentToday) : "—"}
          meta={
            stats
              ? `${stats.attendanceRate}% attendance rate`
              : "Workforce currently active"
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
          value={stats ? String(stats.lateToday) : "—"}
          meta="Attendance issues"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="On Leave"
          value={stats ? String(stats.onLeave) : "—"}
          meta={
            stats
              ? `${stats.approvedLeave} approved · ${stats.pendingLeave} pending`
              : "Leave visibility"
          }
          accent="blue"
          icon={
            <HugeiconsIcon icon={Calendar01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Pending Requests"
          value={stats ? String(stats.pendingRequests) : "—"}
          meta={
            stats
              ? `${stats.leaveRequests} leave · ${stats.dtrRequests} DTR`
              : "Needs approval"
          }
          accent="red"
          icon={
            <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="OT Hours Today"
          value={
            stats
              ? stats.otHoursToday > 0
                ? `${stats.otHoursToday.toFixed(1)}h`
                : "0h"
              : "—"
          }
          meta="Overtime monitoring"
          accent={stats && stats.otHoursToday > 0 ? "amber" : "green"}
          icon={
            <HugeiconsIcon icon={UserCircleIcon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Pending approvals
            </p>
            <StatusBadge variant="amber">{pending.length} pending</StatusBadge>
          </div>
          {pendingQ.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No pending requests
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => {
                const initials = r.employeeName
                  .split(" ")
                  .map((n) => n[0] ?? "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">
                        {r.employeeName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.leaveType} · {r.days} day{r.days !== 1 ? "s" : ""} ·{" "}
                        {r.startDate}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-success-border text-success hover:bg-gbg"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(r.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-danger-border text-danger hover:bg-rbg"
                        disabled={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate(r.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border p-5">
          <p className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Headcount by department
          </p>
          <div className="space-y-3">
            {[
              { dept: "Engineering", count: 18, pct: 38 },
              { dept: "Design", count: 6, pct: 13 },
              { dept: "Sales", count: 10, pct: 21 },
              { dept: "People Ops", count: 5, pct: 10 },
              { dept: "Finance", count: 4, pct: 8 },
              { dept: "Marketing", count: 5, pct: 10 },
            ].map((d) => (
              <div key={d.dept} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[13px] text-muted-foreground">
                  {d.dept}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[12px] font-medium tabular-nums">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
