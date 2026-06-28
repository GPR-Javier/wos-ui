"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import type { EventContentArg, EventInput } from "@fullcalendar/core"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TypewriterEffect } from "@/components/ui/typewriter-effect"
import { useAttendance, useAttendanceHeatmap } from "@/hooks/use-employee"
import { useTimeFormat } from "@/hooks/use-time-format"
import { formatTime as formatTimeRaw } from "@/lib/time-format"

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
  | "restday-present"
  | "restday-overtime"
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
  "restday-present": "bg-teal-500",
  "restday-overtime": "bg-indigo-500",
  weekend: "bg-border",
  future: "bg-muted",
}

// Concrete hex equivalents of STATUS_BG (Tailwind 400/500) — FullCalendar events
// need real color values rather than utility classes.
const STATUS_HEX: Record<DayStatus, string> = {
  present: "#22c55e",
  overtime: "#3b82f6",
  late: "#fbbf24",
  undertime: "#fbbf24",
  absent: "#ef4444",
  leave: "#c084fc",
  "restday-present": "#14b8a6",
  "restday-overtime": "#6366f1",
  weekend: "#6b7280",
  future: "#9ca3af",
}

const STATUS_LABEL: Record<DayStatus, string> = {
  present: "Present",
  overtime: "Overtime",
  late: "Late",
  undertime: "Undertime",
  absent: "Absent",
  leave: "On leave",
  "restday-present": "Rest day (worked)",
  "restday-overtime": "Rest day OT",
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
  const lower = s.toLowerCase()
  // Rest-day work is finalized as "restday" at clock-out and is entirely overtime.
  if (lower === "restday") return "overtime"
  return VALID_STATUSES.has(lower as DayStatus)
    ? (lower as DayStatus)
    : "present"
}

