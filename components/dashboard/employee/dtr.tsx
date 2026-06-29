"use client"

import React, { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  EyeIcon,
  File01Icon,
  ClockPlusIcon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { StatusBadge } from "@/components/custom/status-badge"
import { ChangeTimeRequestDialog } from "@/components/custom/change-time-request-dialog"
import { OvertimeRequestDialog } from "@/components/custom/overtime-request-dialog"
import { OvertimeClaimDialog } from "@/components/custom/overtime-claim-dialog"
import { ScheduleChangeRequestModal } from "@/components/custom/schedule-change-request-modal"
import { MyPolicyHistoryModal } from "@/components/custom/my-policy-history-modal"
import { ConfirmPunchModal } from "@/components/custom/confirm-punch-modal"
import { PunchCameraModal } from "@/components/custom/punch-camera-modal"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useAttendance } from "@/hooks/use-employee"
import { useAttendanceClock, fmtDuration } from "@/hooks/use-attendance-clock"
import { ClockPanel } from "@/components/custom/clock-panel"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import {
  useMyOvertimeRequests,
  useResubmitOvertimeRequest,
} from "@/hooks/use-overtime"
import { useHolidays } from "@/hooks/use-holidays"
import { HOLIDAY_TYPE_COLOR, HOLIDAY_TYPE_LABEL } from "@/lib/holiday-api"
import {
  OT_STATUS_VARIANT,
  type OvertimeStatus,
  type OvertimeType,
  type OvertimeRequest,
} from "@/lib/overtime-api"
import { useTimeFormat } from "@/hooks/use-time-format"
import type { AttendanceEntry } from "@/lib/employee-api"

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

const APPEAL_STATUSES = new Set(["late", "undertime", "overbreak"])
// Overtime / rest-day rows file an overtime request instead of an appeal.
const OT_FILE_STATUSES = new Set(["overtime", "restday"])
// Picks the most "advanced" status when a date has several OT requests (e.g. rest-day + OT).
const OT_STATUS_RANK: Record<OvertimeStatus, number> = {
  APPROVED: 9,
  PENDING_CLAIM: 8,
  PENDING_EMERGENCY_CLAIM: 8,
  AUTHORIZED: 7,
  PENDING_AUTH: 6,
  RETURNED: 5,
  PENDING: 4,
  REJECTED: 3,
  AUTH_REJECTED: 3,
  DECLINED: 2,
  EXPIRED: 2,
  CANCELLED: 1,
  DRAFT: 0,
}

// Terminal outcomes free the day — a new request can be filed again.
const OT_TERMINAL: OvertimeStatus[] = [
  "AUTH_REJECTED",
  "REJECTED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
]

// Short status word for the attendance-row badge (the authorized case is handled with an action).
const OT_SHORT_LABEL: Partial<Record<OvertimeStatus, string>> = {
  PENDING_AUTH: "Pending auth",
  AUTHORIZED: "Authorized",
  PENDING_CLAIM: "In review",
  PENDING_EMERGENCY_CLAIM: "Emergency review",
  APPROVED: "Approved",
  RETURNED: "Returned",
  PENDING: "Pending",
}

