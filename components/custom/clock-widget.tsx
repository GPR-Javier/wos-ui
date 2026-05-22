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
} from "@hugeicons/core-free-icons"
import { AttendanceCameraCapture } from "@/components/custom/attendance-camera-capture"
import { useAuthStore } from "@/store/auth-store"

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

function fmtTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
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
  const [now, setNow] = useState<Date | null>(null)
  const [clocked, setClocked] = useState(false)
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [cameraPunchType, setCameraPunchType] = useState<"in" | "out" | null>(
    null
  )
  const [breaks, setBreaks] = useState<Record<string, BreakState>>(INIT_BREAKS)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Camera-validation gating: roles granted DTR:REQUIRE_CAMERA_VALIDATION must
  // capture a photo before clock-in/out; others bypass the camera modal.
  const requiresCameraValidation = useAuthStore((s) =>
    s.authorities.includes("DTR:REQUIRE_CAMERA_VALIDATION")
  )

  const applyPunch = useCallback((type: "in" | "out") => {
    if (type === "in") {
      setClocked(true)
      setClockInTime(new Date())
      setBreaks(INIT_BREAKS)
    } else {
      setClocked(false)
      setClockInTime(null)
      setBreaks(INIT_BREAKS)
    }
  }, [])

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

  const toggleBreak = useCallback((type: string) => {
    setBreaks((prev) => {
      const b = prev[type]
      if (!b) return prev
      if (!b.active) {
        const next = Object.fromEntries(
          Object.entries(prev).map(([k, v]) =>
            v.active && v.startTime
              ? [
                  k,
                  {
                    ...v,
                    elapsed:
                      v.elapsed + Math.floor((Date.now() - v.startTime) / 1000),
                    active: false,
                    startTime: null,
                  },
                ]
              : [k, v]
          )
        )
        next[type] = { ...b, active: true, startTime: Date.now() }
        return next
      } else {
        const elapsed =
          b.elapsed +
          (b.startTime ? Math.floor((Date.now() - b.startTime) / 1000) : 0)
        return {
          ...prev,
          [type]: { ...b, elapsed, active: false, startTime: null },
        }
      }
    })
  }, [])

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

  const timeStr = now
    ? now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "--:-- --"
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
          <StatusBadge variant={clocked ? "green" : "gray"}>
            {clocked
              ? `Clocked in · ${clockInTime ? fmtTime(clockInTime) : ""}`
              : "Not clocked in"}
          </StatusBadge>
        </div>

        {/* Clock in/out / End break button */}
        <button
          onClick={() => {
            if (anyBreakActive && activeBreakEntry) {
              toggleBreak(activeBreakEntry[0])
            } else if (!clocked) {
              startPunch("in")
            } else {
              startPunch("out")
            }
          }}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all duration-150",
            !clocked &&
              "bg-primary text-primary-foreground hover:bg-primary/90",
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
                const isDisabled = exhausted || (!b.active && !inWindow)
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
