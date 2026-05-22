"use client"

import { useState } from "react"
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
import { TablePagination } from "@/components/custom/table-pagination"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  Flag01Icon,
  FileExportIcon,
  StarIcon,
} from "@hugeicons/core-free-icons"
import { useScheduleEntries } from "@/hooks/use-schedule"
import { type ScheduleFilters, type ScheduleEntry, type ScheduleStatus, type AttendanceStatus, type TeacherStatus } from "@/lib/schedule-api"
import { cn } from "@/lib/utils"

// ── Status helpers ────────────────────────────────────────────────────────

function scheduleStatusVariant(
  s: ScheduleStatus
): "green" | "blue" | "amber" | "red" | "gray" {
  switch (s) {
    case "completed":
      return "green"
    case "ongoing":
      return "blue"
    case "upcoming":
      return "amber"
    case "no-show":
      return "red"
    case "cancelled":
      return "gray"
  }
}

function attendanceVariant(
  s: AttendanceStatus | null
): "green" | "amber" | "red" | "gray" {
  if (!s) return "gray"
  switch (s) {
    case "present":
      return "green"
    case "late":
      return "amber"
    case "absent":
      return "red"
    case "no-show":
      return "red"
  }
}

function teacherStatusVariant(
  s: TeacherStatus
): "green" | "amber" | "red" {
  switch (s) {
    case "online":
      return "green"
    case "late":
      return "amber"
    case "offline":
      return "red"
  }
}

function rowBg(s: ScheduleStatus) {
  switch (s) {
    case "completed":
      return "bg-green-50/40 dark:bg-green-900/10"
    case "ongoing":
      return "bg-blue-50/40 dark:bg-blue-900/10"
    case "upcoming":
      return "bg-amber-50/30 dark:bg-amber-900/10"
    case "no-show":
      return "bg-red-50/40 dark:bg-red-900/10"
    case "cancelled":
      return ""
  }
}

function label(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ")
}

// ── Expanded detail row ───────────────────────────────────────────────────

