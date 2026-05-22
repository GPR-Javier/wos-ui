"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { TypewriterEffect } from "@/components/ui/typewriter-effect"
import { useAttendanceHeatmap } from "@/hooks/use-employee"

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
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
const GAP = 3
const DAY_LABEL_W = 28
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]

// ── Types ──────────────────────────────────────────────────────────────────────

type DayStatus =
  | "present"
  | "overtime"
  | "late"
  | "undertime"
  | "absent"
  | "leave"
  | "weekend"
  | "future"

type DayData = { date: Date; status: DayStatus } | null

// ── Color map ──────────────────────────────────────────────────────────────────

const STATUS_BG: Record<DayStatus, string> = {
  present: "bg-green-500",
  overtime: "bg-blue-500",
  late: "bg-amber-400",
  undertime: "bg-amber-400",
  absent: "bg-red-500",
  leave: "bg-purple-400",
  weekend: "bg-border",
  future: "bg-muted",
}

const STATUS_LABEL: Record<DayStatus, string> = {
  present: "Present",
  overtime: "Overtime",
  late: "Late",
  undertime: "Undertime",
  absent: "Absent",
  leave: "On leave",
  weekend: "Weekend",
  future: "—",
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const VALID_STATUSES = new Set<DayStatus>([
  "present",
  "overtime",
  "late",
  "undertime",
  "absent",
  "leave",
])

function normalizeStatus(s: string | null | undefined): DayStatus {
  if (!s) return "present"
  const lower = s.toLowerCase() as DayStatus
  return VALID_STATUSES.has(lower) ? lower : "present"
}

function statusForDate(
  date: Date,
  today: Date,
  lookup: Map<string, DayStatus>
): DayStatus {
  const dow = date.getDay()
  if (dow === 0 || dow === 6) return "weekend"
  if (date > today) return "future"
  return lookup.get(formatDateKey(date)) ?? "future" // no record → muted
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function buildYearData(
  year: number,
  today: Date,
  lookup: Map<string, DayStatus>
): DayData[][] {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const days: DayData[] = []

  for (let i = 0; i < start.getDay(); i++) days.push(null)

  const d = new Date(start)
  while (d <= end) {
    days.push({ date: new Date(d), status: statusForDate(d, today, lookup) })
    d.setDate(d.getDate() + 1)
  }

  while (days.length % 7 !== 0) days.push(null)

  const weeks: DayData[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

function getMonthLabels(weeks: DayData[][]): (string | null)[] {
  return weeks.map((week) => {
    for (const day of week) {
      if (day && day.date.getDate() === 1) return MONTHS[day.date.getMonth()]
    }
    return null
  })
}

// ── Motivational quotes ────────────────────────────────────────────────────────

const QUOTES = [
  [
    { text: "Show" },
    { text: "up." },
    { text: "Every" },
    { text: "single" },
    { text: "day." },
  ],
  [{ text: "Discipline" }, { text: "is" }, { text: "freedom." }],
  [
    { text: "Small" },
    { text: "steps," },
    { text: "big" },
    { text: "results." },
  ],
  [
    { text: "Be" },
    { text: "consistent," },
    { text: "be" },
    { text: "present." },
  ],
  [{ text: "Progress," }, { text: "not" }, { text: "perfection." }],
  [
    { text: "Your" },
    { text: "effort" },
    { text: "speaks" },
    { text: "loudest." },
  ],
  [{ text: "Commit" }, { text: "to" }, { text: "the" }, { text: "process." }],
]

function MotivationalQuote() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const charCount = QUOTES[idx].reduce((s, w) => s + w.text.length + 1, 0)
    // wait for typewriter to finish (~0.1s stagger per char) + 2.5s reading time
    const delay = charCount * 110 + 2500
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % QUOTES.length)
        setVisible(true)
      }, 450)
    }, delay)
    return () => clearTimeout(timer)
  }, [idx])

  return (
    <div
      className="text-center [&_span]:text-foreground/70!"
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.45s ease",
      }}
    >
      <TypewriterEffect
        key={idx}
        words={QUOTES[idx]}
        className="text-[11px]! leading-relaxed! font-normal!"
        cursorClassName="bg-primary/60! h-3! w-[2px]!"
      />
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AttendanceHeatmap() {
  const { data: heatmapData, isLoading } = useAttendanceHeatmap()

  const lookup = useMemo(() => {
    const map = new Map<string, DayStatus>()
    for (const r of heatmapData ?? []) {
      map.set(r.date, normalizeStatus(r.status))
    }
    return map
  }, [heatmapData])

  // Only show year buttons for years that actually have recorded attendance;
  // fall back to the current year if the user has no records yet.
  const years = useMemo(() => {
    const set = new Set<number>()
    for (const r of heatmapData ?? []) {
      const y = parseInt(r.date.slice(0, 4), 10)
      if (!isNaN(y)) set.add(y)
    }
    if (set.size === 0) set.add(new Date().getFullYear())
    return [...set].sort((a, b) => a - b)
  }, [heatmapData])

  const [year, setYear] = useState<number | null>(null)
  useEffect(() => {
    if (years.length === 0) return
    if (year == null || !years.includes(year)) {
      setYear(years[years.length - 1]) // default to latest year with data
    }
  }, [years, year])

  const today = useMemo(() => new Date(), [])
  const activeYear = year ?? years[years.length - 1] ?? today.getFullYear()
  const weeks = useMemo(
    () => buildYearData(activeYear, today, lookup),
    [activeYear, today, lookup]
  )
  const monthLabels = getMonthLabels(weeks)
  const numWeeks = weeks.length

  const allDays = weeks.flat()
  const workDays = allDays.filter(
    (d): d is NonNullable<DayData> =>
      d !== null && d.status !== "weekend" && d.status !== "future"
  )
  const stats = {
    total: workDays.length,
    overtime: workDays.filter((d) => d.status === "overtime").length,
    late: workDays.filter((d) => d.status === "late").length,
    absent: workDays.filter((d) => d.status === "absent").length,
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-3 w-3 rounded-sm" />
          ))}
        </div>
      </div>
    )
  }

  const gridStyle: React.CSSProperties = {
    display: "grid",
    // minmax(0, 1fr) prevents cells from enforcing a minimum content width
    gridTemplateColumns: `${DAY_LABEL_W}px repeat(${numWeeks}, minmax(0, 1fr))`,
    gap: `${GAP}px`,
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* 7fr : 1fr : 2fr  →  70% : 10% : 20% */}
      <div
        className="overflow-hidden"
        style={{ display: "grid", gridTemplateColumns: "7fr 1fr 2fr", gap: 20 }}
      >
        {/* ── Left: heatmap (~60%) ── */}
        <div className="min-w-0 overflow-hidden">
          {/* Title + stats */}
          <div className="mb-3">
            <h3 className="text-[13px] font-semibold">Attendance history</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {stats.total} days recorded &middot; {stats.overtime} overtime
              &middot; {stats.late} late &middot; {stats.absent} absent
            </p>
          </div>

          {/* Grid — cells scale to fill available width */}
          <div style={gridStyle}>
            {/* Row 0: empty corner + month labels */}
            <div />
            {monthLabels.map((label, wi) => (
              <div
                key={wi}
                style={{ fontSize: 10, lineHeight: 1 }}
                className="text-muted-foreground"
              >
                {label ?? ""}
              </div>
            ))}

            {/* Rows 1–7: one row per day-of-week */}
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <Fragment key={row}>
                <div
                  style={{ fontSize: 10 }}
                  className="flex items-center justify-end text-muted-foreground"
                >
                  {DAY_LABELS[row]}
                </div>
                {weeks.map((week, wi) => {
                  const day = week[row]
                  return day ? (
                    <div
                      key={wi}
                      style={{ aspectRatio: "1 / 1", borderRadius: 3 }}
                      className={cn(
                        STATUS_BG[day.status],
                        "cursor-default transition-opacity hover:opacity-70"
                      )}
                      title={`${formatDay(day.date)} — ${STATUS_LABEL[day.status]}`}
                    />
                  ) : (
                    <div key={wi} style={{ aspectRatio: "1 / 1" }} />
                  )
                })}
              </Fragment>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Less</span>
            {(
              ["future", "present", "overtime", "late", "absent"] as DayStatus[]
            ).map((s) => (
              <div
                key={s}
                style={{ width: 11, height: 11, borderRadius: 2 }}
                className={STATUS_BG[s]}
              />
            ))}
            <span className="mr-3">More</span>
            <div className="flex flex-wrap items-center gap-3">
              {(
                [
                  ["present", "Present"],
                  ["overtime", "Overtime"],
                  ["late", "Late"],
                  ["absent", "Absent"],
                  ["weekend", "Weekend"],
                ] as [DayStatus, string][]
              ).map(([s, label]) => (
                <div key={s} className="flex items-center gap-1">
                  <div
                    style={{ width: 10, height: 10, borderRadius: 2 }}
                    className={STATUS_BG[s]}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Year buttons (~15%) ── */}
        <div className="flex flex-col border-l border-border pl-4">
          <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Year
          </p>
          <div className="flex flex-col gap-0.5">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={cn(
                  "mr-auto w-fit rounded-md px-2.5 py-1 text-left text-[13px] font-semibold transition-colors",
                  activeYear === y
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* ── Motivational quote (~35%) ── */}
        <div className="flex items-center justify-center overflow-hidden border-l border-border pl-4">
          <MotivationalQuote />
        </div>
      </div>
    </div>
  )
}
