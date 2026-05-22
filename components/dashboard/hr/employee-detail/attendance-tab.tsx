"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/custom/status-badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { attendanceRecords } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"

// ── Types & constants ──────────────────────────────────────────────────────────

interface MonthStats {
  present: number
  late: number
  absent: number
  leave: number
  ot: number
  workDays: number
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const NOW_MONTH = new Date().getMonth()
const NOW_YEAR = new Date().getFullYear()

// Mock per-month stats — future months are zeroed
const STATS: MonthStats[] = [
  { present: 18, late: 1, absent: 0, leave: 1, ot: 4.5, workDays: 20 },
  { present: 16, late: 2, absent: 1, leave: 1, ot: 3.25, workDays: 20 },
  { present: 17, late: 2, absent: 0, leave: 2, ot: 6.75, workDays: 21 },
  { present: 13, late: 1, absent: 1, leave: 2, ot: 2.5, workDays: 17 },
  { present: 0, late: 0, absent: 0, leave: 0, ot: 0, workDays: 22 },
  { present: 0, late: 0, absent: 0, leave: 0, ot: 0, workDays: 21 },
  { present: 0, late: 0, absent: 0, leave: 0, ot: 0, workDays: 23 },
  { present: 0, late: 0, absent: 0, leave: 0, ot: 0, workDays: 21 },
  { present: 0, late: 0, absent: 0, leave: 0, ot: 0, workDays: 20 },
  { present: 0, late: 0, absent: 0, leave: 0, ot: 0, workDays: 23 },
  { present: 0, late: 0, absent: 0, leave: 0, ot: 0, workDays: 20 },
  { present: 0, late: 0, absent: 0, leave: 0, ot: 0, workDays: 22 },
]

// Colors for segments
const COLORS = {
  present: {
    stroke: "#60a5fa",
    fill: "bg-blue-400",
    label: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-400/80",
  },
  late: {
    stroke: "#fbbf24",
    fill: "bg-amber-400",
    label: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-400/80",
  },
  absent: {
    stroke: "#f87171",
    fill: "bg-red-400",
    label: "text-red-600 dark:text-red-400",
    bar: "bg-red-400/80",
  },
  leave: {
    stroke: "#a78bfa",
    fill: "bg-violet-400",
    label: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-400/80",
  },
}

const statusVariant: Record<
  string,
  "green" | "red" | "amber" | "gray" | "blue" | "purple"
> = {
  present: "green",
  late: "amber",
  leave: "blue",
  restday: "gray",
  overtime: "purple",
  overbreak: "amber",
  undertime: "red",
  absent: "red",
}

// ── Donut chart ────────────────────────────────────────────────────────────────

function DonutChart({ stats }: { stats: MonthStats }) {
  const total = stats.present + stats.late + stats.absent + stats.leave
  if (total === 0) {
    return (
      <div className="flex size-36 items-center justify-center rounded-full border-[14px] border-muted">
        <span className="text-[11px] text-muted-foreground">No data</span>
      </div>
    )
  }

  const R = 54
  const CX = 70
  const CY = 70
  const circ = 2 * Math.PI * R

  const segments = [
    { key: "present", value: stats.present, color: COLORS.present.stroke },
    { key: "late", value: stats.late, color: COLORS.late.stroke },
    { key: "absent", value: stats.absent, color: COLORS.absent.stroke },
    { key: "leave", value: stats.leave, color: COLORS.leave.stroke },
  ].filter((s) => s.value > 0)

  let accumulated = 0
  const presentPct = Math.round((stats.present / total) * 100)

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* Track */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth={14}
        className="text-muted"
      />
      {/* Segments */}
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {segments.map((seg) => {
          const frac = seg.value / total
          const dash = frac * circ
          const offset = -(accumulated * circ)
          accumulated += frac
          return (
            <circle
              key={seg.key}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          )
        })}
      </g>
      {/* Center label */}
      <text
        x={CX}
        y={CY - 5}
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="currentColor"
        className="fill-foreground"
      >
        {presentPct}%
      </text>
      <text
        x={CX}
        y={CY + 12}
        textAnchor="middle"
        fontSize="10"
        fill="currentColor"
        className="fill-muted-foreground"
      >
        Present
      </text>
    </svg>
  )
}

// ── Stacked bar chart ──────────────────────────────────────────────────────────

const BAR_H = 112

