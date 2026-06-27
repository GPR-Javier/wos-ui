"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useTimeFormat } from "@/hooks/use-time-format"
import {
  useAttendance,
  useClockIn,
  useClockOut,
  useBreakStart,
  useBreakEnd,
} from "@/hooks/use-employee"
import type { AttendanceBreakEntry } from "@/lib/employee-api"

// ── Break model ───────────────────────────────────────────────────────────────

export interface ClockBreak {
  label: string
  allowMins: number
  elapsed: number
  active: boolean
  startTime: number | null
  /** True once the allowance has been fully consumed (overbreak) — disables the ring. */
  done: boolean
  /** Available only while the day is in overtime (e.g. the Dinner break). */
  otOnly?: boolean
}

export interface BreakConfigEntry {
  label: string
  allowMins: number
  otOnly?: boolean
}

export type BreakConfig = Record<string, BreakConfigEntry>

/** The standard company break policy — shared by the dashboard clock and the DTR clock. */
export const DEFAULT_BREAK_CONFIG: BreakConfig = {
  morning: { label: "Morning", allowMins: 15 },
  lunch: { label: "Lunch", allowMins: 60 },
  afternoon: { label: "Afternoon", allowMins: 15 },
  dinner: { label: "Dinner", allowMins: 30, otOnly: true },
}

// ── Formatting helpers (shared so both screens read identically) ───────────────

export function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${String(m).padStart(2, "0")}m`
}

export function fmtCountdown(secs: number): string {
  const abs = Math.abs(secs)
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ── Internal helpers ───────────────────────────────────────────────────────────

// Local YYYY-MM-DD (matches the backend's record.date, which is the clock-in date).
function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`
}

function buildInitialBreaks(config: BreakConfig): Record<string, ClockBreak> {
  return Object.fromEntries(
    Object.entries(config).map(([k, c]) => [
      k,
      {
        label: c.label,
        allowMins: c.allowMins,
        otOnly: c.otOnly,
        elapsed: 0,
        active: false,
        startTime: null,
        done: false,
      },
    ])
  )
}

/**
 * Folds today's server-side breaks into the local break map so a hard refresh (or login on
 * another device) doesn't lose break progress. Completed breaks add to `elapsed` (and flip
 * `done` once the allowance is consumed); the one open break (endedAt = null) sets `active`.
 */
function hydrateBreaks(
  initial: Record<string, ClockBreak>,
  serverBreaks: AttendanceBreakEntry[] | undefined
): Record<string, ClockBreak> {
  if (!serverBreaks?.length) return initial
  const result: Record<string, ClockBreak> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [
      k,
      { ...v, elapsed: 0, active: false, startTime: null, done: false },
    ])
  )
  for (const br of serverBreaks) {
    const cur = result[br.type]
    if (!cur) continue
    const startMs = new Date(br.startedAt).getTime()
    if (br.endedAt) {
      const endMs = new Date(br.endedAt).getTime()
      const seconds = Math.max(0, Math.floor((endMs - startMs) / 1000))
      const elapsed = cur.elapsed + seconds
      result[br.type] = { ...cur, elapsed, done: elapsed >= cur.allowMins * 60 }
    } else {
      result[br.type] = { ...cur, active: true, startTime: startMs }
    }
  }
  return result
}

// ── Hook ────────────────────────────────────────────────────────────────────────

export interface UseAttendanceClockOptions {
  /** Standard workday length in hours; anything beyond it counts as overtime. */
  requiredHours?: number
  /** Break policy to render. Defaults to {@link DEFAULT_BREAK_CONFIG}. */
  breakConfig?: BreakConfig
}

/**
 * Single source of truth for the live attendance clock used by both the dashboard
 * `ClockWidget` and the DTR clock panel: ticking time, clocked-in state, breaks,
 * overtime, and the status badge. Owns the clock-in/out + break mutations and
 * hydrates from the latest server record. UI lives in `ClockPanel`; modal
 * orchestration (confirm / camera / EOD) stays with the caller.
 */
