"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
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
  EyeIcon,
  File01Icon,
} from "@hugeicons/core-free-icons"
import { StatusBadge } from "@/components/custom/status-badge"
import { DtrChangeModal } from "@/components/custom/dtr-change-modal"
import { ScheduleChangeRequestModal } from "@/components/custom/schedule-change-request-modal"
import { MyPolicyHistoryModal } from "@/components/custom/my-policy-history-modal"
import { AttendanceCameraCapture } from "@/components/custom/attendance-camera-capture"
import { ConfirmPunchModal } from "@/components/custom/confirm-punch-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AttendanceRecord } from "@/lib/types"
import { TablePagination } from "@/components/custom/table-pagination"
import { AttendanceHeatmap } from "@/components/custom/attendance-heatmap"
import {
  useAttendance,
  useClockIn,
  useClockOut,
  useBreakStart,
  useBreakEnd,
} from "@/hooks/use-employee"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import { useTimeFormat } from "@/hooks/use-time-format"
import type { AttendanceBreakEntry, AttendanceEntry } from "@/lib/employee-api"

function toAttendanceRecord(e: AttendanceEntry): AttendanceRecord {
  return e as AttendanceRecord
}

const statusVariant: Record<
  string,
  "green" | "red" | "amber" | "gray" | "blue" | "purple"
> = {
  present: "green",
  late: "amber",
  absent: "red",
  leave: "blue",
  holiday: "purple",
  restday: "gray",
  overtime: "blue",
  overbreak: "red",
  undertime: "amber",
}

const APPEAL_STATUSES = new Set(["late", "undertime", "overtime", "overbreak"])
// Time-change is only relevant when clock-in/out caused the issue
const TIME_CHANGE_STATUSES = new Set(["late", "undertime"])

// ── View Modal ────────────────────────────────────────────────────────────────