/** Short label for the kind(s) of overtime filed on a day. */
function otTypeLabel(types: Set<OvertimeType>): string {
  const rd = types.has("REST_DAY")
  const rdOt = types.has("REST_DAY_OT")
  if (rd && rdOt) return "RD + OT"
  if (rdOt) return "RD OT"
  if (rd) return "RD"
  return "OT"
}
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
    ...(record.rdHours && record.rdHours !== "—"
      ? [{ label: "RD hours", value: record.rdHours }]
      : []),
    {
      label: "OT hours",
      value: record.otHours !== "—" ? `+${record.otHours}` : "—",
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

export function DTRSection() {
  const { formatTime } = useTimeFormat()
  const [dtrOpen, setDtrOpen] = useState(false)
  const [scheduleChangeOpen, setScheduleChangeOpen] = useState(false)
  const [scheduleHistoryOpen, setScheduleHistoryOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null
  )
  const [viewOpen, setViewOpen] = useState(false)
  const [appealOpen, setAppealOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [claimFor, setClaimFor] = useState<OvertimeRequest | null>(null)
  const resubmitMutation = useResubmitOvertimeRequest()
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

  const { data: myPolicy } = useMyPolicy()

  // Shared attendance clock — the same hook + UI the dashboard ClockWidget uses, so the
  // two clocks can't drift. This screen only adds the EOD report on clock-out + the summary.
  const clock = useAttendanceClock({
    requiredHours: myPolicy?.requiredHours ?? 9,
  })
  const {
    clocked,
    clockInTime,
    clockOutTime,
    breaks,
    netSecs,
    otSecs,
    requiredHours,
    progressPct,
    breakSecs,
    anyBreakActive,
    getBreakUsed,
    applyClockIn,
    applyClockOut,
  } = clock

  // EOD report dropped for now — clock out directly without the report step.
  // (Restore by setting pendingClockOut + opening the EOD modal here.)
  function startClockOut() {
    void finalizeClockOut()
  }

  function startPunch(type: "in" | "out") {
    if (clock.requiresCameraValidation) {
      setCameraPunchType(type)
    } else if (type === "in") {
      applyClockIn()
    } else {
      startClockOut()
    }
  }

  async function finalizeClockOut() {
    await applyClockOut()
    setPendingClockOut(null)
    setEodOpen(false)
  }

  // Paginated attendance for the log table (separate from the clock's latest-record query).
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance({
    page: page - 1,
    size: pageSize,
  })
  const paginated = (attendanceData?.content ?? []).map(toAttendanceRecord)
  const total = attendanceData?.totalElements ?? 0
  const totalPages = attendanceData?.totalPages ?? 0

  // The employee's overtime requests, keyed by date, so each attendance row can show whether OT
  // was already filed (and its status) instead of offering to file again.
  const otRequestsQ = useMyOvertimeRequests({ size: 100 })
  const otByDate = new Map<
    string,
    { status: OvertimeStatus; types: Set<OvertimeType>; req: OvertimeRequest }
  >()
  for (const o of otRequestsQ.data?.content ?? []) {
    if (OT_TERMINAL.includes(o.status)) continue // terminal — the day is free again
    let entry = otByDate.get(o.overtimeDate)
    if (!entry) {
      entry = { status: o.status, types: new Set(), req: o }
      otByDate.set(o.overtimeDate, entry)
    }
    entry.types.add(o.overtimeType)
    if (OT_STATUS_RANK[o.status] > OT_STATUS_RANK[entry.status]) {
      entry.status = o.status
      entry.req = o // keep the most-advanced request for the row action
    }
  }

  // Declared holidays, so each attendance row can flag a day worked on a holiday. A recurring
  // holiday (fixed-date, e.g. Christmas) matches any year by its month/day.
  const holidaysQ = useHolidays()
  const holidayList = holidaysQ.data ?? []
  function holidayFor(dateStr: string) {
    const md = dateStr.slice(5) // "MM-DD"
    return (
      holidayList.find((h) => h.active && h.date === dateStr) ??
      holidayList.find(
        (h) => h.active && h.recurring && h.date.slice(5) === md
      ) ??
      null
    )
  }

  return (
    <div className="space-y-6">
      {/* Clock + summary */}
      <div className="grid grid-cols-5 gap-4">
        {/* ── Clock panel ── */}
        <ClockPanel
          clock={clock}
          onClockIn={() => setConfirmPunchType("in")}
          onClockOut={() => setConfirmPunchType("out")}
          className="col-span-3"
        />

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
              <StatusBadge variant={clock.statusVariant}>
                {clock.statusLabel}
              </StatusBadge>
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
                "RD hours",
                "OT hours",
                "Status",
                "Notes",
                "Actions",
              ].map((h) => (
                <TableHead
                  key={h}
                  className={
                    h === "Hours worked" || h === "RD hours" || h === "OT hours"
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
                  colSpan={10}
                  className="py-8 text-center text-[13px] text-muted-foreground"
                >
                  No attendance records
                </TableCell>
              </TableRow>
            ) : null}
            {paginated.map((r, i) => {
              const note = recordNotes[r.date]
              const ot = otByDate.get(r.date)
              const otStatus = ot?.status
              const otFiled = !!ot
              const otAuthorized = otStatus === "AUTHORIZED"
              const otLabel = ot ? otTypeLabel(ot.types) : ""
              const holiday = holidayFor(r.date)
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{r.date}</span>
                      {holiday && (
                        <span
                          title={`${holiday.name} · ${HOLIDAY_TYPE_LABEL[holiday.holidayType]}`}
                        >
                          <StatusBadge
                            variant={HOLIDAY_TYPE_COLOR[holiday.holidayType]}
                            dot={false}
                          >
                            {holiday.name}
                          </StatusBadge>
                        </span>
                      )}
                    </div>
                  </TableCell>
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
                    {r.rdHours && r.rdHours !== "—" ? (
                      <span className="font-medium text-warning">
                        {r.rdHours}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.otHours !== "—" ? (
                      <span className="font-medium text-primary">
                        +{r.otHours}
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
                        {OT_FILE_STATUSES.has(r.status) &&
                        otFiled &&
                        otAuthorized ? (
                          // Authorized that day → file the actual hours (Phase-2 claim).
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-primary hover:bg-primary/10 hover:text-primary"
                                onClick={() => ot && setClaimFor(ot.req)}
                              >
                                <HugeiconsIcon
                                  icon={ClockPlusIcon}
                                  size={14}
                                  strokeWidth={2}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              File actual hours
                            </TooltipContent>
                          </Tooltip>
                        ) : OT_FILE_STATUSES.has(r.status) &&
                          otStatus === "RETURNED" ? (
                          // Returned for revision → let the employee fix and resubmit.
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 px-2 text-warning hover:bg-warning/10 hover:text-warning"
                                onClick={() => {
                                  if (!ot) return
                                  if (ot.req.totalHours != null)
                                    setClaimFor(ot.req)
                                  else resubmitMutation.mutate(ot.req.id)
                                }}
                              >
                                <HugeiconsIcon
                                  icon={Alert01Icon}
                                  size={13}
                                  strokeWidth={2}
                                />
                                <span className="text-[12px]">Revise</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Returned for revision — fix &amp; resubmit
                            </TooltipContent>
                          </Tooltip>
                        ) : OT_FILE_STATUSES.has(r.status) && otFiled ? (
                          // In-flight / decided request → show its status, no new filing.
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <StatusBadge
                                variant={
                                  otStatus
                                    ? OT_STATUS_VARIANT[otStatus]
                                    : "gray"
                                }
                              >
                                {otLabel}{" "}
                                {(otStatus && OT_SHORT_LABEL[otStatus]) ??
                                  "Filed"}
                              </StatusBadge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {otLabel} request —{" "}
                              {(otStatus && OT_SHORT_LABEL[otStatus]) ??
                                "filed"}
                            </TooltipContent>
                          </Tooltip>
                        ) : r.status === "overtime" && !holiday ? (
                          // Regular-day overtime with no authorization → emergency lane (admin-only).
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-warning hover:bg-warning/10 hover:text-warning"
                                onClick={() => {
                                  setSelectedRecord(r)
                                  setEmergencyOpen(true)
                                }}
                              >
                                <HugeiconsIcon
                                  icon={Alert01Icon}
                                  size={14}
                                  strokeWidth={2}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              File emergency OT (no prior authorization)
                            </TooltipContent>
                          </Tooltip>
                        ) : OT_FILE_STATUSES.has(r.status) ? (
                          // Rest day / holiday with no authorization → blocked (needs pre-authorization).
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex h-7 w-7 items-center justify-center text-muted-foreground/50">
                                <HugeiconsIcon
                                  icon={Alert01Icon}
                                  size={14}
                                  strokeWidth={2}
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Needs prior authorization — not eligible to file
                            </TooltipContent>
                          </Tooltip>
                        ) : APPEAL_STATUSES.has(r.status) ? (
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
                        ) : null}
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
      <ChangeTimeRequestDialog
        open={dtrOpen}
        onClose={() => setDtrOpen(false)}
      />
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
      <OvertimeRequestDialog
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        defaultDate={selectedRecord?.date}
        emergency
      />
      {claimFor && (
        <OvertimeClaimDialog
          request={claimFor}
          onClose={() => setClaimFor(null)}
        />
      )}
    </div>
  )
}
