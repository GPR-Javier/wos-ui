"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Add01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LeaveModal } from "@/components/custom/leave-modal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useLeaveBalances } from "@/hooks/use-employee"
import {
  useMyLeaveRequests,
  useCancelLeaveRequest,
  useSubmitLeaveDraft,
} from "@/hooks/use-leave"
import {
  LEAVE_TYPE_LABEL,
  LEAVE_STATUS_LABEL,
  LEAVE_STATUS_VARIANT,
  type LeaveType,
  type LeaveStatus,
  type LeaveRequest,
} from "@/lib/leave-api"

const TYPE_VARIANT: Record<LeaveType, "blue" | "amber" | "red" | "purple"> = {
  VACATION: "blue",
  SICK: "amber",
  EMERGENCY: "red",
  MATERNITY: "purple",
  PATERNITY: "purple",
}

const STATUS_FILTERS: { label: string; value?: LeaveStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Returned", value: "RETURNED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Draft", value: "DRAFT" },
]

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function dateRange(start: string, end: string) {
  return start === end ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`
}

export function MyLeavesSection() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | undefined>(
    undefined
  )

  const q = useMyLeaveRequests({ size: 100 })
  const all = q.data?.content ?? []
  const items = statusFilter
    ? all.filter((r) => r.status === statusFilter)
    : all

  const { data: balances = [] } = useLeaveBalances()
  const cancelMutation = useCancelLeaveRequest()
  const submitMutation = useSubmitLeaveDraft()

  const thisYear = new Date().getFullYear()
  const counts = {
    pending: all.filter((r) => r.status === "PENDING").length,
    approved: all.filter(
      (r) => r.status === "APPROVED" && r.startDate.startsWith(`${thisYear}`)
    ).length,
    rejected: all.filter((r) => r.status === "REJECTED").length,
  }
  const totalRemaining = balances.reduce((s, b) => s + b.remaining, 0)

  function openFile() {
    setEditing(null)
    setModalOpen(true)
  }
  function openEdit(r: LeaveRequest) {
    setEditing(r)
    setModalOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">My Leave</h1>
          <p className="text-[12px] text-muted-foreground">
            File and track your leave requests
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openFile}>
          <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} />
          File Leave
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Leave balance"
          value={
            <>
              {totalRemaining}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                days
              </span>
            </>
          }
          meta="Remaining across types"
          accent="blue"
          icon={
            <HugeiconsIcon icon={Calendar01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Pending"
          value={<span className="text-warning">{counts.pending}</span>}
          meta="Awaiting HR action"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Approved this year"
          value={<span className="text-success">{counts.approved}</span>}
          meta="Across all leave types"
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
          title="Rejected"
          value={<span className="text-danger">{counts.rejected}</span>}
          meta="This year"
          accent="red"
          icon={
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Balance breakdown ── */}
      {balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leave balance</CardTitle>
            <p className="text-[12px] text-muted-foreground">
              Remaining credits for {thisYear}
            </p>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                balances.length > 1 && "sm:grid-cols-3"
              )}
            >
              {balances.map((b) => {
                const remaining = b.remaining
                const pct =
                  b.total > 0 ? Math.round((b.used / b.total) * 100) : 0
                return (
                  <div
                    key={b.type}
                    className="rounded-lg border border-border bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold capitalize">
                        {b.type.toLowerCase()}
                      </span>
                      <span className="text-[12px] text-muted-foreground tabular-nums">
                        {remaining}/{b.total} days
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {b.used} used
                      {b.pending > 0 ? ` · ${b.pending} pending` : ""}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── History table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <p className="text-[13px] font-semibold">Leave history</p>
          <div className="ml-auto flex rounded-lg border border-border bg-muted/40 p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  statusFilter === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {["Type", "Dates", "Days", "Reason", "Status", "Filed", ""].map(
                (h, i) => (
                  <TableHead key={h || `c-${i}`}>{h}</TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              [0, 1, 2].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-3 w-16" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon
                      icon={Calendar01Icon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No leave requests found.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 gap-1.5"
                      onClick={openFile}
                    >
                      <HugeiconsIcon
                        icon={Add01Icon}
                        size={12}
                        strokeWidth={2}
                      />
                      File a request
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <StatusBadge
                      variant={TYPE_VARIANT[r.leaveType]}
                      dot={false}
                    >
                      {LEAVE_TYPE_LABEL[r.leaveType]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[13px] font-medium tabular-nums">
                    {dateRange(r.startDate, r.endDate)}
                  </TableCell>
                  <TableCell className="text-[13px] tabular-nums">
                    {r.days}
                    {Object.keys(r.dayParts ?? {}).length > 0 && (
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ½
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-50">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {r.reason || "—"}
                    </p>
                    {r.status === "RETURNED" && r.reviewNote && (
                      <p className="truncate text-[11px] text-amber-600 dark:text-amber-400">
                        {r.reviewNote}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={LEAVE_STATUS_VARIANT[r.status]}>
                      {LEAVE_STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {fmtDate(r.filedAt.split("T")[0])}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "RETURNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[12px]"
                          onClick={() => openEdit(r)}
                        >
                          Revise
                        </Button>
                      )}
                      {r.status === "DRAFT" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[12px]"
                            onClick={() => openEdit(r)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-[12px]"
                            disabled={submitMutation.isPending}
                            onClick={() => submitMutation.mutate(r.id)}
                          >
                            Submit
                          </Button>
                        </>
                      )}
                      {(r.status === "PENDING" ||
                        r.status === "DRAFT" ||
                        r.status === "RETURNED") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-red-200 text-[12px] text-red-500 hover:bg-red-50 dark:border-red-900/40"
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(r.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LeaveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />
    </div>
  )
}
