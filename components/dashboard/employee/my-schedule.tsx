"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Calendar01Icon,
  CalendarBlock01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  TimeScheduleIcon,
  InformationCircleIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DateRangePicker,
  type DateRangePreset,
} from "@/components/ui/date-range-picker"
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
import { TablePagination } from "@/components/custom/table-pagination"
import { cn } from "@/lib/utils"
import {
  useMyChangeRequests,
  useCreateChangeRequest,
  useCancelMyChangeRequest,
} from "@/hooks/use-schedule-change-request"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import { useTimeFormat } from "@/hooks/use-time-format"
import type {
  ChangeRequestStatus,
  ChangeRequestType,
  ScheduleChangeRequest,
} from "@/lib/schedule-change-request-api"
import type { SchedulePolicyPayload, Weekday } from "@/lib/schedule-policy-api"

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  ChangeRequestStatus,
  "amber" | "green" | "red" | "gray"
> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "gray",
}

const STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

const STATUS_FILTERS: { label: string; value?: ChangeRequestStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
]

const TYPES: ChangeRequestType[] = [
  "SHIFT_CHANGE",
  "DAY_OFF",
  "PERMANENT_POLICY_CHANGE",
]

const TYPE_LABEL: Record<ChangeRequestType, string> = {
  SHIFT_CHANGE: "Shift change",
  DAY_OFF: "Day off",
  PERMANENT_POLICY_CHANGE: "Permanent change",
}

const TYPE_DESC: Record<ChangeRequestType, string> = {
  SHIFT_CHANGE: "Temporary change to your shift hours",
  DAY_OFF: "Adjust which days you work",
  PERMANENT_POLICY_CHANGE: "A lasting change to your schedule",
}

const TYPE_COLOR: Record<ChangeRequestType, "blue" | "purple" | "amber"> = {
  SHIFT_CHANGE: "blue",
  DAY_OFF: "purple",
  PERMANENT_POLICY_CHANGE: "amber",
}

// Employees pick a single clock-in time plus whether it's the earliest or latest
// bound; the other bound fills in this many hours away (a fixed-width window).
// Required hours / late grace stay admin-owned (preserved from the current policy,
// never edited here).
const WINDOW_SPAN_HOURS = 3

type ClockAnchor = "earliest" | "latest"

