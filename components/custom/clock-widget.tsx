"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./status-badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Coffee01Icon,
  SpoonAndForkIcon,
  Sun01Icon,
  Moon01Icon,
  MaximizeScreenIcon,
  MinimizeScreenIcon,
  Clock01Icon,
  StopCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { AttendanceCameraCapture } from "@/components/custom/attendance-camera-capture"
import { ConfirmPunchModal } from "@/components/custom/confirm-punch-modal"
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

// ── types ─────────────────────────────────────────────────────────────────────

interface BreakState {
  label: string
  allowMins: number
  elapsed: number
  active: boolean
  startTime: number | null
}

const INIT_BREAKS: Record<string, BreakState> = {
  morning: {
    label: "Morning",
    allowMins: 15,
    elapsed: 0,
    active: false,
    startTime: null,
  },
  lunch: {
    label: "Lunch",
    allowMins: 60,
    elapsed: 0,
    active: false,
    startTime: null,
  },
  afternoon: {
    label: "Afternoon",
    allowMins: 15,
    elapsed: 0,
    active: false,
    startTime: null,
  },
  dinner: {
    label: "Dinner",
    allowMins: 30,
    elapsed: 0,
    active: false,
    startTime: null,
  },
}

// ── helpers ───────────────────────────────────────────────────────────────────