function statusForDate(
  date: Date,
  today: Date,
  lookup: Map<string, DayStatus>
): DayStatus {
  // A recorded day always wins — including rest days the employee actually worked.
  const recorded = lookup.get(formatDateKey(date))
  const dow = date.getDay()
  const isRestDay = dow === 0 || dow === 6
  if (recorded) {
    // Day-off attendance gets its own indicator (present vs overtime) so it stands
    // apart from a normal weekday rather than disappearing into the weekend grey.
    if (isRestDay)
      return recorded === "overtime" ? "restday-overtime" : "restday-present"
    return recorded
  }
  if (isRestDay) return "weekend"
  if (date > today) return "future"
  return "future" // past workday with no record → muted
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

// ── Calendar modal ───────────────────────────────────────────────────────────

const CALENDAR_LEGEND: [DayStatus, string][] = [
  ["present", "Present"],
  ["overtime", "Overtime"],
  ["restday-present", "Rest day"],
  ["restday-overtime", "Rest day OT"],
  ["late", "Late"],
  ["absent", "Absent"],
]

// Extra fields carried on each event for rich rendering in the timed/list views.
interface AttendanceEventProps {
  label: string
  range?: string // "8:00 – 17:00" in the user's preferred format
  ot?: string | null // overtime hours, e.g. "2.0"
  rd?: string | null // rest-day hours
}

function renderEventContent(arg: EventContentArg) {
  const p = arg.event.extendedProps as AttendanceEventProps
  // Month grid stays compact (label only); week/list views surface the time range + OT.
  const compact = arg.view.type === "dayGridMonth"
  const extra =
    [p.ot ? `+${p.ot} OT` : null, p.rd ? `${p.rd} RD` : null]
      .filter(Boolean)
      .join(" · ") || null

  return (
    <div className="flex flex-col gap-px overflow-hidden px-1 leading-tight">
      <span className="truncate text-[11px] font-medium">{p.label}</span>
      {!compact && p.range && (
        <span className="truncate text-[10px] tabular-nums opacity-90">
          {p.range}
        </span>
      )}
      {!compact && extra && (
        <span className="truncate text-[10px] font-semibold opacity-95">
          {extra}
        </span>
      )}
    </div>
  )
}

function AttendanceCalendarModal({
  events,
  initialDate,
  onClose,
}: {
  events: EventInput[]
  initialDate: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl animate-in flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">Attendance Calendar</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Your recorded attendance, day by day
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-2.5 text-[11px] text-muted-foreground">
          {CALENDAR_LEGEND.map(([s, label]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm"
                style={{ background: STATUS_HEX[s] }}
              />
              {label}
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="fc-holiday overflow-y-auto p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
            initialView="dayGridMonth"
            initialDate={initialDate}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,listMonth",
            }}
            buttonText={{ today: "Today" }}
            views={{
              dayGridMonth: { buttonText: "Month" },
              timeGridWeek: {
                buttonText: "Week",
                // Bound the day to the working window so the grid isn't a tall empty
                // 24h column; clock-in/out + OT blocks render against the hour axis.
                slotMinTime: "05:00:00",
                slotMaxTime: "23:00:00",
                slotDuration: "01:00:00",
                scrollTime: "07:00:00",
                allDaySlot: true,
                nowIndicator: true,
              },
              listMonth: {
                buttonText: "List",
                listDayFormat: {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                },
              },
            }}
            firstDay={0}
            height="auto"
            fixedWeekCount={false}
            displayEventTime={false}
            // Render timed events as filled chips in month view too (default would
            // show them as bare dot+text, which looks empty against the dark grid).
            eventDisplay="block"
            dayMaxEvents={3}
            events={events}
            eventContent={renderEventContent}
            noEventsContent="No attendance recorded in this period."
          />
        </div>
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AttendanceHeatmap() {
  const { data: heatmapData, isLoading } = useAttendanceHeatmap()
  // Timed records (clock-in/out, OT) for the week view — the heatmap endpoint is status-only.
  const { data: attendancePage } = useAttendance({ size: 366 })
  const { formatTime } = useTimeFormat()

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
  const [showCalendar, setShowCalendar] = useState(false)
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
    overtime: workDays.filter(
      (d) => d.status === "overtime" || d.status === "restday-overtime"
    ).length,
    late: workDays.filter((d) => d.status === "late").length,
    absent: workDays.filter((d) => d.status === "absent").length,
  }

  // Calendar events span every recorded day (all years) so navigating the modal
  // surfaces the full history; statuses reuse the heatmap's own classification.
  // Days with recorded clock-in/out become *timed* events (so the week view shows
  // the actual span + OT); status-only days stay all-day.
  const calendarEvents = useMemo<EventInput[]>(() => {
    const byDate = new Map<string, EventInput>()

    // 1. All-day status events from the heatmap — full coverage across years.
    for (const key of lookup.keys()) {
      const date = new Date(key + "T00:00:00")
      const status = statusForDate(date, today, lookup)
      if (status === "weekend" || status === "future") continue
      byDate.set(key, {
        id: key,
        title: STATUS_LABEL[status],
        start: key,
        allDay: true,
        backgroundColor: STATUS_HEX[status],
        borderColor: STATUS_HEX[status],
        textColor: "#fff",
        extendedProps: {
          label: STATUS_LABEL[status],
        } satisfies AttendanceEventProps,
      })
    }

    // 2. Timed events from attendance entries — overrides the all-day version for
    //    that date with the real clock-in → clock-out span (+ OT / RD hours).
    for (const r of attendancePage?.content ?? []) {
      const inHHmm = formatTimeRaw(r.timeIn, "24h", { fallback: "" })
      const outHHmm = formatTimeRaw(r.timeOut, "24h", { fallback: "" })
      if (!inHHmm || !outHHmm) continue // absent / leave / open session → keep all-day

      // Prefer the heatmap's classification (matches the cell colors); fall back to
      // the entry's own status when the heatmap has no record for that day.
      const dayStatus = lookup.has(r.date)
        ? statusForDate(new Date(r.date + "T00:00:00"), today, lookup)
        : normalizeStatus(r.status)

      // Clock-out before clock-in → shift crossed midnight; push the end to next day.
      const startISO = `${r.date}T${inHHmm}:00`
      let endDate = r.date
      if (outHHmm <= inHHmm) {
        const d = new Date(r.date + "T00:00:00")
        d.setDate(d.getDate() + 1)
        endDate = formatDateKey(d)
      }
      const endISO = `${endDate}T${outHHmm}:00`

      const ot = r.otHours && r.otHours !== "—" ? r.otHours : null
      const rd = r.rdHours && r.rdHours !== "—" ? r.rdHours : null

      byDate.set(r.date, {
        id: r.date,
        title: STATUS_LABEL[dayStatus],
        start: startISO,
        end: endISO,
        allDay: false,
        backgroundColor: STATUS_HEX[dayStatus],
        borderColor: STATUS_HEX[dayStatus],
        textColor: "#fff",
        extendedProps: {
          label: STATUS_LABEL[dayStatus],
          range: `${formatTime(r.timeIn)} – ${formatTime(r.timeOut)}`,
          ot,
          rd,
        } satisfies AttendanceEventProps,
      })
    }

    return [...byDate.values()]
  }, [lookup, today, attendancePage, formatTime])

  // Open the calendar on the active year — current month if it's this year, else January.
  const calendarInitialDate =
    activeYear === today.getFullYear()
      ? formatDateKey(today)
      : `${activeYear}-01-01`

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
    <div className="relative rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* View calendar — top-right of the card */}
      <Button
        size="sm"
        variant="outline"
        className="absolute top-4 right-5 z-10 h-7 gap-1.5 px-2.5 text-[12px]"
        onClick={() => setShowCalendar(true)}
      >
        <HugeiconsIcon icon={Calendar01Icon} size={13} strokeWidth={1.8} />
        View calendar
      </Button>

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
            <div className="flex flex-wrap items-center gap-3">
              {(
                [
                  ["present", "Present"],
                  ["overtime", "Overtime"],
                  ["restday-present", "Rest day"],
                  ["restday-overtime", "Rest day OT"],
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

      {showCalendar && (
        <AttendanceCalendarModal
          events={calendarEvents}
          initialDate={calendarInitialDate}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  )
}
