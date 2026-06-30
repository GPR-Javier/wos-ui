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
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ViewIcon,
  GridViewIcon,
  CoffeeIcon,
} from "@hugeicons/core-free-icons"
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

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0]!
}

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
                No attendance records for this date.
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
    return <EmptyState title="No attendance records for this date." />
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
  const [date, setDate] = useState(() => toDateStr(new Date()))
  const [view, setView] = useState<ViewMode>("table")
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [selected, setSelected] = useState<TeamAttendanceRecord | null>(null)

  const { data, isLoading } = useTeamAttendance({ date })
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

  function shiftDate(delta: number) {
    const d = new Date(date + "T00:00:00")
    d.setDate(d.getDate() + delta)
    setDate(toDateStr(d))
  }

  return (
    <div className="space-y-4">
      {/* Date nav + view toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftDate(-1)}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} strokeWidth={2} />
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-8 rounded-lg border bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftDate(1)}
            disabled={date >= toDateStr(new Date())}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
          </Button>
          <span className="text-[13px] text-muted-foreground">
            {formatDate(date)}
          </span>
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

      {selected && (
        <DetailDialog record={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
