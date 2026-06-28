"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ClockPlusIcon,
  Add01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  File01Icon,
  TimeScheduleIcon,
} from "@hugeicons/core-free-icons"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DateRangePicker,
  type DateRangePreset,
  type DateRangeValue,
} from "@/components/ui/date-range-picker"
import { OvertimeRequestDialog } from "@/components/custom/overtime-request-dialog"
import { cn } from "@/lib/utils"
import {
  useMyOvertimeRequests,
  useCancelOvertimeRequest,
} from "@/hooks/use-overtime"
import { useTimeFormat } from "@/hooks/use-time-format"
import { useEffectiveOtRates } from "@/hooks/use-overtime-rates"
import {
  OT_TYPE_LABEL,
  OT_TYPE_COLOR,
  type OvertimeRequest,
  type OvertimeStatus,
} from "@/lib/overtime-api"

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  OvertimeStatus,
  "amber" | "green" | "red" | "gray"
> = {
  DRAFT: "gray",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "gray",
}

const STATUS_LABEL: Record<OvertimeStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

const STATUS_FILTERS: { label: string; value?: OvertimeStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Draft", value: "DRAFT" },
]

function startOfWeek(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`
}

/** Current semi-monthly payroll cut-off (1st–15th, or 16th–end of month). */
function currentCutoff(): { from: Date; until: Date } {
  const n = new Date()
  const y = n.getFullYear()
  const m = n.getMonth()
  return n.getDate() <= 15
    ? { from: new Date(y, m, 1), until: new Date(y, m, 15) }
    : { from: new Date(y, m, 16), until: new Date(y, m + 1, 0) }
}

// Past-oriented quick ranges — overtime is filed for days already worked. The cut-off presets
// follow a semi-monthly payroll period: the 1st–15th and the 16th–end of month.
const RANGE_PRESETS: DateRangePreset[] = [
  {
    label: "This week",
    range: () => {
      const from = startOfWeek(new Date())
      return {
        from,
        until: new Date(
          from.getFullYear(),
          from.getMonth(),
          from.getDate() + 6
        ),
      }
    },
  },
  {
    label: "Last week",
    range: () => {
      const sow = startOfWeek(new Date())
      const from = new Date(
        sow.getFullYear(),
        sow.getMonth(),
        sow.getDate() - 7
      )
      return {
        from,
        until: new Date(
          from.getFullYear(),
          from.getMonth(),
          from.getDate() + 6
        ),
      }
    },
  },
  {
    label: "This month",
    range: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth(), 1),
        until: new Date(n.getFullYear(), n.getMonth() + 1, 0),
      }
    },
  },
  {
    label: "Last month",
    range: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth() - 1, 1),
        until: new Date(n.getFullYear(), n.getMonth(), 0),
      }
    },
  },
  {
    label: "This year",
    range: () => {
      const y = new Date().getFullYear()
      return { from: new Date(y, 0, 1), until: new Date(y, 11, 31) }
    },
  },
  {
    label: "Last year",
    range: () => {
      const y = new Date().getFullYear() - 1
      return { from: new Date(y, 0, 1), until: new Date(y, 11, 31) }
    },
  },
  {
    label: "Current cut-off",
    range: currentCutoff,
  },
  {
    label: "Last cut-off",
    range: () => {
      const n = new Date()
      const y = n.getFullYear()
      const m = n.getMonth()
      // First half now → previous = second half of last month; second half now → first half now.
      return n.getDate() <= 15
        ? { from: new Date(y, m - 1, 16), until: new Date(y, m, 0) }
        : { from: new Date(y, m, 1), until: new Date(y, m, 15) }
    },
  },
]

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function fmtDateTime(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function fmtHours(h: number) {
  if (!h) return "—"
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

// ── Request Form Dialog ─────────────────────────────────────────────────────

// ── Detail Dialog ───────────────────────────────────────────────────────────

function DetailDialog({
  request,
  onClose,
}: {
  request: OvertimeRequest
  onClose: () => void
}) {
  const cancelMutation = useCancelOvertimeRequest()
  const { formatTime } = useTimeFormat()
  const otRates = useEffectiveOtRates()

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Overtime Request Detail</DialogTitle>
          <DialogDescription>
            {OT_TYPE_LABEL[request.overtimeType]} ·{" "}
            {fmtDate(request.overtimeDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[12px]">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge variant={STATUS_VARIANT[request.status]}>
              {STATUS_LABEL[request.status]}
            </StatusBadge>
          </div>

          {/* Core details grid */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Overtime Date</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {fmtDate(request.overtimeDate)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Type</p>
              <StatusBadge
                variant={OT_TYPE_COLOR[request.overtimeType]}
                className="mt-0.5"
                dot={false}
              >
                {OT_TYPE_LABEL[request.overtimeType]}
              </StatusBadge>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Time</p>
              <p className="mt-0.5 font-semibold text-foreground tabular-nums">
                {formatTime(request.startTime)} – {formatTime(request.endTime)}
              </p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-primary/70">Total Hours</p>
              <p className="mt-0.5 font-bold text-primary tabular-nums">
                {fmtHours(request.totalHours)}
              </p>
            </div>
          </div>

          {/* Pay rate */}
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800/40 dark:bg-green-900/10">
            <HugeiconsIcon
              icon={TimeScheduleIcon}
              size={13}
              strokeWidth={1.8}
              className="shrink-0 text-green-600"
            />
            <p className="text-[12px] text-green-700 dark:text-green-400">
              Rate:{" "}
              <span className="font-bold">
                ×{otRates[request.overtimeType].toFixed(2)}
              </span>{" "}
              multiplier ({OT_TYPE_LABEL[request.overtimeType]})
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Reason / Task
            </p>
            <p className="text-[12px] text-foreground">{request.reason}</p>
          </div>

          {/* Admin remarks */}
          {request.reviewNote && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                Admin Remarks
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">
                {request.reviewNote}
              </p>
              {request.reviewedByName && (
                <p className="mt-1 text-[11px] text-blue-500">
                  — {request.reviewedByName}
                  {request.reviewedAt
                    ? `, ${fmtDateTime(request.reviewedAt)}`
                    : ""}
                </p>
              )}
            </div>
          )}

          {/* Attachments */}
          {request.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments
              </p>
              {request.attachmentUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[12px] text-primary hover:bg-muted/40"
                >
                  <HugeiconsIcon
                    icon={File01Icon}
                    size={13}
                    strokeWidth={1.8}
                  />
                  Attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Filed {fmtDateTime(request.createdAt)}
          </p>
        </div>

        <DialogFooter className="gap-2">
          {request.status === "PENDING" && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
              disabled={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate(request.id, { onSuccess: onClose })
              }
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel Request"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function MyOvertimeSection() {
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | undefined>(
    undefined
  )
  // Default to the current payroll cut-off on load.
  const [range, setRange] = useState<DateRangeValue | null>(() => {
    const c = currentCutoff()
    return { from: toISODate(c.from), until: toISODate(c.until) }
  })
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<OvertimeRequest | null>(null)
  const { formatTime } = useTimeFormat()

  const q = useMyOvertimeRequests({ size: 100 })
  const allItems = q.data?.content ?? []

  // The date-range filter (by overtime date) drives both the cards and the table.
  const rangeItems = range
    ? allItems.filter(
        (r) => r.overtimeDate >= range.from && r.overtimeDate <= range.until
      )
    : allItems
  const items = statusFilter
    ? rangeItems.filter((r) => r.status === statusFilter)
    : rangeItems

  const approved = rangeItems.filter((r) => r.status === "APPROVED")
  // Rest-day duty (REST_DAY) is premium pay, not overtime — keep it separate from OT hours
  // (REGULAR + REST_DAY_OT) so the totals aren't conflated.
  const approvedRdHours = approved
    .filter((r) => r.overtimeType === "REST_DAY")
    .reduce((sum, r) => sum + r.totalHours, 0)
  const approvedOtHours = approved
    .filter((r) => r.overtimeType !== "REST_DAY")
    .reduce((sum, r) => sum + r.totalHours, 0)

  const counts = {
    pending: rangeItems.filter((r) => r.status === "PENDING").length,
    approved: rangeItems.filter((r) => r.status === "APPROVED").length,
    rejected: rangeItems.filter((r) => r.status === "REJECTED").length,
    draft: rangeItems.filter((r) => r.status === "DRAFT").length,
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">
            Overtime Requests
          </h1>
          <p className="text-[12px] text-muted-foreground">
            File and track your overtime requests
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} />
          New Request
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard
          title="Pending"
          value={<span className="text-warning">{counts.pending}</span>}
          meta="Awaiting approval"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Approved"
          value={<span className="text-success">{counts.approved}</span>}
          meta="Synced to payroll"
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
          title="RD Hours"
          value={approvedRdHours ? fmtHours(approvedRdHours) : "0h"}
          meta="Approved rest-day duty"
          accent="amber"
          icon={
            <HugeiconsIcon
              icon={TimeScheduleIcon}
              size={16}
              strokeWidth={1.8}
            />
          }
        />
        <StatCard
          title="OT Hours"
          value={approvedOtHours ? fmtHours(approvedOtHours) : "0h"}
          meta="Approved overtime"
          accent="blue"
          icon={
            <HugeiconsIcon
              icon={TimeScheduleIcon}
              size={16}
              strokeWidth={1.8}
            />
          }
        />
        <StatCard
          title="Rejected"
          value={<span className="text-danger">{counts.rejected}</span>}
          meta="See remarks for reason"
          accent="red"
          icon={
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
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
          <div className="ml-auto flex items-center gap-2">
            <DateRangePicker
              value={range}
              onChange={setRange}
              presets={RANGE_PRESETS}
              align="end"
              className="w-65"
              fromPlaceholder="From date"
              untilPlaceholder="To date"
            />
            {range && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-[12px]"
                onClick={() => setRange(null)}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Date",
                "Type",
                "Time",
                "Hours",
                "Reason",
                "Status",
                "Filed",
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-3 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon
                      icon={ClockPlusIcon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No overtime requests found.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 gap-1.5"
                      onClick={() => setFormOpen(true)}
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
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setDetail(r)}
                >
                  <TableCell className="text-[13px] font-medium tabular-nums">
                    {fmtDate(r.overtimeDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={OT_TYPE_COLOR[r.overtimeType]}
                      dot={false}
                    >
                      {OT_TYPE_LABEL[r.overtimeType]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {formatTime(r.startTime)} – {formatTime(r.endTime)}
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] font-semibold text-primary tabular-nums">
                      {fmtHours(r.totalHours)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-50">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {r.reason}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {fmtDate(r.createdAt.split("T")[0])}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Modals ── */}
      <OvertimeRequestDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
      {detail && (
        <DetailDialog request={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
