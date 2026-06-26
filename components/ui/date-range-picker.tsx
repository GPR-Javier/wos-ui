"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon,
  ArrowRight02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowLeftDoubleIcon,
  ArrowRightDoubleIcon,
} from "@hugeicons/core-free-icons"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

/** ISO `YYYY-MM-DD` start/end pair. */
export interface DateRangeValue {
  from: string
  until: string
}

export interface DateRangePreset {
  label: string
  /** Returns the concrete range when picked. */
  range: () => { from: Date; until: Date }
}

interface DateRangePickerProps {
  value?: Partial<DateRangeValue> | null
  onChange: (value: DateRangeValue) => void
  presets?: DateRangePreset[]
  disabled?: boolean
  /** Earliest selectable day (ISO `YYYY-MM-DD`). Days before are disabled. */
  minDate?: string
  /** Number of month panels shown side by side. Default 2. */
  numberOfMonths?: number
  className?: string
  align?: "start" | "center" | "end"
  fromPlaceholder?: string
  untilPlaceholder?: string
}

// ── Date helpers (local-time, no UTC shift) ────────────────────────────────────

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`
}

function parseISO(s?: string | null): Date | null {
  if (!s) return null
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function sameDay(a: Date | null, b: Date | null): boolean {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function fmtDisplay(iso?: string): string {
  const d = parseISO(iso)
  return d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : ""
}

// 42-cell (6 week) Sunday-first matrix for the given month.
function monthMatrix(base: Date): Date[] {
  const first = new Date(base.getFullYear(), base.getMonth(), 1)
  const start = new Date(
    first.getFullYear(),
    first.getMonth(),
    1 - first.getDay()
  )
  return Array.from(
    { length: 42 },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  )
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

// ── Component ──────────────────────────────────────────────────────────────────

export function DateRangePicker({
  value,
  onChange,
  presets,
  disabled,
  minDate,
  numberOfMonths = 2,
  className,
  align = "start",
  fromPlaceholder = "Start date",
  untilPlaceholder = "End date",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draftFrom, setDraftFrom] = React.useState<Date | null>(null)
  const [draftUntil, setDraftUntil] = React.useState<Date | null>(null)
  const [hovered, setHovered] = React.useState<Date | null>(null)
  const [viewMonth, setViewMonth] = React.useState<Date>(
    () => parseISO(value?.from) ?? new Date()
  )

  const min = parseISO(minDate)

  // Sync the in-progress draft + view to the committed value whenever we open.
  React.useEffect(() => {
    if (!open) return
    setDraftFrom(parseISO(value?.from))
    setDraftUntil(parseISO(value?.until))
    setHovered(null)
    setViewMonth(parseISO(value?.from) ?? new Date())
  }, [open, value?.from, value?.until])

  const picking: "from" | "until" = draftFrom && !draftUntil ? "until" : "from"

  // Effective highlighted range (during selection, use the hovered day as the
  // tentative end), normalized so lo ≤ hi for rendering.
  const selEnd = draftUntil ?? (draftFrom && hovered ? hovered : null)
  const [lo, hi] =
    draftFrom && selEnd
      ? draftFrom <= selEnd
        ? [draftFrom, selEnd]
        : [selEnd, draftFrom]
      : [draftFrom, draftUntil]

  function isDisabled(d: Date): boolean {
    return !!min && startOfDay(d) < startOfDay(min)
  }

  function commit(a: Date, b: Date) {
    const [from, until] = a <= b ? [a, b] : [b, a]
    onChange({ from: toISO(from), until: toISO(until) })
    setOpen(false)
  }

  function handleDayClick(d: Date) {
    if (isDisabled(d)) return
    if (!draftFrom || draftUntil) {
      // start a fresh selection
      setDraftFrom(d)
      setDraftUntil(null)
      setHovered(null)
    } else {
      commit(draftFrom, d)
    }
  }

  function handlePreset(p: DateRangePreset) {
    const { from, until } = p.range()
    commit(from, until)
  }

  const hasValue = value?.from && value?.until
  const months = Array.from({ length: numberOfMonths }, (_, i) =>
    addMonths(viewMonth, i)
  )

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center gap-1 rounded-lg border border-border bg-input/30 px-3 text-[13px] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-ring",
            className
          )}
        >
          <span
            className={cn(
              "flex-1 truncate text-left",
              picking === "from" && open && "font-medium text-foreground",
              hasValue ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {hasValue ? fmtDisplay(value!.from) : fromPlaceholder}
          </span>
          <HugeiconsIcon
            icon={ArrowRight02Icon}
            size={13}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground"
          />
          <span
            className={cn(
              "flex-1 truncate text-left",
              picking === "until" && open && "font-medium text-foreground",
              hasValue ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {hasValue ? fmtDisplay(value!.until) : untilPlaceholder}
          </span>
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={14}
            strokeWidth={1.8}
            className="ml-1 shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align={align} className="p-0">
        <div className="flex">
          {/* Presets column */}
          {presets && presets.length > 0 && (
            <div className="flex w-32 shrink-0 flex-col gap-0.5 border-r border-border p-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className="rounded-md px-2.5 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Calendars */}
          <div className="p-3">
            <div className="flex gap-5">
              {months.map((month, mi) => (
                <div key={mi} className="w-[16rem]">
                  {/* Month header */}
                  <div className="mb-2 flex items-center justify-between">
                    {mi === 0 ? (
                      <div className="flex items-center gap-0.5">
                        <NavButton
                          icon={ArrowLeftDoubleIcon}
                          label="Previous year"
                          onClick={() => setViewMonth((v) => addMonths(v, -12))}
                        />
                        <NavButton
                          icon={ArrowLeft01Icon}
                          label="Previous month"
                          onClick={() => setViewMonth((v) => addMonths(v, -1))}
                        />
                      </div>
                    ) : (
                      <span className="w-12" />
                    )}

                    <span className="text-[13px] font-semibold text-foreground">
                      {month.toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>

                    {mi === months.length - 1 ? (
                      <div className="flex items-center gap-0.5">
                        <NavButton
                          icon={ArrowRight01Icon}
                          label="Next month"
                          onClick={() => setViewMonth((v) => addMonths(v, 1))}
                        />
                        <NavButton
                          icon={ArrowRightDoubleIcon}
                          label="Next year"
                          onClick={() => setViewMonth((v) => addMonths(v, 12))}
                        />
                      </div>
                    ) : (
                      <span className="w-12" />
                    )}
                  </div>

                  {/* Weekday row */}
                  <div className="grid grid-cols-7">
                    {WEEKDAYS.map((w) => (
                      <div
                        key={w}
                        className="flex h-7 items-center justify-center text-[11px] font-medium text-muted-foreground"
                      >
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7">
                    {monthMatrix(month).map((day, di) => {
                      const inMonth = day.getMonth() === month.getMonth()
                      const dis = isDisabled(day)
                      const isLo = sameDay(day, lo)
                      const isHi = sameDay(day, hi)
                      const between =
                        !!lo && !!hi && day > lo && day < hi && !sameDay(lo, hi)
                      const showBar = !!lo && !!hi && !sameDay(lo, hi)
                      const isEndpoint = (isLo || isHi) && inMonth
                      const isToday = sameDay(day, new Date())

                      return (
                        <div
                          key={di}
                          className="relative flex h-9 items-center justify-center"
                        >
                          {/* range bar */}
                          {showBar && inMonth && (isEndpoint || between) && (
                            <div
                              className={cn(
                                "absolute inset-x-0 inset-y-1 bg-primary/15",
                                isLo && "left-1 rounded-l-full",
                                isHi && "right-1 rounded-r-full"
                              )}
                            />
                          )}
                          {/* endpoint fill */}
                          {isEndpoint && (
                            <div className="absolute inset-1 rounded-full bg-primary" />
                          )}

                          {inMonth ? (
                            <button
                              type="button"
                              disabled={dis}
                              onClick={() => handleDayClick(day)}
                              onMouseEnter={() => setHovered(day)}
                              className={cn(
                                "relative z-10 flex size-7 items-center justify-center rounded-full text-[12px] tabular-nums transition-colors",
                                isEndpoint
                                  ? "font-semibold text-primary-foreground"
                                  : dis
                                    ? "cursor-not-allowed text-muted-foreground/30"
                                    : "text-foreground hover:bg-muted",
                                isToday &&
                                  !isEndpoint &&
                                  "ring-1 ring-primary/40"
                              )}
                            >
                              {day.getDate()}
                            </button>
                          ) : (
                            <span className="text-[12px] text-muted-foreground/25 tabular-nums">
                              {day.getDate()}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NavButton({
  icon,
  label,
  onClick,
}: {
  icon: typeof ArrowLeft01Icon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <HugeiconsIcon icon={icon} size={14} strokeWidth={2} />
    </button>
  )
}