function ExpandedDetail({ entry }: { entry: ScheduleEntry }) {
  return (
    <TableRow className="bg-muted/30 dark:bg-muted/10">
      <TableCell colSpan={17} className="px-6 py-4">
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[12px] sm:grid-cols-3 lg:grid-cols-4">
          {[
            ["Class ID", entry.classId],
            ["Date", entry.date],
            ["Start Time", entry.startTime],
            ["End Time", entry.endTime],
            ["Duration", `${entry.durationMinutes} min`],
            ["Teacher", entry.teacherName],
            ["Teacher Status", label(entry.teacherStatus)],
            ["Student", entry.studentName],
            ["Schedule Status", label(entry.scheduleStatus)],
            ["Attendance", entry.attendanceStatus ? label(entry.attendanceStatus) : "—"],
            ["Time In", entry.timeIn ?? "—"],
            ["Time Out", entry.timeOut ?? "—"],
            ["Late (min)", entry.lateMinutes > 0 ? String(entry.lateMinutes) : "—"],
            ["Team Leader", entry.teamLeader],
            ["Rating", entry.rating != null ? `${entry.rating.toFixed(1)} / 5` : "—"],
            ["Issue Flag", entry.issueFlag ? "Yes" : "No"],
            ["Last Updated", entry.lastUpdated],
            ["File Version", `#${entry.versionId}`],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-muted-foreground/70 uppercase tracking-wide text-[10px] font-semibold">
                {k}
              </p>
              <p className="mt-0.5 font-medium text-foreground">{v}</p>
            </div>
          ))}
          {entry.sessionNotes && (
            <div className="col-span-2 lg:col-span-4">
              <p className="text-muted-foreground/70 uppercase tracking-wide text-[10px] font-semibold">
                Session Notes
              </p>
              <p className="mt-0.5 text-foreground">{entry.sessionNotes}</p>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Main table ─────────────────────────────────────────────────────────────

interface Props {
  filters: ScheduleFilters
}

const COLUMNS = [
  "Class ID",
  "Date",
  "Time",
  "Dur.",
  "Teacher",
  "T. Status",
  "Student",
  "Schedule",
  "Attendance",
  "Time In",
  "Time Out",
  "Late",
  "Notes",
  "Team Leader",
  "Rating",
  "⚑",
  "Updated",
  "",
]

export function ScheduleTable({ filters }: Props) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data, isLoading, isError } = useScheduleEntries({
    ...filters,
    page: page - 1,
    size: pageSize,
  })

  const entries = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  function toggleRow(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === entries.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(entries.map((e) => e.id)))
    }
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2">
          <span className="text-[12px] font-medium">
            {selected.size} selected
          </span>
          <Button size="xs" variant="outline">
            <HugeiconsIcon icon={FileExportIcon} size={12} strokeWidth={2} />
            Export selected
          </Button>
          <Button size="xs" variant="outline">
            <HugeiconsIcon
              icon={Flag01Icon}
              size={12}
              strokeWidth={2}
              className="text-red-500"
            />
            Flag issues
          </Button>
          <button
            className="ml-auto text-[12px] text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load schedule data
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Checkbox */}
              <TableHead className="w-8 px-3">
                <input
                  type="checkbox"
                  className="cursor-pointer accent-primary"
                  checked={
                    entries.length > 0 && selected.size === entries.length
                  }
                  onChange={toggleAll}
                />
              </TableHead>
              {COLUMNS.map((h) => (
                <TableHead
                  key={h}
                  className={cn(
                    "whitespace-nowrap text-[11px]",
                    h === "" ? "w-8 text-right" : undefined
                  )}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length + 1}
                  className="py-8 text-center text-[13px] text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length + 1}
                  className="py-8 text-center text-[13px] text-muted-foreground"
                >
                  No schedules found
                </TableCell>
              </TableRow>
            ) : (
              entries.flatMap((entry) => {
                const rows = [
                  <TableRow
                    key={entry.id}
                    className={cn(
                      "cursor-pointer text-[12px] transition-colors",
                      rowBg(entry.scheduleStatus),
                      expandedId === entry.id && "ring-1 ring-inset ring-primary/20"
                    )}
                    onClick={() => toggleRow(entry.id)}
                  >
                    {/* Checkbox */}
                    <TableCell
                      className="px-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="cursor-pointer accent-primary"
                        checked={selected.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {entry.classId}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {entry.date}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap text-muted-foreground">
                      {entry.startTime}–{entry.endTime}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {entry.durationMinutes}m
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {entry.teacherName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={teacherStatusVariant(entry.teacherStatus)}
                        dot
                      >
                        {label(entry.teacherStatus)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {entry.studentName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={scheduleStatusVariant(entry.scheduleStatus)}
                        dot={false}
                      >
                        {label(entry.scheduleStatus)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {entry.attendanceStatus ? (
                        <StatusBadge
                          variant={attendanceVariant(entry.attendanceStatus)}
                          dot={false}
                        >
                          {label(entry.attendanceStatus)}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {entry.timeIn ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {entry.timeOut ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {entry.lateMinutes > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {entry.lateMinutes}m
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-muted-foreground">
                      {entry.sessionNotes ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {entry.teamLeader}
                    </TableCell>
                    <TableCell>
                      {entry.rating != null ? (
                        <div className="flex items-center gap-1">
                          <HugeiconsIcon
                            icon={StarIcon}
                            size={11}
                            strokeWidth={0}
                            className="fill-amber-400 text-amber-400"
                          />
                          <span className="tabular-nums">
                            {entry.rating.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.issueFlag && (
                        <HugeiconsIcon
                          icon={Flag01Icon}
                          size={13}
                          strokeWidth={2}
                          className="text-red-500"
                        />
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                      {entry.lastUpdated}
                    </TableCell>
                    <TableCell className="text-right">
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        size={13}
                        strokeWidth={2}
                        className={cn(
                          "text-muted-foreground transition-transform",
                          expandedId === entry.id && "rotate-180"
                        )}
                      />
                    </TableCell>
                  </TableRow>,
                ]

                if (expandedId === entry.id) {
                  rows.push(<ExpandedDetail key={`${entry.id}-detail`} entry={entry} />)
                }

                return rows
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        setPage={setPage}
        setPageSize={setPageSize}
      />
    </div>
  )
}
