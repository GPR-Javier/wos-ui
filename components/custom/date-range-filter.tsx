"use client"

import { useState } from "react"
import {
  DateRangePicker,
  type DateRangePreset,
  type DateRangeValue,
} from "@/components/ui/date-range-picker"
import { cn } from "@/lib/utils"

// ── Date helpers (local-time, no UTC shift) ─────────────────────────────────────

/** Local-time `YYYY-MM-DD` (avoids the UTC day-shift of toISOString). */
export function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`
}

/** Quarter (1–4) a month index (0–11) belongs to. */
export function quarterOf(monthIndex: number) {
  return Math.floor(monthIndex / 3) + 1
}

/** First/last day of the given quarter (1–4) in a year. */
export function quarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3
  return {
    from: new Date(year, startMonth, 1),
    until: new Date(year, startMonth + 3, 0),
  }
}

/** The previous quarter, rolling back to Q4 of the prior year when the current quarter is Q1. */
export function lastQuarter(): { year: number; quarter: number } {
  const n = new Date()
  const q = quarterOf(n.getMonth())
  return q === 1
    ? { year: n.getFullYear() - 1, quarter: 4 }
    : { year: n.getFullYear(), quarter: q - 1 }
}

/** The current quarter as an ISO range — the default for date-filtered tables. */
export function thisQuarterRange(): DateRangeValue {
  const n = new Date()
  const r = quarterRange(n.getFullYear(), quarterOf(n.getMonth()))
  return { from: isoLocal(r.from), until: isoLocal(r.until) }
}

/** The current calendar month as an ISO range. */
export function thisMonthRange(): DateRangeValue {
  const n = new Date()
  return {
    from: isoLocal(new Date(n.getFullYear(), n.getMonth(), 1)),
    until: isoLocal(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
  }
}

/** The current calendar year as an ISO range — a sensible default for personal history views. */
export function thisYearRange(): DateRangeValue {
  const y = new Date().getFullYear()
  return {
    from: isoLocal(new Date(y, 0, 1)),
    until: isoLocal(new Date(y, 11, 31)),
  }
}

/**
 * If {@link range} exactly matches this quarter or last quarter, return its label (e.g. "Q2 2026");
 * otherwise null — so the indicator only shows for those two quarter ranges.
 */
export function quarterLabelForRange(range: DateRangeValue): string | null {
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

/** Standard quick-select presets shared by every date-filtered table. */
export const RANGE_PRESETS: DateRangePreset[] = [
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

// ── Hook ────────────────────────────────────────────────────────────────────────

/**
 * Range state for a date-filtered table. Defaults to the current quarter; pass another initializer
 * (e.g. {@link thisMonthRange}) to change the default.
 */
export function useDateRange(initial: () => DateRangeValue = thisQuarterRange) {
  const [range, setRange] = useState<DateRangeValue>(initial)
  return { range, setRange }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  className?: string
}

/**
 * The shared table date filter: a range picker with the standard quick-select presets and a quarter
 * indicator chip (shown only when the range is exactly this/last quarter). Parent owns the state
 * (see {@link useDateRange}) and is responsible for resetting pagination on change.
 */
export function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const quarterLabel = quarterLabelForRange(value)
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DateRangePicker
        value={value}
        onChange={onChange}
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
  )
}