export function useAttendanceClock(options: UseAttendanceClockOptions = {}) {
  const { requiredHours = 9, breakConfig = DEFAULT_BREAK_CONFIG } = options
  const { formatTime } = useTimeFormat()

  const initialBreaks = useMemo(
    () => buildInitialBreaks(breakConfig),
    [breakConfig]
  )

  const [now, setNow] = useState<Date | null>(null)
  const [clocked, setClocked] = useState(false)
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [clockOutTime, setClockOutTime] = useState<Date | null>(null)
  const [breaks, setBreaks] =
    useState<Record<string, ClockBreak>>(initialBreaks)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // True once today's session is finished (clock-in + clock-out both on today's date).
  // A session that started yesterday and was closed today doesn't count.
  const [completedToday, setCompletedToday] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Camera-validation gating: roles granted DTR:REQUIRE_CAMERA_VALIDATION must capture a
  // photo before clock-in/out; others bypass the camera modal.
  const requiresCameraValidation = useAuthStore((s) =>
    s.authorities.includes("DTR:REQUIRE_CAMERA_VALIDATION")
  )

  const { data: attendanceData } = useAttendance({ page: 0, size: 1 })

  // Hydrate from the latest server record so refresh / re-login keeps the in-flight session.
  useEffect(() => {
    const latest = attendanceData?.content?.[0]
    const today = localISODate(new Date())
    if (latest?.timeIn && !latest.timeOut) {
      setClocked(true)
      setClockInTime(new Date(latest.timeIn))
      setClockOutTime(null)
      setBreaks((prev) => hydrateBreaks(prev, latest.breaks))
      setCompletedToday(false)
    } else if (latest?.timeOut) {
      setClocked(false)
      setClockInTime(latest.timeIn ? new Date(latest.timeIn) : null)
      setClockOutTime(new Date(latest.timeOut))
      setBreaks(initialBreaks)
      setCompletedToday(latest.date === today)
    } else {
      setCompletedToday(false)
    }
  }, [attendanceData, initialBreaks])

  const clockInMutation = useClockIn()
  const clockOutMutation = useClockOut()
  const breakStartMutation = useBreakStart()
  const breakEndMutation = useBreakEnd()
  const isClockBusy = clockInMutation.isPending || clockOutMutation.isPending
  const isBreakBusy = breakStartMutation.isPending || breakEndMutation.isPending

  const applyClockIn = useCallback(async () => {
    try {
      const result = await clockInMutation.mutateAsync()
      setClocked(true)
      setClockInTime(result.timeIn ? new Date(result.timeIn) : new Date())
      setClockOutTime(null)
      setBreaks(initialBreaks)
      setCompletedToday(false)
    } catch (err) {
      console.error("Clock in failed:", err)
    }
  }, [clockInMutation, initialBreaks])

  const applyClockOut = useCallback(async () => {
    try {
      const result = await clockOutMutation.mutateAsync()
      setClocked(false)
      setClockOutTime(result.timeOut ? new Date(result.timeOut) : new Date())
      setBreaks(initialBreaks)
      setCompletedToday(result?.date === localISODate(new Date()))
    } catch (err) {
      console.error("Clock out failed:", err)
    }
  }, [clockOutMutation, initialBreaks])

  // Tick every second.
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      cardRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const toggleBreak = useCallback(
    async (type: string) => {
      const target = breaks[type]
      if (!target || target.done) return

      try {
        if (target.active) {
          // Ending the active break.
          await breakEndMutation.mutateAsync()
          setBreaks((prev) => {
            const cur = prev[type]
            if (!cur) return prev
            const addedSecs = cur.startTime
              ? Math.floor((Date.now() - cur.startTime) / 1000)
              : 0
            const elapsed = cur.elapsed + addedSecs
            return {
              ...prev,
              [type]: {
                ...cur,
                elapsed,
                active: false,
                startTime: null,
                done: elapsed >= cur.allowMins * 60,
              },
            }
          })
        } else {
          // Switching breaks: the backend rejects start while another is open, so end first.
          const activeEntry = Object.entries(breaks).find(([, v]) => v.active)
          if (activeEntry) await breakEndMutation.mutateAsync()
          await breakStartMutation.mutateAsync(type)
          setBreaks((prev) => {
            const next = Object.fromEntries(
              Object.entries(prev).map(([k, v]) => {
                if (v.active && v.startTime) {
                  const addedSecs = Math.floor(
                    (Date.now() - v.startTime) / 1000
                  )
                  const elapsed = v.elapsed + addedSecs
                  return [
                    k,
                    {
                      ...v,
                      elapsed,
                      active: false,
                      startTime: null,
                      done: elapsed >= v.allowMins * 60,
                    },
                  ]
                }
                return [k, v]
              })
            )
            const cur = next[type]
            if (cur)
              next[type] = { ...cur, active: true, startTime: Date.now() }
            return next
          })
        }
      } catch (err) {
        console.error(`Break toggle (${type}) failed:`, err)
      }
    },
    [breaks, breakStartMutation, breakEndMutation]
  )

  const getBreakUsed = useCallback(
    (b: ClockBreak) => {
      if (b.active && b.startTime && now)
        return b.elapsed + Math.floor((now.getTime() - b.startTime) / 1000)
      return b.elapsed
    },
    [now]
  )

  const getBreakRemaining = useCallback(
    (b: ClockBreak) => b.allowMins * 60 - getBreakUsed(b),
    [getBreakUsed]
  )

  // Live worked time = full elapsed since clock-in. Breaks (incl. the 1h lunch) are PAID and
  // count toward the day, so they're not deducted — mirrors the backend's computeWorkedSeconds.
  const workSecs =
    clocked && clockInTime && now
      ? Math.max(0, Math.floor((now.getTime() - clockInTime.getTime()) / 1000))
      : 0

  const breakSecs = Object.values(breaks).reduce(
    (sum, b) => sum + getBreakUsed(b),
    0
  )

  const stdSecs = requiredHours * 3600
  const otSecs = Math.max(0, workSecs - stdSecs)
  const progressPct = Math.min(100, (workSecs / stdSecs) * 100)

  const activeBreakEntry =
    Object.entries(breaks).find(([, b]) => b.active) ?? null
  const anyBreakActive = activeBreakEntry !== null
  const activeBreakRemaining = activeBreakEntry
    ? getBreakRemaining(activeBreakEntry[1])
    : null
  const activeBreakIsOver =
    activeBreakRemaining !== null && activeBreakRemaining < 0

  const timeStr = now ? formatTime(now, { seconds: true }) : "--:--:-- --"
  const dateStr = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : ""

  const statusVariant: "green" | "blue" | "gray" = clocked
    ? "green"
    : completedToday
      ? "blue"
      : "gray"
  const statusLabel = clocked
    ? `Clocked in · ${clockInTime ? formatTime(clockInTime) : ""}`
    : completedToday
      ? "Shift complete for today"
      : "Not clocked in"

  return {
    // state
    now,
    clocked,
    clockInTime,
    clockOutTime,
    completedToday,
    breaks,
    isFullscreen,
    cardRef,
    // flags
    isClockBusy,
    isBreakBusy,
    requiresCameraValidation,
    // computed
    workSecs,
    breakSecs,
    netSecs: workSecs,
    otSecs,
    requiredHours,
    stdSecs,
    progressPct,
    activeBreakEntry,
    anyBreakActive,
    activeBreakRemaining,
    activeBreakIsOver,
    timeStr,
    dateStr,
    statusVariant,
    statusLabel,
    // actions
    applyClockIn,
    applyClockOut,
    toggleBreak,
    toggleFullscreen,
    // helpers
    getBreakUsed,
    getBreakRemaining,
    formatTime,
  }
}

export type AttendanceClock = ReturnType<typeof useAttendanceClock>
