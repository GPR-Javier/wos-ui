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

// ── Types & static prototype data ─────────────────────────────────────────────

type LeaveStatus = "approved" | "pending" | "declined"
type LeaveKind = "Vacation" | "Sick" | "Emergency" | "Special"

interface LeaveRecord {
  kind: LeaveKind
  dates: string
  days: number
  reason: string
  filed: string
  status: LeaveStatus
  remarks: string
}

const LEAVE_HISTORY: LeaveRecord[] = [
  {
    kind: "Vacation",
    dates: "Jun 14–16",
    days: 3,
    reason: "Family trip",
    filed: "Jun 7",
    status: "approved",
    remarks: "Approved by Sandra R.",
  },
  {
    kind: "Sick",
    dates: "May 22",
    days: 1,
    reason: "Flu",
    filed: "May 22",
    status: "approved",
    remarks: "Auto-approved",
  },
  {
    kind: "Emergency",
    dates: "May 3",
    days: 1,
    reason: "Family emergency",
    filed: "May 3",
    status: "approved",
    remarks: "Approved by Sandra R.",
  },
  {
    kind: "Vacation",
    dates: "Apr 28–30",
    days: 3,
    reason: "Out of town",
    filed: "Apr 18",
    status: "declined",
    remarks: "Peak season — please reschedule",
  },
  {
    kind: "Sick",
    dates: "Jul 2",
    days: 1,
    reason: "Medical check-up",
    filed: "Jun 27",
    status: "pending",
    remarks: "Awaiting HR approval",
  },
]

const KIND_VARIANT: Record<LeaveKind, "blue" | "amber" | "red" | "purple"> = {
  Vacation: "blue",
  Sick: "amber",
  Emergency: "red",
  Special: "purple",
}

const STATUS_VARIANT: Record<LeaveStatus, "green" | "amber" | "red"> = {
  approved: "green",
  pending: "amber",
  declined: "red",
}

const STATUS_FILTERS: { label: string; value?: LeaveStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Declined", value: "declined" },
]

// Leave balance breakdown shown beneath the headline stats.
const BALANCE_BREAKDOWN: { label: LeaveKind; used: number; total: number }[] = [
  { label: "Vacation", used: 7, total: 15 },
  { label: "Sick", used: 1, total: 5 },
  { label: "Emergency", used: 1, total: 3 },
]

// ── Main component ────────────────────────────────────────────────────────────

export function MyLeavesSection() {
  const [modalOpen, setModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | undefined>(
    undefined
  )

  const items = statusFilter
    ? LEAVE_HISTORY.filter((r) => r.status === statusFilter)
    : LEAVE_HISTORY

  const counts = {
    pending: LEAVE_HISTORY.filter((r) => r.status === "pending").length,
    approved: LEAVE_HISTORY.filter((r) => r.status === "approved").length,
    declined: LEAVE_HISTORY.filter((r) => r.status === "declined").length,
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
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setModalOpen(true)}
        >
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
              14{" "}
              <span className="text-sm font-normal text-muted-foreground">
                days
              </span>
            </>
          }
          meta="8 vacation · 4 sick · 2 emergency"
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
          title="Declined"
          value={<span className="text-danger">{counts.declined}</span>}
          meta="This year"
          accent="red"
          icon={
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Balance breakdown ── */}
      <Card>
        <CardHeader>
          <CardTitle>Leave balance</CardTitle>
          <p className="text-[12px] text-muted-foreground">
            Remaining credits for {new Date().getFullYear()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {BALANCE_BREAKDOWN.map((b) => {
              const remaining = b.total - b.used
              const pct = Math.round((b.used / b.total) * 100)
              return (
                <div
                  key={b.label}
                  className="rounded-lg border border-border bg-muted/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge variant={KIND_VARIANT[b.label]} dot={false}>
                      {b.label}
                    </StatusBadge>
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
                    {b.used} day{b.used === 1 ? "" : "s"} used
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── History table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Toolbar */}
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

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Type",
                "Dates",
                "Days",
                "Reason",
                "Filed",
                "Status",
                "Remarks",
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
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
                      onClick={() => setModalOpen(true)}
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
              items.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <StatusBadge variant={KIND_VARIANT[r.kind]} dot={false}>
                      {r.kind}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[13px] font-medium tabular-nums">
                    {r.dates}
                  </TableCell>
                  <TableCell className="text-[13px] tabular-nums">
                    {r.days}
                  </TableCell>
                  <TableCell className="max-w-50">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {r.reason}
                    </p>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {r.filed}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {r.remarks}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Modal ── */}
      <LeaveModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
