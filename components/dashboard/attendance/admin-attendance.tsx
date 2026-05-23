"use client"

import { useState, useMemo } from "react"
import { useTeamAttendance } from "@/hooks/use-admin-attendance"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ViewIcon,
  GridViewIcon,
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

function TableView({ records }: { records: TeamAttendanceRecord[] }) {
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
                colSpan={7}
                className="py-10 text-center text-[13px] text-muted-foreground"
              >
                No attendance records for this date.
              </TableCell>
            </TableRow>
          ) : (
            records.map((r) => (
              <TableRow key={r.id}>
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
                  {r.timeIn ?? "—"}
                </TableCell>
                <TableCell className="tabular-nums">
                  {r.timeOut ?? "—"}
                </TableCell>
                <TableCell className="tabular-nums">{r.hoursWorked}</TableCell>
                <TableCell>
                  <StatusBadge variant={STATUS_VARIANT[r.status] ?? "gray"}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </StatusBadge>
                </TableCell>
                <TableCell className="tabular-nums text-[13px]">
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

function CardView({ records }: { records: TeamAttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-[13px] text-muted-foreground">
        No attendance records for this date.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border bg-card p-4 space-y-3"
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
              <p className="text-[11px] text-muted-foreground">{r.employeeId}</p>
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
              <p className="font-medium tabular-nums">{r.timeIn ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Out</p>
              <p className="font-medium tabular-nums">{r.timeOut ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Hours Worked</p>
              <p className="font-medium tabular-nums">{r.hoursWorked}</p>
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
        </div>
      ))}
    </div>
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
  | "graveyard"
  | "day"

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "leave", label: "On Leave" },
  { key: "graveyard", label: "Graveyard" },
  { key: "day", label: "Day Shift" },
]

export function AdminAttendance() {
  const [date, setDate] = useState(() => toDateStr(new Date()))
  const [view, setView] = useState<ViewMode>("table")
  const [filter, setFilter] = useState<StatusFilter>("all")

  const { data, isLoading } = useTeamAttendance({ date })
  const records = data?.content ?? []

  // counts for stat chips
  const counts = useMemo(
    () => ({
      present: records.filter((r) => r.status === "present").length,
      late: records.filter((r) => r.status === "late").length,
      absent: records.filter((r) => r.status === "absent").length,
      leave: records.filter((r) => r.status === "leave").length,
      graveyard: records.filter((r) => r.shift === "graveyard").length,
      day: records.filter((r) => r.shift === "day").length,
    }),
    [records]
  )

  const filtered = useMemo(() => {
    if (filter === "all") return records
    if (filter === "graveyard") return records.filter((r) => r.shift === "graveyard")
    if (filter === "day") return records.filter((r) => r.shift === "day")
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
          <Button variant="outline" size="icon-sm" onClick={() => shiftDate(-1)}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} strokeWidth={2} />
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-8 rounded-lg border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
          <StatChip label="Present" count={counts.present} accent="bg-green-500" />
          <StatChip label="Late" count={counts.late} accent="bg-amber-500" />
          <StatChip label="Absent" count={counts.absent} accent="bg-red-500" />
          <StatChip label="On Leave" count={counts.leave} accent="bg-blue-500" />
          <StatChip label="Graveyard" count={counts.graveyard} accent="bg-indigo-500" />
          <StatChip label="Day Shift" count={counts.day} accent="bg-orange-400" />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "relative pb-2 px-3 text-[13px] font-medium transition-colors",
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
        <TableView records={filtered} />
      ) : (
        <CardView records={filtered} />
      )}
    </div>
  )
}