// Local YYYY-MM-DD (matches the backend's record.date, which is the clock-in date).
function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`
}

function isBreakInWindow(type: string, now: Date | null): boolean {
  if (!now) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  if (type === "morning") return mins >= 6 * 60 && mins < 12 * 60 // 6:00 – 11:59
  if (type === "lunch") return mins >= 12 * 60 && mins <= 13 * 60 // 12:00 – 1:00 PM
  if (type === "afternoon") return mins > 13 * 60 && mins < 18 * 60 // 1:01 – 5:59 PM
  if (type === "dinner") return mins >= 18 * 60 // 6:00 PM+
  return false
}

// ── Hydration helper ─────────────────────────────────────────────────────────

/**
 * Folds the server-side breaks for today into the local BreakState map:
 * - Completed breaks add to `elapsed`
 * - The single active break (endedAt = null) sets `active` + `startTime`
 * Unknown break types are ignored so the UI stays in sync with what's defined locally.
 */
function hydrateBreaks(
  initial: Record<string, BreakState>,
  serverBreaks: AttendanceBreakEntry[] | undefined
): Record<string, BreakState> {
  if (!serverBreaks?.length) return initial
  const result: Record<string, BreakState> = Object.fromEntries(
    Object.entries(initial).map(([k, v]) => [
      k,
      { ...v, elapsed: 0, active: false, startTime: null },
    ])
  )
  for (const br of serverBreaks) {
    const cur = result[br.type]
    if (!cur) continue
    const startMs = new Date(br.startedAt).getTime()
    if (br.endedAt) {
      const endMs = new Date(br.endedAt).getTime()
      const seconds = Math.max(0, Math.floor((endMs - startMs) / 1000))
      result[br.type] = { ...cur, elapsed: cur.elapsed + seconds }
    } else {
      result[br.type] = { ...cur, active: true, startTime: startMs }
    }
  }
  return result
}

// ── RingButton ────────────────────────────────────────────────────────────────

function RingButton({
  size,
  progress,
  ringColor,
  onClick,
  disabled,
  children,
  label,
  sublabel,
  pulse,
}: {
  size: number
  progress: number
  ringColor: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  label: string
  sublabel?: string
  pulse?: boolean
}) {
  const sw = 3
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)))

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative flex items-center justify-center rounded-full bg-muted/50 transition-all duration-150",
          !disabled && "hover:bg-muted",
          disabled && "cursor-not-allowed opacity-40",
          pulse && "animate-pulse"
        )}
        style={{ width: size, height: size }}
      >
        <svg
          className="absolute inset-0"
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--bdr)"
            strokeWidth={sw}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
        <span className="relative z-10">{children}</span>
      </button>
      <div className="text-center leading-tight">
        <p className="text-[11px] font-semibold text-foreground">{label}</p>
        {sublabel && (
          <p className="text-[10px] text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </div>
  )
}

// ── icons ─────────────────────────────────────────────────────────────────────

const BREAK_ICON: Record<string, (color: string) => React.ReactNode> = {
  morning: (c) => (
    <HugeiconsIcon icon={Coffee01Icon} size={15} strokeWidth={2} color={c} />
  ),
  lunch: (c) => (
    <HugeiconsIcon
      icon={SpoonAndForkIcon}
      size={15}
      strokeWidth={2}
      color={c}
    />
  ),
  afternoon: (c) => (
    <HugeiconsIcon icon={Sun01Icon} size={15} strokeWidth={2} color={c} />
  ),
  dinner: (c) => (
    <HugeiconsIcon icon={Moon01Icon} size={15} strokeWidth={2} color={c} />
  ),
}

// ── ClockWidget ───────────────────────────────────────────────────────────────

export function ClockWidget() {
  const { formatTime } = useTimeFormat()
  const [now, setNow] = useState<Date | null>(null)
  const [clocked, setClocked] = useState(false)
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [cameraPunchType, setCameraPunchType] = useState<"in" | "out" | null>(
    null
  )
  const [confirmPunchType, setConfirmPunchType] = useState<"in" | "out" | null>(
    null
  )
  const [breaks, setBreaks] = useState<Record<string, BreakState>>(INIT_BREAKS)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // True once today's session is finished (clock-in + clock-out both on today's
  // date). A session that started yesterday and was closed today doesn't count —
  // that clock-out belongs to yesterday, so clocking in again today is allowed.
  const [completedToday, setCompletedToday] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Camera-validation gating: roles granted DTR:REQUIRE_CAMERA_VALIDATION must
  // capture a photo before clock-in/out; others bypass the camera modal.
  const requiresCameraValidation = useAuthStore((s) =>
    s.authorities.includes("DTR:REQUIRE_CAMERA_VALIDATION")
  )

  // Hydrate from the latest server-side attendance record so a hard refresh
  // (or login on another device) doesn't lose the clocked-in state.
  const { data: attendanceData } = useAttendance({ page: 0, size: 1 })
  useEffect(() => {
    const latest = attendanceData?.content?.[0]
    const today = localISODate(new Date())
    if (latest?.timeIn && !latest.timeOut) {
      setClocked(true)
      setClockInTime(new Date(latest.timeIn))
      setBreaks((prev) => hydrateBreaks(prev, latest.breaks))
      setCompletedToday(false)
    } else if (latest?.timeOut) {
      setClocked(false)
      setClockInTime(null)
      setBreaks(INIT_BREAKS)
      // Only blocks re-clock-in when the finished session's date is today.
      setCompletedToday(latest.date === today)
    } else {
      setCompletedToday(false)
    }
  }, [attendanceData])

  const clockInMutation = useClockIn()
  const clockOutMutation = useClockOut()
  const breakStartMutation = useBreakStart()
  const breakEndMutation = useBreakEnd()
  const isClockBusy = clockInMutation.isPending || clockOutMutation.isPending
  const isBreakBusy = breakStartMutation.isPending || breakEndMutation.isPending

  const applyPunch = useCallback(
    async (type: "in" | "out") => {
      try {
        if (type === "in") {
          const result = await clockInMutation.mutateAsync()
          setClocked(true)
          setClockInTime(result.timeIn ? new Date(result.timeIn) : new Date())
          setBreaks(INIT_BREAKS)
          setCompletedToday(false)
        } else {
          const result = await clockOutMutation.mutateAsync()
          setClocked(false)
          setClockInTime(null)
          setBreaks(INIT_BREAKS)
          // Block re-clock-in only if this finished session started today.
          setCompletedToday(result?.date === localISODate(new Date()))
        }
      } catch (err) {
        // Surface in console for now — caller can layer a toast on top later.
        console.error(`Clock ${type} failed:`, err)
      }
    },
    [clockInMutation, clockOutMutation]
  )

  const startPunch = useCallback(
    (type: "in" | "out") => {
      if (requiresCameraValidation) {
        setCameraPunchType(type)
      } else {
        applyPunch(type)
      }
    },
    [requiresCameraValidation, applyPunch]
  )

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      cardRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const toggleBreak = useCallback(
    async (type: string) => {
      const target = breaks[type]
      if (!target) return

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
            return {
              ...prev,
              [type]: {
                ...cur,
                elapsed: cur.elapsed + addedSecs,
                active: false,
                startTime: null,
              },
            }
          })
        } else {
          // Switching to a new break: backend rejects start while another is open,
          // so end the active one first.
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
                  return [
                    k,
                    {
                      ...v,
                      elapsed: v.elapsed + addedSecs,
                      active: false,
                      startTime: null,
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

  const getBreakData = (b: BreakState) => {
    const used =
      b.active && b.startTime && now
        ? b.elapsed + Math.floor((now.getTime() - b.startTime) / 1000)
        : b.elapsed
    const remaining = b.allowMins * 60 - used
    const isOver = remaining < 0
    const progress = Math.max(0, remaining / (b.allowMins * 60))
    return { remaining, isOver, progress }
  }

  const activeBreakEntry =
    Object.entries(breaks).find(([, b]) => b.active) ?? null
  const anyBreakActive = activeBreakEntry !== null

  // Countdown for the active break (seconds remaining, negative = overbreak)
  const activeBreakRemaining = activeBreakEntry
    ? (() => {
        const b = activeBreakEntry[1]
        const used =
          b.startTime && now
            ? b.elapsed + Math.floor((now.getTime() - b.startTime) / 1000)
            : b.elapsed
        return b.allowMins * 60 - used
      })()
    : null
  const activeBreakIsOver =
    activeBreakRemaining !== null && activeBreakRemaining < 0

  const fmtCountdown = (secs: number) => {
    const abs = Math.abs(secs)
    const m = Math.floor(abs / 60)
    const s = abs % 60
    return `${m}:${String(s).padStart(2, "0")}`
  }

  // Live worked time = full elapsed since clock-in. Breaks (incl. the 1h lunch) are PAID and count
  // toward the day, so they're not deducted — mirrors the backend's computeWorkedSeconds.
  const workedSeconds =
    clocked && clockInTime && now
      ? Math.max(0, Math.floor((now.getTime() - clockInTime.getTime()) / 1000))
      : 0

  const fmtWorked = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return `${h}h ${String(m).padStart(2, "0")}m`
  }

  const timeStr = now ? formatTime(now, { seconds: true }) : "--:-- --"
  const dateStr = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : ""

  return (
    <div
      ref={cardRef}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        isFullscreen && "flex items-center justify-center"
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center px-6 py-5",
          isFullscreen && "w-full max-w-sm"
        )}
        style={
          isFullscreen
            ? {
                transform: "scale(2.2)",
                transformOrigin: "center center",
                gap: "14px",
              }
            : undefined
        }
      >
        {/* Header row: label + fullscreen toggle */}
        <div className="flex w-full items-center justify-between">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Current time
          </p>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleFullscreen}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {isFullscreen ? (
                    <HugeiconsIcon
                      icon={MinimizeScreenIcon}
                      size={13}
                      strokeWidth={2}
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={MaximizeScreenIcon}
                      size={13}
                      strokeWidth={2}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Big clock */}
        <p
          className="mt-2 leading-none font-bold tabular-nums"
          style={{ fontSize: 40, letterSpacing: "-1px" }}
        >
          {timeStr}
        </p>

        {/* Date */}
        <p className="mt-1 text-[12px] text-muted-foreground">{dateStr}</p>

        {/* Status badge */}
        <div className="mt-3">
          <StatusBadge
            variant={clocked ? "green" : completedToday ? "blue" : "gray"}
          >
            {clocked
              ? `Clocked in · ${clockInTime ? formatTime(clockInTime) : ""}`
              : completedToday
                ? "Shift complete for today"
                : "Not clocked in"}
          </StatusBadge>
        </div>

        {/* Total hours worked indicator */}
        {clocked && (
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
            <span>Worked today</span>
            <span className="font-semibold text-foreground tabular-nums">
              {fmtWorked(workedSeconds)}
            </span>
            {anyBreakActive && <span className="text-warning">· on break</span>}
          </div>
        )}

        {/* Clock in/out / End break button */}
        <button
          disabled={
            isClockBusy ||
            isBreakBusy ||
            (completedToday && !clocked && !anyBreakActive)
          }
          onClick={() => {
            if (anyBreakActive && activeBreakEntry) {
              toggleBreak(activeBreakEntry[0])
            } else if (!clocked) {
              if (!completedToday) setConfirmPunchType("in")
            } else {
              setConfirmPunchType("out")
            }
          }}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60",
            !clocked &&
              !completedToday &&
              "bg-primary text-primary-foreground hover:bg-primary/90",
            !clocked &&
              completedToday &&
              "border border-success-border bg-success-light text-success",
            clocked &&
              !anyBreakActive &&
              "border border-danger-border bg-danger-light text-danger hover:bg-rt",
            anyBreakActive &&
              !activeBreakIsOver &&
              "border border-success-border bg-success-light text-success hover:bg-gt",
            anyBreakActive &&
              activeBreakIsOver &&
              "animate-pulse border border-danger-border bg-danger-light text-danger hover:bg-rt"
          )}
        >
          {anyBreakActive ? (
            <>
              <HugeiconsIcon icon={Clock01Icon} size={13} strokeWidth={2} />
              {activeBreakIsOver
                ? `End Break · ⚠ +${fmtCountdown(activeBreakRemaining!)} over`
                : `End Break · ${fmtCountdown(activeBreakRemaining!)} left`}
            </>
          ) : clocked ? (
            <>
              <HugeiconsIcon icon={StopCircleIcon} size={13} strokeWidth={2} />
              Clock Out
            </>
          ) : completedToday ? (
            <>
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={13}
                strokeWidth={2}
              />
              Completed for today
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Clock01Icon} size={13} strokeWidth={2} />
              Clock In
            </>
          )}
        </button>

        {/* Break controls — only when clocked in */}
        {clocked && (
          <>
            <div className="my-4 h-px w-full bg-border" />
            <p className="mb-3 w-full text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Break controls
            </p>
            <div className="flex w-full items-start justify-around">
              {Object.entries(breaks).map(([type, b]) => {
                const { remaining, isOver, progress } = getBreakData(b)
                const hasStarted = b.elapsed > 0 || b.active
                const inWindow = isBreakInWindow(type, now)
                const exhausted = !b.active && b.elapsed >= b.allowMins * 60
                const isDisabled =
                  exhausted || (!b.active && !inWindow) || isBreakBusy
                const ringColor =
                  isDisabled || !hasStarted
                    ? "transparent"
                    : isOver
                      ? "var(--red)"
                      : "var(--green)"
                const iconColor = b.active
                  ? isOver
                    ? "var(--red)"
                    : "var(--green)"
                  : isDisabled
                    ? "var(--tx3)"
                    : hasStarted
                      ? "var(--tx3)"
                      : "var(--tx2)"
                const minsLeft = Math.ceil((b.allowMins * 60 - b.elapsed) / 60)
                const sublabel = exhausted
                  ? "Overbreak"
                  : !inWindow && !b.active
                    ? "Not available"
                    : b.active
                      ? isOver
                        ? `⚠ +${Math.ceil(Math.abs(remaining) / 60)}m`
                        : `${Math.ceil(remaining / 60)}m left`
                      : b.elapsed > 0
                        ? `${minsLeft}m left`
                        : `${b.allowMins}m left`

                return (
                  <RingButton
                    key={type}
                    size={56}
                    progress={hasStarted ? progress : 1}
                    ringColor={ringColor}
                    onClick={() => toggleBreak(type)}
                    disabled={isDisabled}
                    label={b.label}
                    sublabel={sublabel}
                    pulse={b.active && isOver}
                  >
                    {BREAK_ICON[type]?.(iconColor)}
                  </RingButton>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ConfirmPunchModal
        punchType={confirmPunchType}
        onCancel={() => setConfirmPunchType(null)}
        onConfirm={() => {
          if (confirmPunchType) startPunch(confirmPunchType)
          setConfirmPunchType(null)
        }}
      />

      {cameraPunchType && (
        <PunchCameraModal
          punchType={cameraPunchType}
          onClose={() => setCameraPunchType(null)}
          onCaptured={() => {
            applyPunch(cameraPunchType)
            setCameraPunchType(null)
          }}
        />
      )}
    </div>
  )
}

function PunchCameraModal({
  punchType,
  onClose,
  onCaptured,
}: {
  punchType: "in" | "out"
  onClose: () => void
  onCaptured: (capturedTime: string) => void
}) {
  const isClockIn = punchType === "in"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {isClockIn ? "Clock In" : "Clock Out"} Verification
            </p>
            <p className="text-[13px] text-muted-foreground">
              Capture your photo to complete{" "}
              {isClockIn ? "clock in" : "clock out"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close camera"
          >
            ✕
          </button>
        </div>
        <AttendanceCameraCapture
          punchType={punchType}
          onCapture={onCaptured}
          onBack={onClose}
        />
      </div>
    </div>
  )
}
