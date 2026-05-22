"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import type { Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

interface MonthPerf {
  openSlots: number
  bookedClasses: number
  studentPct: number // 0–100
  totalReviews: number
  fiveStar: number
  lowStar: number // 2 stars and below
  starCounts: [number, number, number, number, number] // 1→5
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const NOW_MONTH = new Date().getMonth()
const NOW_YEAR = new Date().getFullYear()

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

const PERF_DATA: MonthPerf[] = [
  {
    openSlots: 4,
    bookedClasses: 36,
    studentPct: 91,
    totalReviews: 28,
    fiveStar: 19,
    lowStar: 2,
    starCounts: [1, 1, 3, 4, 19],
  },
  {
    openSlots: 6,
    bookedClasses: 34,
    studentPct: 87,
    totalReviews: 26,
    fiveStar: 17,
    lowStar: 3,
    starCounts: [2, 1, 2, 4, 17],
  },
  {
    openSlots: 3,
    bookedClasses: 37,
    studentPct: 93,
    totalReviews: 31,
    fiveStar: 22,
    lowStar: 1,
    starCounts: [0, 1, 3, 5, 22],
  },
  {
    openSlots: 7,
    bookedClasses: 33,
    studentPct: 84,
    totalReviews: 24,
    fiveStar: 14,
    lowStar: 4,
    starCounts: [2, 2, 3, 3, 14],
  },
  {
    openSlots: 0,
    bookedClasses: 0,
    studentPct: 0,
    totalReviews: 0,
    fiveStar: 0,
    lowStar: 0,
    starCounts: [0, 0, 0, 0, 0],
  },
  {
    openSlots: 0,
    bookedClasses: 0,
    studentPct: 0,
    totalReviews: 0,
    fiveStar: 0,
    lowStar: 0,
    starCounts: [0, 0, 0, 0, 0],
  },
  {
    openSlots: 0,
    bookedClasses: 0,
    studentPct: 0,
    totalReviews: 0,
    fiveStar: 0,
    lowStar: 0,
    starCounts: [0, 0, 0, 0, 0],
  },
  {
    openSlots: 0,
    bookedClasses: 0,
    studentPct: 0,
    totalReviews: 0,
    fiveStar: 0,
    lowStar: 0,
    starCounts: [0, 0, 0, 0, 0],
  },
  {
    openSlots: 0,
    bookedClasses: 0,
    studentPct: 0,
    totalReviews: 0,
    fiveStar: 0,
    lowStar: 0,
    starCounts: [0, 0, 0, 0, 0],
  },
  {
    openSlots: 0,
    bookedClasses: 0,
    studentPct: 0,
    totalReviews: 0,
    fiveStar: 0,
    lowStar: 0,
    starCounts: [0, 0, 0, 0, 0],
  },
  {
    openSlots: 0,
    bookedClasses: 0,
    studentPct: 0,
    totalReviews: 0,
    fiveStar: 0,
    lowStar: 0,
    starCounts: [0, 0, 0, 0, 0],
  },
  {
    openSlots: 0,
    bookedClasses: 0,
    studentPct: 0,
    totalReviews: 0,
    fiveStar: 0,
    lowStar: 0,
    starCounts: [0, 0, 0, 0, 0],
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function StarRow({
  count,
  total,
  star,
}: {
  count: number
  total: number
  star: number
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex w-16 items-center justify-end gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            viewBox="0 0 12 12"
            className={cn(
              "size-2.5",
              i < star ? "fill-amber-400" : "fill-muted"
            )}
          >
            <path d="M6 1l1.2 3.6H11L8.1 6.8l1.2 3.6L6 8.2l-3.3 2.2 1.2-3.6L1 4.6h3.8z" />
          </svg>
        ))}
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            star >= 4
              ? "bg-amber-400"
              : star === 3
                ? "bg-amber-300"
                : "bg-red-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-[11px] text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  )
}

function BookingBar({
  data,
  selectedMonth,
}: {
  data: MonthPerf[]
  selectedMonth: number
}) {
  const maxSlots = Math.max(
    ...data.map((d) => d.openSlots + d.bookedClasses),
    1
  )
  const BAR_H = 96

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height: BAR_H }}>
        {data.map((m, i) => {
          const total = m.openSlots + m.bookedClasses
          const barH = total > 0 ? (total / maxSlots) * BAR_H : 0
          const isSel = i === selectedMonth
          const empty = total === 0

          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              {empty ? (
                <div
                  className="w-full max-w-7 rounded-t-sm border-t-2 border-dashed border-border/30"
                  style={{ height: 4 }}
                />
              ) : (
                <div
                  className={cn(
                    "w-full max-w-7 overflow-hidden rounded-t-sm transition-opacity",
                    !isSel && "opacity-40"
                  )}
                  style={{ height: barH }}
                >
                  <div className="flex h-full flex-col-reverse">
                    <div
                      style={{ flex: m.bookedClasses }}
                      className="bg-primary/70"
                    />
                    <div
                      style={{ flex: m.openSlots }}
                      className="bg-muted-foreground/20"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-1">
        {MONTH_SHORT.map((m, i) => (
          <div key={i} className="flex flex-1 justify-center">
            <span
              className={cn(
                "text-[9px] tabular-nums",
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
      <div className="flex gap-3 pt-0.5">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-sm bg-primary/70" />
          <span className="text-[10px] text-muted-foreground">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-sm bg-muted-foreground/30" />
          <span className="text-[10px] text-muted-foreground">Open</span>
        </div>
      </div>
    </div>
  )
}

function StudentPctSparkline({
  data,
  selectedMonth,
}: {
  data: MonthPerf[]
  selectedMonth: number
}) {
  const points = data
    .map((d, i) => ({ i, val: d.studentPct }))
    .filter((p) => p.val > 0)

  if (points.length === 0)
    return <p className="text-[12px] text-muted-foreground">No data</p>

  const W = 280
  const H = 72
  const maxVal = 100
  const xStep = W / (points.length - 1 || 1)

  const coords = points.map((p, idx) => ({
    x: idx * xStep,
    y: H - (p.val / maxVal) * H,
    month: p.i,
    val: p.val,
  }))

  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ")

  const areaD = `${pathD} L ${coords[coords.length - 1]!.x} ${H} L 0 ${H} Z`

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: H }}
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.15"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sparkGrad)" />
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={c.month === selectedMonth ? 4 : 2.5}
            fill={
              c.month === selectedMonth
                ? "hsl(var(--primary))"
                : "hsl(var(--background))"
            }
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      {/* Y labels */}
      <div
        className="absolute top-0 right-0 flex flex-col justify-between text-[10px] text-muted-foreground tabular-nums"
        style={{ height: H }}
      >
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface Props {
  employee: Employee
}

export function PerformanceTab({ employee }: Props) {
  const [year, setYear] = useState(NOW_YEAR)
  const [month, setMonth] = useState(NOW_MONTH > 3 ? 3 : NOW_MONTH) // default to last month with data

  const perf = PERF_DATA[month]!
  const hasData = perf.totalReviews > 0 || perf.bookedClasses > 0

  const totalSlots = perf.openSlots + perf.bookedClasses
  const bookingRate =
    totalSlots > 0 ? Math.round((perf.bookedClasses / totalSlots) * 100) : 0
  const fiveStarPct =
    perf.totalReviews > 0
      ? Math.round((perf.fiveStar / perf.totalReviews) * 100)
      : 0
  const lowStarPct =
    perf.totalReviews > 0
      ? Math.round((perf.lowStar / perf.totalReviews) * 100)
      : 0

  // Trend vs previous month
  const prevPerf = month > 0 ? PERF_DATA[month - 1]! : null
  const reviewTrend =
    prevPerf && prevPerf.totalReviews > 0
      ? perf.totalReviews - prevPerf.totalReviews
      : null

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
            disabled={year >= NOW_YEAR}
            className="flex size-6 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={11} strokeWidth={2} />
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {MONTH_SHORT.map((m, i) => {
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
                {m}
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI cards — 6 metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Open Slots",
            value: hasData ? String(perf.openSlots) : "—",
            sub: hasData ? `of ${totalSlots} total` : "no data",
            accent: perf.openSlots > 5 ? "text-amber-500" : "text-foreground",
          },
          {
            label: "Booked Classes",
            value: hasData ? String(perf.bookedClasses) : "—",
            sub: hasData ? `${bookingRate}% fill rate` : "no data",
            accent: "text-foreground",
          },
          {
            label: "Student's %",
            value: hasData ? `${perf.studentPct}%` : "—",
            sub: hasData
              ? perf.studentPct >= 90
                ? "Excellent"
                : perf.studentPct >= 75
                  ? "Good"
                  : "Needs attention"
              : "no data",
            accent:
              perf.studentPct >= 90
                ? "text-green-600"
                : perf.studentPct >= 75
                  ? "text-amber-500"
                  : "text-red-500",
          },
          {
            label: "Total Reviews",
            value: hasData ? String(perf.totalReviews) : "—",
            sub:
              hasData && reviewTrend !== null
                ? reviewTrend >= 0
                  ? `↑ +${reviewTrend} vs last month`
                  : `↓ ${reviewTrend} vs last month`
                : "this month",
            accent: "text-foreground",
          },
          {
            label: "5-Star Ratings",
            value: hasData ? String(perf.fiveStar) : "—",
            sub: hasData ? `${fiveStarPct}% of reviews` : "no data",
            accent: "text-amber-500",
          },
          {
            label: "2★ and Below",
            value: hasData ? String(perf.lowStar) : "—",
            sub: hasData ? `${lowStarPct}% of reviews` : "no data",
            accent:
              perf.lowStar > 3
                ? "text-red-500"
                : perf.lowStar > 0
                  ? "text-amber-500"
                  : "text-green-600",
          },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p
              className={cn("mt-1 text-2xl font-semibold tabular-nums", accent)}
            >
              {value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Booking chart */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="text-[13px] font-semibold">
              Slots — {MONTH_NAMES[month]}
            </h3>
            {hasData && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {perf.bookedClasses}/{totalSlots} booked
              </span>
            )}
          </div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Open slots vs booked classes per month
          </p>
          <BookingBar data={PERF_DATA} selectedMonth={month} />
        </div>

        {/* Rating breakdown */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="text-[13px] font-semibold">
              Ratings — {MONTH_NAMES[month]}
            </h3>
            {hasData && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <svg
                    key={n}
                    viewBox="0 0 12 12"
                    className={cn(
                      "size-3",
                      n <=
                        Math.round(
                          (perf.fiveStar / (perf.totalReviews || 1)) * 5
                        )
                        ? "fill-amber-400"
                        : "fill-muted"
                    )}
                  >
                    <path d="M6 1l1.2 3.6H11L8.1 6.8l1.2 3.6L6 8.2l-3.3 2.2 1.2-3.6L1 4.6h3.8z" />
                  </svg>
                ))}
                <span className="ml-1 text-[12px] font-semibold text-muted-foreground tabular-nums">
                  {perf.totalReviews} reviews
                </span>
              </div>
            )}
          </div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Distribution of student ratings
          </p>
          {hasData ? (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <StarRow
                  key={star}
                  star={star}
                  count={perf.starCounts[star - 1]!}
                  total={perf.totalReviews}
                />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              No reviews for this month
            </p>
          )}
        </div>
      </div>

      {/* Student engagement sparkline */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-[13px] font-semibold">Student Attendance Rate</h3>
          {hasData && (
            <span
              className={cn(
                "text-[13px] font-semibold tabular-nums",
                perf.studentPct >= 90
                  ? "text-green-600"
                  : perf.studentPct >= 75
                    ? "text-amber-500"
                    : "text-red-500"
              )}
            >
              {perf.studentPct}% this month
            </span>
          )}
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Monthly student attendance percentage — {year}
        </p>
        <StudentPctSparkline data={PERF_DATA} selectedMonth={month} />
      </div>
    </div>
  )
}
