"use client"

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
import {
  fmtCountdown,
  fmtDuration,
  type AttendanceClock,
  type ClockBreak,
} from "@/hooks/use-attendance-clock"

// ── Break windows + icons (shared so both clocks gate breaks identically) ──────

function isBreakInWindow(type: string, now: Date | null): boolean {
  if (!now) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  if (type === "morning") return mins >= 6 * 60 && mins < 12 * 60 // 6:00 – 11:59
  if (type === "lunch") return mins >= 12 * 60 && mins <= 13 * 60 // 12:00 – 1:00 PM
  if (type === "afternoon") return mins > 13 * 60 && mins < 18 * 60 // 1:01 – 5:59 PM
  if (type === "dinner") return mins >= 18 * 60 // 6:00 PM+
  return false
}

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

// ── Break ring (per-break view-model derived from shared clock state) ──────────

function BreakRing({
  type,
  b,
  clock,
}: {
  type: string
  b: ClockBreak
  clock: AttendanceClock
}) {
  const { now, otSecs, isBreakBusy, getBreakRemaining, toggleBreak } = clock
  const remaining = getBreakRemaining(b)
  const isOver = remaining < 0
  const inWindow = isBreakInWindow(type, now)
  const exhausted = b.done
  const isDisabled =
    exhausted ||
    isBreakBusy ||
    (!b.active && (!inWindow || (!!b.otOnly && otSecs === 0)))
  const hasStarted = b.elapsed > 0 || b.active
  const progress = Math.max(0, remaining / (b.allowMins * 60))
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
    : b.otOnly && otSecs === 0
      ? "OT only"
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
      size={56}
      progress={hasStarted ? progress : 1}
      ringColor={ringColor}
      onClick={() => !isDisabled && toggleBreak(type)}
      disabled={isDisabled}
      label={b.label}
      sublabel={sublabel}
      pulse={b.active && isOver}
    >
      {BREAK_ICON[type]?.(iconColor)}
    </RingButton>
  )
}

// ── ClockPanel ────────────────────────────────────────────────────────────────

export interface ClockPanelProps {
  clock: AttendanceClock
  /** Open the clock-in confirmation flow (consumer owns confirm/camera modals). */
  onClockIn: () => void
  /** Open the clock-out flow (consumer owns confirm/camera/EOD modals). */
  onClockOut: () => void
  className?: string
}

/**
 * Presentational clock card shared identically by the dashboard `ClockWidget` and the
 * DTR clock panel: live time, status badge, the "worked today" line, the overtime
 * banner, the primary clock-in/out/end-break button, and the break ring controls. All
 * state comes from {@link useAttendanceClock}; modal orchestration is delegated to the
 * caller via `onClockIn` / `onClockOut`.
 */
export function ClockPanel({
  clock,
  onClockIn,
  onClockOut,
  className,
}: ClockPanelProps) {
  const {
    cardRef,
    isFullscreen,
    toggleFullscreen,
    timeStr,
    dateStr,
    statusVariant,
    statusLabel,
    clocked,
    completedToday,
    workSecs,
    otSecs,
    breaks,
    anyBreakActive,
    activeBreakEntry,
    activeBreakRemaining,
    activeBreakIsOver,
    isClockBusy,
    isBreakBusy,
    toggleBreak,
  } = clock

  const primaryDisabled =
    isClockBusy ||
    isBreakBusy ||
    (completedToday && !clocked && !anyBreakActive)

  function onPrimaryClick() {
    if (anyBreakActive && activeBreakEntry) {
      toggleBreak(activeBreakEntry[0])
    } else if (!clocked) {
      if (!completedToday) onClockIn()
    } else {
      onClockOut()
    }
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        isFullscreen && "flex items-center justify-center",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center px-6 py-5",
          !clocked && "h-full justify-center",
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
          <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>
        </div>

        {/* Worked-today line */}
        {clocked && (
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
            <span>Worked today</span>
            <span className="font-semibold text-foreground tabular-nums">
              {fmtDuration(workSecs)}
            </span>
            {anyBreakActive && <span className="text-warning">· on break</span>}
          </div>
        )}

        {/* OT banner */}
        {clocked && otSecs > 0 && (
          <div className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12px] font-medium text-primary">
            <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={2} />
            OT: {fmtDuration(otSecs)}
          </div>
        )}

        {/* Clock in / out / end-break button */}
        <button
          disabled={primaryDisabled}
          onClick={onPrimaryClick}
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
              {Object.entries(breaks).map(([type, b]) => (
                <BreakRing key={type} type={type} b={b} clock={clock} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