function BarChart({ selectedMonth }: { selectedMonth: number }) {
  const maxTotal = Math.max(
    ...STATS.map((s) => s.present + s.late + s.absent + s.leave),
    1
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Bars */}
      <div className="flex items-end gap-1" style={{ height: BAR_H }}>
        {STATS.map((s, i) => {
          const total = s.present + s.late + s.absent + s.leave
          const barH = total > 0 ? (total / maxTotal) * BAR_H : 0
          const isSel = i === selectedMonth
          const isEmpty = total === 0

          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              {isEmpty ? (
                <div
                  className="w-full max-w-[28px] rounded-t-sm border-t-2 border-dashed border-border/40"
                  style={{ height: 6 }}
                />
              ) : (
                <div
                  className={cn(
                    "w-full max-w-[28px] overflow-hidden rounded-t-sm transition-opacity",
                    !isSel && "opacity-50"
                  )}
                  style={{ height: barH }}
                >
                  <div className="flex h-full flex-col-reverse">
                    {s.present > 0 && (
                      <div
                        style={{ flex: s.present }}
                        className={COLORS.present.bar}
                      />
                    )}
                    {s.late > 0 && (
                      <div
                        style={{ flex: s.late }}
                        className={COLORS.late.bar}
                      />
                    )}
                    {s.leave > 0 && (
                      <div
                        style={{ flex: s.leave }}
                        className={COLORS.leave.bar}
                      />
                    )}
                    {s.absent > 0 && (
                      <div
                        style={{ flex: s.absent }}
                        className={COLORS.absent.bar}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1">
        {MONTH_SHORT.map((m, i) => (
          <div key={i} className="flex flex-1 justify-center">
            <span
              className={cn(
                "text-[9px] tabular-nums transition-colors",
                i === selectedMonth
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {m}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
        {(["present", "late", "absent", "leave"] as const).map((k) => (
          <div key={k} className="flex items-center gap-1">
            <div className={cn("size-2 rounded-sm", COLORS[k].fill)} />
            <span className="text-[10px] text-muted-foreground capitalize">
              {k}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main tab ───────────────────────────────────────────────────────────────────

export function AttendanceTab() {
  const [year, setYear] = useState(NOW_YEAR)
  const [month, setMonth] = useState(NOW_MONTH)

  const stats = STATS[month] ?? STATS[0]!
  const hasData = stats.present + stats.late + stats.absent + stats.leave > 0

  // Use real records for current month, placeholder for others
  const records = month === NOW_MONTH ? attendanceRecords : []

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="flex size-6 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={11} strokeWidth={2} />
          </button>
          <span className="text-[13px] font-semibold tabular-nums">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="flex size-6 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
            disabled={year >= NOW_YEAR}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={11} strokeWidth={2} />
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {MONTH_NAMES.map((name, i) => {
            const isFuture = year === NOW_YEAR && i > NOW_MONTH
            return (
              <button
                key={i}
                disabled={isFuture}
                onClick={() => setMonth(i)}
                className={cn(
                  "rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                  month === i
                    ? "bg-primary text-primary-foreground"
                    : isFuture
                      ? "cursor-not-allowed text-muted-foreground/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {MONTH_SHORT[i]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        {/* Donut + legend */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-3 text-[13px] font-semibold">
            {MONTH_NAMES[month]} {year} — Breakdown
          </p>
          <div className="flex items-center gap-6">
            <DonutChart stats={stats} />
            {hasData && (
              <div className="space-y-2">
                {(["present", "late", "absent", "leave"] as const).map((k) => {
                  const val = stats[k] as number
                  const total =
                    stats.present + stats.late + stats.absent + stats.leave
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-2.5 shrink-0 rounded-sm",
                          COLORS[k].fill
                        )}
                      />
                      <span className="w-12 text-[12px] text-muted-foreground capitalize">
                        {k}
                      </span>
                      <span className="w-6 text-right text-[12px] font-semibold tabular-nums">
                        {val}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        ({pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bar chart */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-3 text-[13px] font-semibold">
            Monthly Overview — {year}
          </p>
          <BarChart selectedMonth={month} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Present",
            value: String(stats.present),
            sub: `of ${stats.workDays} work days`,
          },
          { label: "Late", value: String(stats.late), sub: "arrivals" },
          { label: "Absent", value: String(stats.absent), sub: "days" },
          { label: "OT Hours", value: `${stats.ot}h`, sub: "this month" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-3">
          <h3 className="text-[13px] font-semibold">
            Daily Records — {MONTH_NAMES[month]} {year}
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Date",
                "Day",
                "Time In",
                "Time Out",
                "Hours",
                "OT",
                "Status",
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
                  className="py-8 text-center text-[13px] text-muted-foreground"
                >
                  {hasData
                    ? "Detailed records not available"
                    : "No attendance data for this month"}
                </TableCell>
              </TableRow>
            ) : (
              records.map((rec, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium tabular-nums">
                    {rec.date}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rec.day}
                  </TableCell>
                  <TableCell className="tabular-nums">{rec.timeIn}</TableCell>
                  <TableCell className="tabular-nums">{rec.timeOut}</TableCell>
                  <TableCell className="tabular-nums">
                    {rec.hoursWorked}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {rec.otHours}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={statusVariant[rec.status] ?? "gray"}>
                      {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
