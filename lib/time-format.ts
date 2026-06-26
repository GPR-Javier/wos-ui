// Centralized time formatting honoring the user's 12h / 24h preference.
//
// `formatTime` is a pure function (takes the format explicitly) so it works in
// non-React code; components should use the reactive `useTimeFormat()` hook so a
// preference change re-renders them. The parser accepts a Date, an ISO date-time
// string, a 24h "HH:mm[:ss]" string, or a 12h "h:mm[:ss] AM/PM" string — so it can
// reformat values already formatted by the backend.

export type TimeFormat = "12h" | "24h"

interface HMS {
  h: number
  m: number
  s: number
}

function toHMS(input: Date | string): HMS | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime())
      ? null
      : { h: input.getHours(), m: input.getMinutes(), s: input.getSeconds() }
  }

  const str = input.trim()
  if (!str || str === "—") return null

  // 12-hour: "h:mm a" / "hh:mm:ss AM"
  const ampm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])$/)
  if (ampm) {
    let h = parseInt(ampm[1]!, 10) % 12
    if (/[Pp]/.test(ampm[4]!)) h += 12
    return { h, m: +ampm[2]!, s: ampm[3] ? +ampm[3] : 0 }
  }

  // 24-hour clock string with no date part: "HH:mm" / "HH:mm:ss"
  const hm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (hm) return { h: +hm[1]!, m: +hm[2]!, s: hm[3] ? +hm[3] : 0 }

  // Fall back to anything Date can parse (ISO date-time, etc.)
  const d = new Date(str)
  return Number.isNaN(d.getTime())
    ? null
    : { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }
}

const pad = (n: number) => String(n).padStart(2, "0")

export interface FormatTimeOptions {
  /** Include seconds. Default false. */
  seconds?: boolean
  /** Value shown when the input can't be parsed. Default "—". */
  fallback?: string
}

export function formatTime(
  input: Date | string | null | undefined,
  format: TimeFormat,
  opts: FormatTimeOptions = {}
): string {
  const fallback = opts.fallback ?? "—"
  if (input == null) return fallback
  const t = toHMS(input)
  if (!t) return fallback

  if (format === "24h") {
    return opts.seconds
      ? `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`
      : `${pad(t.h)}:${pad(t.m)}`
  }

  const period = t.h >= 12 ? "PM" : "AM"
  const h12 = t.h % 12 || 12
  return opts.seconds
    ? `${h12}:${pad(t.m)}:${pad(t.s)} ${period}`
    : `${h12}:${pad(t.m)} ${period}`
}