const WEEKDAYS: { code: Weekday; label: string }[] = [
  { code: "MON", label: "Mon" },
  { code: "TUE", label: "Tue" },
  { code: "WED", label: "Wed" },
  { code: "THU", label: "Thu" },
  { code: "FRI", label: "Fri" },
  { code: "SAT", label: "Sat" },
  { code: "SUN", label: "Sun" },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
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

// Shift an "HH:mm" time by whole hours, clamped to within the same day.
function shiftTime(hhmm: string, deltaHours: number): string {
  if (!hhmm) return ""
  const [h, m] = hhmm.split(":").map(Number)
  const total = Math.max(
    0,
    Math.min(23 * 60 + 59, h * 60 + m + deltaHours * 60)
  )
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`
}

function summarizePayload(
  p: SchedulePolicyPayload,
  fmt: (t: string | null | undefined) => string
) {
  return `Clock-in ${fmt(p.earliestClockIn)} – ${fmt(p.latestClockIn)} · ${
    p.requiredHours ?? "—"
  }h/day · ${(p.workdays ?? []).join(", ") || "—"}`
}

// ── Effective-date range presets ──────────────────────────────────────────────

// Local YYYY-MM-DD (avoids the UTC shift of toISOString()).
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // Monday-based
  return x
}

const todayISO = toISODate(new Date())

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
    label: "Next week",
    range: () => {
      const s = startOfWeek(new Date())
      const from = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)
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
    label: "Next month",
    range: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth() + 1, 1),
        until: new Date(n.getFullYear(), n.getMonth() + 2, 0),
      }
    },
  },
  {
    label: "Next 3 months",
    range: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth() + 1, 1),
        until: new Date(n.getFullYear(), n.getMonth() + 4, 0),
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
    label: "Next year",
    range: () => {
      const y = new Date().getFullYear() + 1
      return { from: new Date(y, 0, 1), until: new Date(y, 11, 31) }
    },
  },
]

// ── Request Form Dialog ─────────────────────────────────────────────────────

function RequestFormDialog({
  open,
  onClose,
  current,
}: {
  open: boolean
  onClose: () => void
  current?: SchedulePolicyPayload
}) {
  const { formatTime } = useTimeFormat()
  const [type, setType] = useState<ChangeRequestType>("SHIFT_CHANGE")
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [effectiveUntil, setEffectiveUntil] = useState("")
  const [anchor, setAnchor] = useState<ClockAnchor>("latest")
  const [preferredTime, setPreferredTime] = useState("")
  const [workdays, setWorkdays] = useState<Weekday[]>([])
  const [reason, setReason] = useState("")

  const createMutation = useCreateChangeRequest()

  // Prefill the form from the employee's current effective policy whenever the
  // dialog opens, so the request starts as "my schedule today" and they edit the diff.
  // Default anchor = latest (the shift-start cutoff most people think in), seeded
  // from the current latest clock-in — that reproduces the current window exactly.
  useEffect(() => {
    if (!open) return
    setType("SHIFT_CHANGE")
    setEffectiveFrom("")
    setEffectiveUntil("")
    setAnchor("latest")
    setPreferredTime(current?.latestClockIn ?? current?.earliestClockIn ?? "")
    setWorkdays(current?.workdays ?? [])
    setReason("")
  }, [open, current])

  const isPermanent = type === "PERMANENT_POLICY_CHANGE"
  const showTimes = type !== "DAY_OFF"
  const showWorkdays = type !== "SHIFT_CHANGE"

  // Derived clock-in window: the chosen time is one bound, the other fills in
  // WINDOW_SPAN_HOURS away (a fixed-width window), based on the anchor toggle.
  const derivedEarliest =
    anchor === "earliest"
      ? preferredTime
      : shiftTime(preferredTime, -WINDOW_SPAN_HOURS)
  const derivedLatest =
    anchor === "latest"
      ? preferredTime
      : shiftTime(preferredTime, WINDOW_SPAN_HOURS)

  function toggleWorkday(code: Weekday) {
    setWorkdays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    )
  }

  const canSubmit =
    effectiveFrom !== "" &&
    reason.trim() !== "" &&
    (!showWorkdays || workdays.length > 0) &&
    (!showTimes || preferredTime !== "") &&
    !createMutation.isPending

  function handleSubmit() {
    // Start from the current policy so admin-owned fields (required hours, late
    // grace, etc.) are preserved untouched, then overlay only what the employee edits.
    const requestedPayload: SchedulePolicyPayload = {
      ...current,
      ...(showTimes
        ? {
            earliestClockIn: derivedEarliest,
            latestClockIn: derivedLatest,
          }
        : {}),
      ...(showWorkdays ? { workdays } : {}),
    }

    createMutation.mutate(
      {
        type,
        effectiveFrom,
        effectiveUntil: isPermanent ? null : effectiveUntil || null,
        requestedPayload,
        reason: reason.trim() || null,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={CalendarBlock01Icon}
                size={14}
                strokeWidth={1.8}
                className="text-primary"
              />
            </div>
            File Schedule Change Request
          </DialogTitle>
          <DialogDescription>
            Request a change to your work schedule for HR / supervisor approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Request Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-lg border px-2.5 py-2.5 text-left transition-all",
                    type === t
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <p
                    className={cn(
                      "text-[12px] font-semibold",
                      type === t ? "text-primary" : "text-foreground"
                    )}
                  >
                    {TYPE_LABEL[t]}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                    {TYPE_DESC[t]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Effective range */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              {isPermanent ? "Effective From" : "Effective Range"}{" "}
              <span className="text-red-500">*</span>
            </Label>
            {isPermanent ? (
              <>
                <Input
                  type="date"
                  value={effectiveFrom}
                  min={todayISO}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-9 text-[13px]"
                />
                <p className="text-[10px] text-muted-foreground">
                  Applies permanently from this date.
                </p>
              </>
            ) : (
              <DateRangePicker
                value={{ from: effectiveFrom, until: effectiveUntil }}
                onChange={({ from, until }) => {
                  setEffectiveFrom(from)
                  setEffectiveUntil(until)
                }}
                presets={RANGE_PRESETS}
                minDate={todayISO}
              />
            )}
          </div>

          {/* Requested schedule */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Requested Schedule
            </p>

            {showTimes && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">
                      Clock-in Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">This time is the…</Label>
                    <div className="flex h-9 rounded-lg border border-border bg-muted/40 p-0.5">
                      {(["earliest", "latest"] as ClockAnchor[]).map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAnchor(a)}
                          className={cn(
                            "flex-1 rounded-md text-[12px] font-medium capitalize transition-colors",
                            anchor === a
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Pick one time and which end it is — the other end fills in{" "}
                  {WINDOW_SPAN_HOURS}h away to form your clock-in window.
                </p>

                {/* Derived window readout */}
                <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12px]">
                  <span className="text-primary/70">
                    Allowed clock-in window
                  </span>
                  <span className="font-semibold text-primary tabular-nums">
                    {preferredTime
                      ? `${formatTime(derivedEarliest)} – ${formatTime(derivedLatest)}`
                      : "—"}
                  </span>
                </div>

                {/* Admin-owned fields — preserved, shown read-only */}
                {current && (
                  <p className="text-[10px] text-muted-foreground">
                    Required hours ({current.requiredHours ?? "—"}h/day) and
                    late grace ({current.lateGraceMins ?? 0}m) are set by HR and
                    stay unchanged.
                  </p>
                )}
              </div>
            )}

            {showWorkdays && (
              <div className="space-y-1.5">
                <Label className="text-[12px]">Workdays</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map(({ code, label }) => {
                    const on = workdays.includes(code)
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleWorkday(code)}
                        className={cn(
                          "rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-all",
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Highlighted days are working days; the rest are rest days.
                </p>
              </div>
            )}

            {/* Before → after preview vs current policy */}
            {current && showTimes && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[11px]">
                <span className="text-muted-foreground tabular-nums">
                  {formatTime(current.earliestClockIn)} –{" "}
                  {formatTime(current.latestClockIn)}
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={12}
                  strokeWidth={2}
                  className="text-muted-foreground"
                />
                <span className="font-semibold text-primary tabular-nums">
                  {formatTime(derivedEarliest)} – {formatTime(derivedLatest)}
                </span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Explain why you need this schedule change…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-18 resize-none text-[13px]"
            />
          </div>

          {/* Policy notice */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Your current schedule stays in effect until this request is
              approved. Approved changes take effect on the date you select.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={createMutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            {createMutation.isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Dialog ───────────────────────────────────────────────────────────

function DetailDialog({
  request,
  onClose,
}: {
  request: ScheduleChangeRequest
  onClose: () => void
}) {
  const cancelMutation = useCancelMyChangeRequest()
  const { formatTime } = useTimeFormat()
  const p = request.requestedPayload

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Change Request</DialogTitle>
          <DialogDescription>
            {TYPE_LABEL[request.type] ?? request.type} · filed{" "}
            {fmtDateTime(request.createdAt)}
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

          {/* Core grid */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Type</p>
              <StatusBadge
                variant={TYPE_COLOR[request.type]}
                className="mt-0.5"
                dot={false}
              >
                {TYPE_LABEL[request.type] ?? request.type}
              </StatusBadge>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Effective</p>
              <p className="mt-0.5 font-semibold text-foreground tabular-nums">
                {fmtDate(request.effectiveFrom)}
                {request.effectiveUntil
                  ? ` → ${fmtDate(request.effectiveUntil)}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Requested policy */}
          <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-wider text-primary/70 uppercase">
              Requested Schedule
            </p>
            <p className="text-[12px] text-foreground">
              {summarizePayload(p, formatTime)}
            </p>
          </div>

          {/* Reason */}
          {request.reason && (
            <div className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Reason
              </p>
              <p className="text-[12px] text-foreground italic">
                “{request.reason}”
              </p>
            </div>
          )}

          {/* Review note */}
          {(request.reviewNote || request.reviewedByName) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                Reviewer Remarks
              </p>
              {request.reviewNote && (
                <p className="text-[12px] text-blue-700 dark:text-blue-300">
                  {request.reviewNote}
                </p>
              )}
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

export function MyScheduleSection() {
  const [statusFilter, setStatusFilter] = useState<
    ChangeRequestStatus | undefined
  >(undefined)
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<ScheduleChangeRequest | null>(null)

  const { formatTime } = useTimeFormat()
  const q = useMyChangeRequests({ page, size: 20 })
  const policyQ = useMyPolicy()
  const policy = policyQ.data

  const all = q.data?.content ?? []
  const items = statusFilter
    ? all.filter((r) => r.status === statusFilter)
    : all
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const counts = {
    pending: all.filter((r) => r.status === "PENDING").length,
    approved: all.filter((r) => r.status === "APPROVED").length,
    rejected: all.filter((r) => r.status === "REJECTED").length,
  }

  const shiftLabel = policy
    ? `${formatTime(policy.earliestClockIn)} – ${formatTime(policy.latestClockIn)}`
    : "—"

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">
            Change Schedule
          </h1>
          <p className="text-[12px] text-muted-foreground">
            File and track your schedule change requests
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} />
          New Request
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Current Shift"
          value={
            policyQ.isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <span className="text-sm font-semibold tabular-nums">
                {shiftLabel}
              </span>
            )
          }
          meta={
            policy ? `${policy.requiredHours ?? "—"}h/day` : "Your schedule"
          }
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
          meta="Applied to schedule"
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
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setStatusFilter(f.value)
                  setPage(0)
                }}
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
                "Effective",
                "Requested",
                "Status",
                "Reviewed by",
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
                    {[0, 1, 2, 3, 4, 5].map((j) => (
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
                  colSpan={6}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon
                      icon={Calendar01Icon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No schedule change requests found.</p>
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
                  <TableCell>
                    <StatusBadge variant={TYPE_COLOR[r.type]} dot={false}>
                      {TYPE_LABEL[r.type] ?? r.type}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {fmtDate(r.effectiveFrom)}
                    {r.effectiveUntil && ` → ${fmtDate(r.effectiveUntil)}`}
                  </TableCell>
                  <TableCell className="max-w-55">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {summarizePayload(r.requestedPayload, formatTime)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {r.reviewedByName ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {fmtDate(r.createdAt.split("T")[0])}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && !statusFilter && (
          <div className="border-t border-border p-4">
            <TablePagination
              page={page + 1}
              totalPages={totalPages}
              total={total}
              pageSize={20}
              setPage={(p) => setPage(p - 1)}
              setPageSize={() => {}}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <RequestFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        current={policy}
      />
      {detail && (
        <DetailDialog request={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
