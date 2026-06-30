"use client"

import { useState, useMemo, type ReactNode } from "react"
import { useTeamAttendance } from "@/hooks/use-admin-attendance"
import { useTimeFormat } from "@/hooks/use-time-format"
import { StatusBadge } from "@/components/custom/status-badge"
import { EmptyState } from "@/components/custom/empty-state"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DateRangePicker,
  type DateRangePreset,
  type DateRangeValue,
} from "@/components/ui/date-range-picker"
import { TablePagination } from "@/components/custom/table-pagination"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon, GridViewIcon, CoffeeIcon } from "@hugeicons/core-free-icons"
import type { TeamAttendanceRecord } from "@/lib/admin-api"

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  string,
  "green" | "amber" | "red" | "blue" | "purple" | "gray"
> = {
  present: "green",
  late: "amber",
  absent: "red",
  leave: "blue",
  overtime: "purple",
  undertime: "red",
  overbreak: "amber",
  restday: "gray",
  holiday: "gray",
}

/** Local-time `YYYY-MM-DD` (avoids the UTC day-shift of toISOString). */
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`
}

/** The current quarter — the default range. */
function thisQuarterRange(): DateRangeValue {
  const n = new Date()
  const r = quarterRange(n.getFullYear(), quarterOf(n.getMonth()))
  return { from: isoLocal(r.from), until: isoLocal(r.until) }
}

/** Quarter (1–4) a month index (0–11) belongs to. */
function quarterOf(monthIndex: number) {
  return Math.floor(monthIndex / 3) + 1
}

/** First/last day of the given quarter (1–4) in a year. */
function quarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3
  return {
    from: new Date(year, startMonth, 1),
    until: new Date(year, startMonth + 3, 0),
  }
}

/** The previous quarter, rolling back to Q4 of the prior year when the current quarter is Q1. */
function lastQuarter(): { year: number; quarter: number } {
  const n = new Date()
  const q = quarterOf(n.getMonth())
  return q === 1
    ? { year: n.getFullYear() - 1, quarter: 4 }
    : { year: n.getFullYear(), quarter: q - 1 }
}

/**
 * If {@link range} exactly matches this quarter or last quarter, return its label (e.g. "Q2 2026");
 * otherwise null — so the indicator only shows for those two quarter ranges.
 */
function quarterLabelForRange(range: DateRangeValue): string | null {
  const n = new Date()
  const lq = lastQuarter()
  const candidates = [
    { year: n.getFullYear(), quarter: quarterOf(n.getMonth()) },
    { year: lq.year, quarter: lq.quarter },
  ]
  for (const { year, quarter } of candidates) {
    const r = quarterRange(year, quarter)
    if (range.from === isoLocal(r.from) && range.until === isoLocal(r.until)) {
      return `Q${quarter} ${year}`
    }
  }
  return null
}

// Quick-select presets for the range picker (default view is "This month").
const RANGE_PRESETS: DateRangePreset[] = [
  {
    label: "Today",
    range: () => {
      const n = new Date()
      return { from: n, until: n }
    },
  },
  {
    label: "This week",
    range: () => {
      const n = new Date()
      const from = new Date(
        n.getFullYear(),
        n.getMonth(),
        n.getDate() - n.getDay()
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
    label: "This quarter",
    range: () => {
      const n = new Date()
      return quarterRange(n.getFullYear(), quarterOf(n.getMonth()))
    },
  },
  {
    label: "Last quarter",
    range: () => {
      const { year, quarter } = lastQuarter()
      return quarterRange(year, quarter)
    },
  },
  {
    label: "This year",
    range: () => {
      const y = new Date().getFullYear()
      return { from: new Date(y, 0, 1), until: new Date(y, 11, 31) }
    },
  },
]

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function initials(r: TeamAttendanceRecord) {
  return ((r.firstName[0] ?? "") + (r.lastName[0] ?? "")).toUpperCase()
}

// Minutes → "45 min" / "1h 30m" / "—".
function fmtMins(m?: number | null) {
  if (!m || m <= 0) return "—"
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm ? `${h}h ${mm}m` : `${h}h`
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({
  label,
  count,
  accent,
}: {
  label: string
  count: number
  accent: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <span className={cn("size-2 shrink-0 rounded-full", accent)} />
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{count}</span>
    </div>
  )
}

// ── Table view ─────────────────────────────────────────────────────────────────

function TableView({
  records,
  onSelect,
}: {
  records: TeamAttendanceRecord[]
  onSelect: (r: TeamAttendanceRecord) => void
}) {
  const { formatTime } = useTimeFormat()
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Employee",
              "Shift",
              "Time In",
              "Time Out",
              "Hours Worked",
              "Break",
              "Overtime",
              "Undertime",
              "Status",
              "Time Late",
            ].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="py-10 text-center text-[13px] text-muted-foreground"
              >
                No attendance records in this range.
              </TableCell>
            </TableRow>
          ) : (
            records.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onSelect(r)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {initials(r)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.employeeId}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      r.shift === "graveyard"
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    )}
                  >
                    {r.shift === "graveyard" ? "Graveyard" : "Day shift"}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatTime(r.timeIn)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatTime(r.timeOut)}
                </TableCell>
                <TableCell className="tabular-nums">{r.hoursWorked}</TableCell>
                <TableCell className="text-[13px] tabular-nums">
                  {r.breakMinutes && r.breakMinutes > 0 ? (
                    <span className="text-foreground">
                      {fmtMins(r.breakMinutes)}
                      {r.breakCount ? (
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          ({r.breakCount})
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-[13px] tabular-nums">
                  {r.overtimeHours ? (
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {r.overtimeHours}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-[13px] tabular-nums">
                  {r.undertimeMinutes && r.undertimeMinutes > 0 ? (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {fmtMins(r.undertimeMinutes)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={STATUS_VARIANT[r.status] ?? "gray"}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-[13px] tabular-nums">
                  {r.lateMinutes && r.lateMinutes > 0
                    ? `${r.lateMinutes} min`
                    : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Card view ──────────────────────────────────────────────────────────────────

function CardView({
  records,
  onSelect,
}: {
  records: TeamAttendanceRecord[]
  onSelect: (r: TeamAttendanceRecord) => void
}) {
  const { formatTime } = useTimeFormat()
  if (records.length === 0) {
    return <EmptyState title="No attendance records in this range." />
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className="space-y-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
              {initials(r)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">
                {r.firstName} {r.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {r.employeeId}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge variant={STATUS_VARIANT[r.status] ?? "gray"}>
              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
            </StatusBadge>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                r.shift === "graveyard"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              )}
            >
              {r.shift === "graveyard" ? "Graveyard" : "Day shift"}
            </span>
          </div>

          {/* Time row */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <p className="text-muted-foreground">Time In</p>
              <p className="font-medium tabular-nums">{formatTime(r.timeIn)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Out</p>
              <p className="font-medium tabular-nums">
                {formatTime(r.timeOut)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Hours Worked</p>
              <p className="font-medium tabular-nums">{r.hoursWorked}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Overtime</p>
              <p
                className={cn(
                  "font-medium tabular-nums",
                  r.overtimeHours ? "text-purple-600 dark:text-purple-400" : ""
                )}
              >
                {r.overtimeHours ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Undertime</p>
              <p
                className={cn(
                  "font-medium tabular-nums",
                  r.undertimeMinutes && r.undertimeMinutes > 0
                    ? "text-red-600 dark:text-red-400"
                    : ""
                )}
              >
                {fmtMins(r.undertimeMinutes)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Break</p>
              <p className="font-medium tabular-nums">
                {fmtMins(r.breakMinutes)}
                {r.breakCount ? (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    ({r.breakCount})
                  </span>
                ) : null}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Late</p>
              <p
                className={cn(
                  "font-medium tabular-nums",
                  r.lateMinutes && r.lateMinutes > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : ""
                )}
              >
                {r.lateMinutes && r.lateMinutes > 0
                  ? `${r.lateMinutes} min`
                  : "—"}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Detail dialog ──────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string
  value: ReactNode
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-[13px] font-semibold tabular-nums", accent)}>
        {value}
      </p>
    </div>
  )
}

function DetailDialog({
  record,
  onClose,
}: {
  record: TeamAttendanceRecord
  onClose: () => void
}) {
  const { formatTime } = useTimeFormat()
  const r = record
  const breaks = r.breaks ?? []
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
              {initials(r)}
            </div>
            <span>
              {r.firstName} {r.lastName}
            </span>
            <StatusBadge variant={STATUS_VARIANT[r.status] ?? "gray"}>
              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
            </StatusBadge>
          </DialogTitle>
          <DialogDescription>
            {r.employeeId} · {formatDate(r.date)} ·{" "}
            {r.shift === "graveyard" ? "Graveyard" : "Day"} shift
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <DetailRow label="Time In" value={formatTime(r.timeIn)} />
          <DetailRow label="Time Out" value={formatTime(r.timeOut)} />
          <DetailRow label="Hours Worked" value={r.hoursWorked} />
          <DetailRow
            label="Time Late"
            value={
              r.lateMinutes && r.lateMinutes > 0 ? `${r.lateMinutes} min` : "—"
            }
            accent={
              r.lateMinutes && r.lateMinutes > 0
                ? "text-amber-600 dark:text-amber-400"
                : undefined
            }
          />
          <DetailRow
            label="Undertime"
            value={fmtMins(r.undertimeMinutes)}
            accent={
              r.undertimeMinutes && r.undertimeMinutes > 0
                ? "text-red-600 dark:text-red-400"
                : undefined
            }
          />
          <DetailRow
            label="Overtime"
            value={r.overtimeHours ?? "—"}
            accent={
              r.overtimeHours
                ? "text-purple-600 dark:text-purple-400"
                : undefined
            }
          />
        </div>

        {/* Breaks breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
              <HugeiconsIcon icon={CoffeeIcon} size={14} strokeWidth={1.8} />
              Breaks
            </p>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {fmtMins(r.breakMinutes)} total
              {r.breakCount ? ` · ${r.breakCount}` : ""}
            </span>
          </div>
          {breaks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-4 text-center text-[12px] text-muted-foreground">
              No breaks recorded.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {breaks.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 text-[12px]"
                >
                  <span className="font-medium text-foreground capitalize">
                    {b.type || "Break"}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatTime(b.startedAt)} –{" "}
                    {b.endedAt ? formatTime(b.endedAt) : "ongoing"}
                  </span>
                  <span className="w-16 text-right font-semibold tabular-nums">
                    {b.minutes != null ? fmtMins(b.minutes) : "…"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

type ViewMode = "table" | "card"
type StatusFilter =
  | "all"
  | "present"
  | "late"
  | "absent"
  | "leave"
  | "overtime"
  | "graveyard"
  | "day"

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "leave", label: "On Leave" },
  { key: "overtime", label: "Overtime" },
  { key: "graveyard", label: "Graveyard" },
  { key: "day", label: "Day Shift" },
]

export function AdminAttendance() {
  // Default to the current quarter; quick presets + a custom range are available in the picker.
  const [range, setRange] = useState<DateRangeValue>(thisQuarterRange)
  const [view, setView] = useState<ViewMode>("table")
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [selected, setSelected] = useState<TeamAttendanceRecord | null>(null)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(50)

  // Indicator: shown only when the selected range is exactly this quarter or last quarter,
  // labelled with that quarter (e.g. "Q2 2026"); hidden for any other range.
  const quarterLabel = quarterLabelForRange(range)

  const { data, isLoading } = useTeamAttendance({
    from: range.from,
    to: range.until,
    page,
    size,
  })
  const records = data?.content ?? []

  // counts for stat chips
  const counts = useMemo(
    () => ({
      present: records.filter((r) => r.status === "present").length,
      late: records.filter((r) => r.status === "late").length,
      absent: records.filter((r) => r.status === "absent").length,
      leave: records.filter((r) => r.status === "leave").length,
      overtime: records.filter((r) => !!r.overtimeHours).length,
      graveyard: records.filter((r) => r.shift === "graveyard").length,
      day: records.filter((r) => r.shift === "day").length,
    }),
    [records]
  )

  const filtered = useMemo(() => {
    if (filter === "all") return records
    if (filter === "graveyard")
      return records.filter((r) => r.shift === "graveyard")
    if (filter === "day") return records.filter((r) => r.shift === "day")
    if (filter === "overtime") return records.filter((r) => !!r.overtimeHours)
    return records.filter((r) => r.status === filter)
  }, [records, filter])

  // Picking a new range (preset or custom) returns to the first page.
  function applyRange(v: DateRangeValue) {
    setRange(v)
    setPage(0)
  }

  return (
    <div className="space-y-4">
      {/* Date range + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={range}
            onChange={applyRange}
            presets={RANGE_PRESETS}
            align="start"
            className="w-full sm:w-76"
          />
          {quarterLabel && (
            <span
              title="Selected quarter"
              className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {quarterLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
              view === "table"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HugeiconsIcon icon={ViewIcon} size={13} strokeWidth={2} />
            Table
          </button>
          <button
            onClick={() => setView("card")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
              view === "card"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HugeiconsIcon icon={GridViewIcon} size={13} strokeWidth={2} />
            Cards
          </button>
        </div>
      </div>

      {/* Stat chips */}
      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <StatChip
            label="Present"
            count={counts.present}
            accent="bg-green-500"
          />
          <StatChip label="Late" count={counts.late} accent="bg-amber-500" />
          <StatChip label="Absent" count={counts.absent} accent="bg-red-500" />
          <StatChip
            label="On Leave"
            count={counts.leave}
            accent="bg-blue-500"
          />
          <StatChip
            label="Overtime"
            count={counts.overtime}
            accent="bg-purple-500"
          />
          <StatChip
            label="Graveyard"
            count={counts.graveyard}
            accent="bg-indigo-500"
          />
          <StatChip
            label="Day Shift"
            count={counts.day}
            accent="bg-orange-400"
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "relative px-3 pb-2 text-[13px] font-medium transition-colors",
              filter === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {filter === tab.key && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : view === "table" ? (
        <TableView records={filtered} onSelect={setSelected} />
      ) : (
        <CardView records={filtered} onSelect={setSelected} />
      )}

      {/* Pagination — the status tabs above filter the current page. */}
      {!isLoading && data && data.totalElements > 0 && (
        <TablePagination
          page={page + 1}
          totalPages={data.totalPages}
          total={data.totalElements}
          pageSize={size}
          setPage={(p) => setPage(p - 1)}
          setPageSize={(s) => {
            setSize(s)
            setPage(0)
          }}
          pageSizeOptions={[25, 50, 100]}
        />
      )}

      {selected && (
        <DetailDialog record={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