function ViewModal({
  record,
  note,
  open,
  onClose,
}: {
  record: AttendanceRecord | null
  note?: string
  open: boolean
  onClose: () => void
}) {
  const { formatTime } = useTimeFormat()
  if (!record) return null
  const rows = [
    { label: "Date", value: `${record.date} · ${record.day}` },
    { label: "Time in", value: formatTime(record.timeIn) },
    { label: "Time out", value: formatTime(record.timeOut) },
    { label: "Hours worked", value: record.hoursWorked },
    {
      label: "OT hours",
      value: record.otHours !== "—" ? `+${record.otHours}h` : "—",
    },
    {
      label: "Status",
      value: record.status.charAt(0).toUpperCase() + record.status.slice(1),
    },
    ...(note ? [{ label: "Notes", value: note }] : []),
  ]
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Attendance record</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border rounded-lg border border-border text-[13px]">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── EOD Report Modal ──────────────────────────────────────────────────────────

interface EodReport {
  teacherName: string
  bookedClasses: string
  openSlots: string
  ratings: { 5: string; 4: string; 3: string; 2: string; 1: string }
  hoursWorked: string
}

function EodReportModal({
  open,
  reportDate,
  hoursWorked,
  onClose,
  onSubmit,
}: {
  open: boolean
  reportDate: string
  hoursWorked: string
  onClose: () => void
  onSubmit: (report: EodReport | null) => void
}) {
  const [form, setForm] = useState<EodReport>({
    teacherName: "",
    bookedClasses: "",
    openSlots: "",
    ratings: { 5: "", 4: "", 3: "", 2: "", 1: "" },
    hoursWorked,
  })

  useEffect(() => {
    if (open) {
      setForm({
        teacherName: "",
        bookedClasses: "",
        openSlots: "",
        ratings: { 5: "", 4: "", 3: "", 2: "", 1: "" },
        hoursWorked,
      })
    }
  }, [open, hoursWorked])

  const setRating = (star: keyof EodReport["ratings"], val: string) =>
    setForm((f) => ({ ...f, ratings: { ...f.ratings, [star]: val } }))

  const canSubmit = form.teacherName.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">End-of-Day Report</DialogTitle>
        </DialogHeader>

        {/* Date header */}
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-[12px]">
          <span className="text-muted-foreground">EOD Report as of: </span>
          <span className="font-semibold tabular-nums">{reportDate}</span>
        </div>

        <div className="space-y-4">
          {/* Teacher name */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Teacher&apos;s Name</Label>
            <Input
              className="h-9 text-[13px]"
              placeholder="Enter your name"
              value={form.teacherName}
              onChange={(e) =>
                setForm((f) => ({ ...f, teacherName: e.target.value }))
              }
            />
          </div>

          {/* Booked + Open slots */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Total booked classes</Label>
              <Input
                type="number"
                min={0}
                className="h-9 text-[13px]"
                placeholder="0"
                value={form.bookedClasses}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bookedClasses: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Open slots</Label>
              <Input
                type="number"
                min={0}
                className="h-9 text-[13px]"
                placeholder="0"
                value={form.openSlots}
                onChange={(e) =>
                  setForm((f) => ({ ...f, openSlots: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Star ratings */}
          <div className="space-y-2">
            <Label className="text-[12px]">Star Ratings</Label>
            <div className="divide-y divide-border rounded-lg border border-border">
              {([5, 4, 3, 2, 1] as const).map((star) => (
                <div
                  key={star}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium tabular-nums">
                      {star}
                    </span>
                    <span className="text-amber-400">{"★".repeat(star)}</span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    className="h-7 w-20 text-right text-[13px]"
                    placeholder="—"
                    value={form.ratings[star]}
                    onChange={(e) => setRating(star, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Hours worked — read-only */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Number of hours worked</Label>
            <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-[13px] font-semibold tabular-nums">
              {hoursWorked}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => onSubmit(null)}
            className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Skip for now &amp; proceed to time out
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canSubmit}
              onClick={() => onSubmit(form)}
            >
              Submit &amp; Clock Out
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Appeal Modal ──────────────────────────────────────────────────────────────

function AppealModal({
  record,
  open,
  onClose,
  onSubmit,
}: {
  record: AttendanceRecord | null
  open: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  const [changeTime, setChangeTime] = useState(false)
  const [timeIn, setTimeIn] = useState("")
  const [timeOut, setTimeOut] = useState("")

  useEffect(() => {
    if (open && record) {
      setReason("")
      setChangeTime(false)
      setTimeIn(record.timeIn === "—" ? "" : record.timeIn)
      setTimeOut(record.timeOut === "—" ? "" : record.timeOut)
    }
  }, [open, record])

  if (!record) return null

  const canChangeTime = TIME_CHANGE_STATUSES.has(record.status)

  const handleSubmit = () => {
    onSubmit(reason.trim())
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>File an appeal</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-muted-foreground">
          {record.date} · {record.day} ·{" "}
          <span className="capitalize">{record.status}</span>
        </p>
        <div className="space-y-4">
          {/* Checkbox to enable time change — only for late / undertime */}
          {canChangeTime && (
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={changeTime}
                onChange={(e) => setChangeTime(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-primary"
              />
              <span className="font-medium">Change clock in / clock out</span>
            </label>
          )}

          {/* Time fields — visible only when checkbox checked */}
          {canChangeTime && changeTime && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Correct time in</Label>
                <Input
                  value={timeIn}
                  onChange={(e) => setTimeIn(e.target.value)}
                  placeholder="e.g. 9:00 AM"
                  className="h-8 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Correct time out</Label>
                <Input
                  value={timeOut}
                  onChange={(e) => setTimeOut(e.target.value)}
                  placeholder="e.g. 6:00 PM"
                  className="h-8 text-[13px]"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[12px]">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for your appeal..."
              className="min-h-20 resize-none text-[13px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!reason.trim()} onClick={handleSubmit}>
            Submit appeal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DtrBreak {
  label: string
  allowMins: number
  elapsed: number
  active: boolean
  startTime: number | null
  done: boolean
  otOnly?: boolean
}

/**
 * Folds server breaks for the current attendance record into the local DtrBreak map.
 * Completed breaks add to `elapsed` and may flip `done` once allowance is consumed;
 * the one open break (endedAt = null) sets `active` + `startTime`.
 */
function hydrateDtrBreaks(
  initial: Record<string, DtrBreak>,
  serverBreaks: AttendanceBreakEntry[] | undefined
): Record<string, DtrBreak> {
  if (!serverBreaks?.length) return initial
  const result: Record<string, DtrBreak> = Object.fromEntries(
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
      result[br.type] = {
        ...cur,
        elapsed,
        done: elapsed >= cur.allowMins * 60,
      }
    } else {
      result[br.type] = { ...cur, active: true, startTime: startMs }
    }
  }
  return result
}

const INITIAL_BREAKS: Record<string, DtrBreak> = {
  morning: {
    label: "Morning",
    allowMins: 15,
    elapsed: 0,
    active: false,
    startTime: null,
    done: false,
  },
  lunch: {
    label: "Lunch",
    allowMins: 60,
    elapsed: 0,
    active: false,
    startTime: null,
    done: false,
  },
  afternoon: {
    label: "Afternoon",
    allowMins: 15,
    elapsed: 0,
    active: false,
    startTime: null,
    done: false,
  },
  dinner: {
    label: "Dinner",
    allowMins: 30,
    elapsed: 0,
    active: false,
    startTime: null,
    done: false,
    otOnly: true,
  },
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${String(m).padStart(2, "0")}m`
}

function isBreakInWindow(type: string, now: Date | null): boolean {
  if (!now) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  if (type === "morning") return mins >= 6 * 60 && mins < 12 * 60
  if (type === "lunch") return mins >= 12 * 60 && mins <= 13 * 60
  if (type === "afternoon") return mins > 13 * 60 && mins < 18 * 60
  if (type === "dinner") return mins >= 18 * 60
  return false
}

// ── Ring button ───────────────────────────────────────────────────────────────

function DtrRingButton({
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
          "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40",
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
            x
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

const BREAK_ICONS: Record<string, (color: string) => React.ReactNode> = {
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

export function DTRSection() {
  const { formatTime } = useTimeFormat()
  const [now, setNow] = useState<Date | null>(null)
  const [clocked, setClocked] = useState(false)
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [clockOutTime, setClockOutTime] = useState<Date | null>(null)
  const [breaks, setBreaks] = useState<Record<string, DtrBreak>>(INITIAL_BREAKS)
  const [dtrOpen, setDtrOpen] = useState(false)
  const [scheduleChangeOpen, setScheduleChangeOpen] = useState(false)
  const [scheduleHistoryOpen, setScheduleHistoryOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const clockCardRef = useRef<HTMLDivElement>(null)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null
  )
  const [viewOpen, setViewOpen] = useState(false)
  const [appealOpen, setAppealOpen] = useState(false)
  const [recordNotes, setRecordNotes] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [cameraPunchType, setCameraPunchType] = useState<"in" | "out" | null>(
    null
  )
  const [confirmPunchType, setConfirmPunchType] = useState<"in" | "out" | null>(
    null
  )
  const [eodOpen, setEodOpen] = useState(false)
  const [pendingClockOut, setPendingClockOut] = useState<Date | null>(null)

  // Camera-validation gating: roles granted DTR:REQUIRE_CAMERA_VALIDATION must
  // capture a photo before clock-in/out; others bypass the camera modal.
  const requiresCameraValidation = useAuthStore((s) =>
    s.authorities.includes("DTR:REQUIRE_CAMERA_VALIDATION")
  )

  const { data: myPolicy } = useMyPolicy()
  const clockInMutation = useClockIn()
  const clockOutMutation = useClockOut()
  const breakStartMutation = useBreakStart()
  const breakEndMutation = useBreakEnd()
  const isClockBusy = clockInMutation.isPending || clockOutMutation.isPending
  const isBreakBusy = breakStartMutation.isPending || breakEndMutation.isPending

  async function applyClockIn() {
    try {
      const result = await clockInMutation.mutateAsync()
      setClocked(true)
      setClockInTime(result.timeIn ? new Date(result.timeIn) : new Date())
      setClockOutTime(null)
      setBreaks(INITIAL_BREAKS)
    } catch (err) {
      console.error("Clock in failed:", err)
    }
  }

  function startClockOut() {
    // Skip the camera but still capture the EOD report before finalising.
    setPendingClockOut(new Date())
    setEodOpen(true)
  }

  function startPunch(type: "in" | "out") {
    if (requiresCameraValidation) {
      setCameraPunchType(type)
    } else if (type === "in") {
      applyClockIn()
    } else {
      startClockOut()
    }
  }

  async function finalizeClockOut() {
    try {
      const result = await clockOutMutation.mutateAsync()
      setClocked(false)
      setClockOutTime(
        result.timeOut
          ? new Date(result.timeOut)
          : (pendingClockOut ?? new Date())
      )
      setBreaks(INITIAL_BREAKS)
      setPendingClockOut(null)
      setEodOpen(false)
    } catch (err) {
      console.error("Clock out failed:", err)
    }
  }

  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance({
    page: page - 1,
    size: pageSize,
  })

  // Hydrate clocked-in state and any in-flight break from the latest server record
  // so refresh / re-login doesn't drop the in-flight session.
  useEffect(() => {
    const latest = attendanceData?.content?.[0]
    if (latest?.timeIn && !latest.timeOut) {
      setClocked(true)
      setClockInTime(new Date(latest.timeIn))
      setBreaks((prev) => hydrateDtrBreaks(prev, latest.breaks))
    } else if (latest?.timeOut) {
      setClocked(false)
      setClockInTime(null)
      setBreaks(INITIAL_BREAKS)
    }
  }, [attendanceData])

  const paginated = (attendanceData?.content ?? []).map(toAttendanceRecord)
  const total = attendanceData?.totalElements ?? 0
  const totalPages = attendanceData?.totalPages ?? 0

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
      clockCardRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const workSecs =
    clocked && clockInTime && now
      ? Math.floor((now.getTime() - clockInTime.getTime()) / 1000)
      : 0

  const breakSecs = Object.values(breaks).reduce((sum, b) => {
    if (b.active && b.startTime && now)
      return sum + Math.floor((now.getTime() - b.startTime) / 1000)
    return sum + b.elapsed
  }, 0)

  // Breaks (incl. the 1h lunch) are paid and count toward the day → worked = full presence span.
  const netSecs = workSecs
  const requiredHours = myPolicy?.requiredHours ?? 9
  const stdSecs = requiredHours * 3600
  const otSecs = Math.max(0, netSecs - stdSecs)
  const progressPct = Math.min(100, (netSecs / stdSecs) * 100)

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
          // Switch breaks: backend rejects start while another is open, so end first.
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

  const getBreakRemaining = (b: DtrBreak) => {
    const used =
      b.active && b.startTime && now
        ? b.elapsed + Math.floor((now.getTime() - b.startTime) / 1000)
        : b.elapsed
    return b.allowMins * 60 - used
  }

  const getBreakUsed = (b: DtrBreak) => {
    if (b.active && b.startTime && now)
      return b.elapsed + Math.floor((now.getTime() - b.startTime) / 1000)
    return b.elapsed
  }

  const timeStr = now ? formatTime(now, { seconds: true }) : "--:--:-- --"

  const dateStr = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : ""

  const activeBreakEntry =
    Object.entries(breaks).find(([, b]) => b.active) ?? null
  const anyBreakActive = activeBreakEntry !== null

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

  const clockStatus = clocked ? "green" : clockOutTime ? "blue" : "gray"
  const clockLabel = clocked
    ? "Clocked in"
    : clockOutTime
      ? "Complete"
      : "Not clocked in"

  return (
    <div className="space-y-6">
      {/* Clock + summary */}
      <div className="grid grid-cols-5 gap-4">
        {/* ── Clock panel ── */}
        <div
          ref={clockCardRef}
          className={cn(
            "col-span-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm",
            isFullscreen && "flex items-center justify-center"
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
              <StatusBadge variant={clockStatus}>{clockLabel}</StatusBadge>
            </div>

            {/* OT banner */}
            {clocked && otSecs > 0 && (
              <div className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12px] font-medium text-primary">
                <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={2} />
                OT: {fmtDuration(otSecs)}
              </div>
            )}

            {/* Clock in / Clock out / End break button */}
            <button
              disabled={isClockBusy || isBreakBusy}
              onClick={() => {
                if (anyBreakActive && activeBreakEntry) {
                  toggleBreak(activeBreakEntry[0])
                } else if (!clocked) {
                  setConfirmPunchType("in")
                } else {
                  setConfirmPunchType("out")
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
                  <HugeiconsIcon
                    icon={StopCircleIcon}
                    size={13}
                    strokeWidth={2}
                  />
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
                    const remaining = getBreakRemaining(b)
                    const isOverbreak = remaining < 0
                    const inWindow = isBreakInWindow(type, now)
                    const exhausted = b.done // done=true only when overbreak consumed
                    const isDisabled =
                      exhausted ||
                      isBreakBusy ||
                      (!b.active && (!inWindow || (!!b.otOnly && otSecs === 0)))
                    const hasStarted = b.elapsed > 0 || b.active
                    const breakProgress = Math.max(
                      0,
                      remaining / (b.allowMins * 60)
                    )
                    const ringColor =
                      isDisabled || !hasStarted
                        ? "transparent"
                        : isOverbreak
                          ? "var(--red)"
                          : "var(--green)"
                    const iconColor = b.active
                      ? isOverbreak
                        ? "var(--red)"
                        : "var(--green)"
                      : isDisabled
                        ? "var(--tx3)"
                        : hasStarted
                          ? "var(--tx3)"
                          : "var(--tx2)"

                    return (
                      <DtrRingButton
                        key={type}
                        size={56}
                        progress={hasStarted ? breakProgress : 1}
                        ringColor={ringColor}
                        onClick={() => !isDisabled && toggleBreak(type)}
                        disabled={isDisabled}
                        label={b.label}
                        sublabel={
                          exhausted
                            ? "Overbreak"
                            : b.otOnly && otSecs === 0
                              ? "OT only"
                              : !inWindow && !b.active
                                ? "Not available"
                                : b.active
                                  ? isOverbreak
                                    ? `⚠ +${Math.ceil(Math.abs(remaining) / 60)}m`
                                    : `${Math.ceil(remaining / 60)}m left`
                                  : b.elapsed > 0
                                    ? `${Math.ceil((b.allowMins * 60 - b.elapsed) / 60)}m left`
                                    : `${b.allowMins}m left`
                        }
                        pulse={b.active && isOverbreak}
                      >
                        {BREAK_ICONS[type]?.(iconColor)}
                      </DtrRingButton>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Today's summary ── */}
        <div className="col-span-2 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Today's summary
            </p>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Time in
                </p>
                <p className="mt-0.5 text-[15px] font-bold tabular-nums">
                  {clockInTime ? formatTime(clockInTime) : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Time out
                </p>
                <p className="mt-0.5 text-[15px] font-bold tabular-nums">
                  {clockOutTime ? formatTime(clockOutTime) : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Hours worked</span>
                <span className="font-semibold tabular-nums">
                  {clocked
                    ? fmtDuration(netSecs)
                    : clockOutTime
                      ? fmtDuration(netSecs)
                      : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Standard hours</span>
                <span className="text-muted-foreground tabular-nums">
                  {requiredHours}h 00m
                </span>
              </div>
              {otSecs > 0 && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-warning">Overtime</span>
                  <span className="font-semibold text-warning tabular-nums">
                    +{fmtDuration(otSecs)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  Progress toward {requiredHours}h
                </span>
                <span className="font-medium tabular-nums">
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    progressPct >= 100 ? "bg-amber-500" : "bg-primary"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Break summary
              </p>
              {Object.entries(breaks).map(([type, b]) => {
                const used = getBreakUsed(b)
                const hasData = used > 0 || b.active
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-muted-foreground">
                      {b.label}
                      {b.active && (
                        <span className="ml-1.5 inline-block size-1.5 animate-pulse rounded-full bg-success" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        used > b.allowMins * 60 ? "text-danger" : ""
                      )}
                    >
                      {hasData ? fmtDuration(used) : "—"}
                    </span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between border-t border-border pt-1.5 text-[12px]">
                <span className="font-medium">Total break</span>
                <span className="font-semibold tabular-nums">
                  {breakSecs > 0 || anyBreakActive
                    ? fmtDuration(breakSecs)
                    : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <StatusBadge variant={clockStatus}>{clockLabel}</StatusBadge>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => setScheduleChangeOpen(true)}
                >
                  Request schedule change
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => setDtrOpen(true)}
                >
                  Request correction
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── My schedule (from resolved policy) ─────────────────────── */}
      {myPolicy && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                My schedule
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Your current effective policy. Set by admin; appeal via "Request
                schedule change".
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => setScheduleHistoryOpen(true)}
            >
              View history
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-3 text-[12px]">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Clock-in window
              </p>
              <p className="mt-0.5 tabular-nums">
                {formatTime(myPolicy.earliestClockIn)} –{" "}
                {formatTime(myPolicy.latestClockIn)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Grace {myPolicy.lateGraceMins ?? 0}m
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Clock-out window
              </p>
              <p className="mt-0.5 tabular-nums">
                {formatTime(myPolicy.earliestClockOut)} –{" "}
                {formatTime(myPolicy.latestClockOut)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Required hours
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {myPolicy.requiredHours ?? "—"}h
              </p>
              <p className="text-[10px] text-muted-foreground">
                Undertime grace {myPolicy.undertimeGraceMins ?? 0}m
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Workdays
              </p>
              <p className="mt-0.5">
                {(myPolicy.workdays ?? []).join(", ") || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance log ── */}
      <div>
        <div className="mb-3">
          <h3 className="font-semibold">Attendance log</h3>
          <p className="text-[12px] text-muted-foreground">
            March – April 2025 · 22 days worked · 1 late · 2 on leave
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Date",
                "Day",
                "Time in",
                "Time out",
                "Hours worked",
                "OT hours",
                "Status",
                "Notes",
                "Actions",
              ].map((h) => (
                <TableHead
                  key={h}
                  className={
                    h === "Hours worked" || h === "OT hours"
                      ? "text-right"
                      : undefined
                  }
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceLoading ? (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell>
                      <Skeleton className="h-3 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-3 w-12" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-3 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-10" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto size-6 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-[13px] text-muted-foreground"
                >
                  No attendance records
                </TableCell>
              </TableRow>
            ) : null}
            {paginated.map((r, i) => {
              const note = recordNotes[r.date]
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.date}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.day}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatTime(r.timeIn)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatTime(r.timeOut)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.hoursWorked}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.otHours !== "—" ? (
                      <span className="font-medium text-primary">
                        +{r.otHours}h
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={statusVariant[r.status] ?? "gray"}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="max-w-45">
                    {note ? (
                      <span className="line-clamp-2 text-[12px] text-muted-foreground">
                        {note}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider delayDuration={300}>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedRecord(r)
                                setViewOpen(true)
                              }}
                            >
                              <HugeiconsIcon
                                icon={EyeIcon}
                                size={14}
                                strokeWidth={2}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            View record
                          </TooltipContent>
                        </Tooltip>
                        {APPEAL_STATUSES.has(r.status) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-warning hover:bg-warning/10 hover:text-warning"
                                onClick={() => {
                                  setSelectedRecord(r)
                                  setAppealOpen(true)
                                }}
                              >
                                <HugeiconsIcon
                                  icon={File01Icon}
                                  size={14}
                                  strokeWidth={2}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              File an appeal
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>

      <AttendanceHeatmap />

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
            if (cameraPunchType === "in") {
              applyClockIn()
            } else {
              startClockOut()
            }
            setCameraPunchType(null)
          }}
        />
      )}

      <EodReportModal
        open={eodOpen}
        reportDate={(pendingClockOut ?? new Date()).toLocaleDateString(
          "en-US",
          {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          }
        )}
        hoursWorked={netSecs > 0 ? fmtDuration(netSecs) : "—"}
        onClose={() => {
          setEodOpen(false)
          setPendingClockOut(null)
        }}
        onSubmit={() => {
          void finalizeClockOut()
        }}
      />
      <DtrChangeModal open={dtrOpen} onClose={() => setDtrOpen(false)} />
      <ScheduleChangeRequestModal
        open={scheduleChangeOpen}
        onClose={() => setScheduleChangeOpen(false)}
      />
      <MyPolicyHistoryModal
        open={scheduleHistoryOpen}
        onClose={() => setScheduleHistoryOpen(false)}
      />
      <ViewModal
        record={selectedRecord}
        note={selectedRecord ? recordNotes[selectedRecord.date] : undefined}
        open={viewOpen}
        onClose={() => setViewOpen(false)}
      />
      <AppealModal
        record={selectedRecord}
        open={appealOpen}
        onClose={() => setAppealOpen(false)}
        onSubmit={(reason) =>
          selectedRecord &&
          setRecordNotes((prev) => ({ ...prev, [selectedRecord.date]: reason }))
        }
      />
    </div>
  )
}
