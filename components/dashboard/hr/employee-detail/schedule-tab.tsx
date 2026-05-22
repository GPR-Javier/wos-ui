"use client"

import { useState, useEffect, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

// ── Constants ──────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64
const START_HOUR = 7
const END_HOUR = 21
const TOTAL_HOURS = END_HOUR - START_HOUR

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
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

const SHIFT_COLORS = [
  {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-violet-100 dark:bg-violet-900/30",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    border: "border-rose-300 dark:border-rose-700",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
]

// ── Types ──────────────────────────────────────────────────────────────────────

type CalView = "week" | "month"

interface ShiftEntry {
  startTime: string
  endTime: string
  hours: number
  label: string
  colorIdx: number
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

function isToday(date: Date): boolean {
  const t = new Date()
  return (
    date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
  )
}

function isSameMonth(date: Date, ref: Date): boolean {
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth()
  )
}

function parseHour(time: string): number {
  const [timePart, period] = time.split(" ")
  const [h, m] = (timePart ?? "").split(":").map(Number)
  let hour = h ?? 0
  if (period === "PM" && hour !== 12) hour += 12
  if (period === "AM" && hour === 12) hour = 0
  return hour + (m ?? 0) / 60
}

function topPx(time: string) {
  return (parseHour(time) - START_HOUR) * HOUR_HEIGHT
}
function heightPx(start: string, end: string) {
  return (parseHour(end) - parseHour(start)) * HOUR_HEIGHT
}

// ── Mock schedule ──────────────────────────────────────────────────────────────

function buildSchedule(): Record<string, ShiftEntry> {
  const s: Record<string, ShiftEntry> = {}
  const mon = getMonday(new Date())

  const fill = (
    base: Date,
    days: number,
    entry: Omit<ShiftEntry, "label"> & { label: string }
  ) => {
    for (let i = 0; i < days; i++) s[dateKey(addDays(base, i))] = entry
  }

  fill(mon, 5, {
    startTime: "9:00 AM",
    endTime: "3:00 PM",
    hours: 6,
    label: "Day Shift",
    colorIdx: 0,
  })
  fill(addDays(mon, 7), 5, {
    startTime: "9:00 AM",
    endTime: "1:00 PM",
    hours: 4,
    label: "Half Shift",
    colorIdx: 1,
  })
  fill(addDays(mon, -7), 4, {
    startTime: "8:00 AM",
    endTime: "1:00 PM",
    hours: 5,
    label: "Morning Shift",
    colorIdx: 4,
  })
  fill(addDays(mon, 21), 5, {
    startTime: "9:00 AM",
    endTime: "5:00 PM",
    hours: 8,
    label: "Full Shift",
    colorIdx: 2,
  })

  const w3 = addDays(mon, 14)
  s[dateKey(w3)] = {
    startTime: "9:00 AM",
    endTime: "11:00 AM",
    hours: 2,
    label: "Short Shift",
    colorIdx: 3,
  }
  s[dateKey(addDays(w3, 2))] = {
    startTime: "10:00 AM",
    endTime: "1:00 PM",
    hours: 3,
    label: "Short Shift",
    colorIdx: 3,
  }

  return s
}

const SCHEDULE = buildSchedule()

// ── Week view ──────────────────────────────────────────────────────────────────

function WeekView({
  weekOffset,
  onWeekChange,
}: {
  weekOffset: number
  onWeekChange: (n: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const monday = addDays(getMonday(new Date()), weekOffset * 7)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const sunday = weekDays[6]!

  const entries = weekDays.map((d) => ({
    date: d,
    shift: SCHEDULE[dateKey(d)] ?? null,
  }))

  const totalHours = entries.reduce((s, e) => s + (e.shift?.hours ?? 0), 0)
  const workDays = entries.filter((e) => e.shift !== null).length

  const now = new Date()
  const nowDecimal = now.getHours() + now.getMinutes() / 60
  const nowTop = (nowDecimal - START_HOUR) * HOUR_HEIGHT
  const showNow =
    weekOffset === 0 && nowDecimal >= START_HOUR && nowDecimal <= END_HOUR

  const startLabel = `${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()}`
  const endLabel = `${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`
  const weekLabel =
    startLabel === endLabel
      ? startLabel
      : `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = showNow
      ? Math.max(0, nowTop - 80)
      : (8 - START_HOUR) * HOUR_HEIGHT
  }, [weekOffset])

  const hours = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => START_HOUR + i
  )

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onWeekChange(weekOffset - 1)}
            className="flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => onWeekChange(weekOffset + 1)}
            className="flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
          </button>
          <span className="ml-1 text-[13px] font-semibold">{weekLabel}</span>
          {weekOffset !== 0 && (
            <button
              onClick={() => onWeekChange(0)}
              className="ml-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {totalHours}h
            </span>{" "}
            scheduled
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {workDays}
            </span>{" "}
            {workDays === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      {/* Day header */}
      <div className="flex border-b">
        <div className="w-14 shrink-0" />
        {weekDays.map((d, i) => {
          const today = isToday(d)
          return (
            <div
              key={i}
              className={cn(
                "flex flex-1 flex-col items-center py-2",
                i < 6 && "border-r",
                today && "bg-primary/5"
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium tracking-wide uppercase",
                  today ? "text-primary" : "text-muted-foreground"
                )}
              >
                {DAY_LABELS[i]}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex size-6 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
                  today && "bg-primary text-primary-foreground"
                )}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: 520 }}
      >
        <div className="flex">
          <div className="w-14 shrink-0">
            {hours.map((h) => (
              <div
                key={h}
                className="relative flex items-start justify-end pr-3"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="-mt-2 text-[11px] text-muted-foreground tabular-nums">
                  {h === 12
                    ? "12 PM"
                    : h > 12
                      ? `${h - 12} PM`
                      : h === 0
                        ? "12 AM"
                        : `${h} AM`}
                </span>
              </div>
            ))}
          </div>

          {entries.map(({ date, shift }, colIdx) => {
            const today = isToday(date)
            const weekend = colIdx >= 5
            return (
              <div
                key={colIdx}
                className={cn(
                  "relative flex-1",
                  colIdx < 6 && "border-r",
                  weekend && "bg-muted/20",
                  today && "bg-primary/3"
                )}
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-0 left-0 border-b border-border/40"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {showNow && today && (
                  <div
                    className="absolute right-0 left-0 z-10 flex items-center"
                    style={{ top: nowTop }}
                  >
                    <div className="size-2 rounded-full bg-primary" />
                    <div className="h-px flex-1 bg-primary" />
                  </div>
                )}

                {shift &&
                  (() => {
                    const color = SHIFT_COLORS[shift.colorIdx]!
                    const top = topPx(shift.startTime)
                    const height = Math.max(
                      heightPx(shift.startTime, shift.endTime),
                      28
                    )
                    const compact = height < 52
                    return (
                      <div
                        className={cn(
                          "absolute right-1 left-1 overflow-hidden rounded-md border px-2 py-1.5",
                          color.bg,
                          color.border
                        )}
                        style={{ top: top + 2, height: height - 4 }}
                      >
                        <p
                          className={cn(
                            "truncate text-[11px] leading-tight font-semibold",
                            color.text
                          )}
                        >
                          {shift.label}
                        </p>
                        {!compact && (
                          <p
                            className={cn(
                              "mt-0.5 text-[11px] leading-tight tabular-nums opacity-80",
                              color.text
                            )}
                          >
                            {shift.startTime} – {shift.endTime}
                          </p>
                        )}
                        {!compact && (
                          <p
                            className={cn(
                              "mt-1 text-[12px] font-bold tabular-nums",
                              color.text
                            )}
                          >
                            {shift.hours}h
                          </p>
                        )}
                      </div>
                    )
                  })()}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Month view ─────────────────────────────────────────────────────────────────

function MonthView({
  monthOffset,
  onMonthChange,
}: {
  monthOffset: number
  onMonthChange: (n: number) => void
}) {
  const now = new Date()
  const ref = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = ref.getFullYear()
  const month = ref.getMonth()

  // First Monday on or before the 1st
  const firstDay = new Date(year, month, 1)
  const gridStart = getMonday(firstDay)
  // Always render 6 weeks
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  const totalScheduled = cells
    .filter((d) => isSameMonth(d, ref))
    .reduce((s, d) => s + (SCHEDULE[dateKey(d)]?.hours ?? 0), 0)

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(monthOffset - 1)}
            className="flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => onMonthChange(monthOffset + 1)}
            className="flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
          </button>
          <span className="ml-1 text-[13px] font-semibold">
            {MONTH_NAMES[month]} {year}
          </span>
          {monthOffset !== 0 && (
            <button
              onClick={() => onMonthChange(0)}
              className="ml-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Today
            </button>
          )}
        </div>
        <span className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {totalScheduled}h
          </span>{" "}
          this month
        </span>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b">
        {MONTH_DAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
              i < 6 && "border-r"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const inMonth = isSameMonth(day, ref)
          const today = isToday(day)
          const shift = SCHEDULE[dateKey(day)] ?? null
          const color = shift ? SHIFT_COLORS[shift.colorIdx]! : null
          const isLast = idx >= 35 // last row — no bottom border needed

          return (
            <div
              key={idx}
              className={cn(
                "min-h-22 p-2",
                idx % 7 < 6 && "border-r",
                !isLast && "border-b",
                !inMonth && "bg-muted/20",
                today && "bg-primary/3"
              )}
            >
              {/* Date number */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[12px] font-medium tabular-nums",
                    today
                      ? "bg-primary font-semibold text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                  )}
                >
                  {day.getDate()}
                </span>
                {shift && inMonth && (
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums",
                      color!.text
                    )}
                  >
                    {shift.hours}h
                  </span>
                )}
              </div>

              {/* Shift block */}
              {shift && inMonth && (
                <div
                  className={cn(
                    "rounded-md border px-1.5 py-1",
                    color!.bg,
                    color!.border
                  )}
                >
                  <div className="flex items-center gap-1">
                    <div
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        color!.dot
                      )}
                    />
                    <p
                      className={cn(
                        "truncate text-[10px] font-semibold",
                        color!.text
                      )}
                    >
                      {shift.label}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] tabular-nums opacity-80",
                      color!.text
                    )}
                  >
                    {shift.startTime} – {shift.endTime}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Schedule tab ───────────────────────────────────────────────────────────────

export function ScheduleTab() {
  const [view, setView] = useState<CalView>("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-lg border bg-muted/40 p-0.5">
          {(["week", "month"] as CalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {view === "week" ? (
          <WeekView weekOffset={weekOffset} onWeekChange={setWeekOffset} />
        ) : (
          <MonthView monthOffset={monthOffset} onMonthChange={setMonthOffset} />
        )}
      </div>
    </div>
  )
}
