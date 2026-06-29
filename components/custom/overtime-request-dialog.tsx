"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ClockPlusIcon,
  Clock01Icon,
  File01Icon,
  Delete01Icon,
  DocumentAttachmentIcon,
  InformationCircleIcon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  useCreateOvertimeRequest,
  useCreateEmergencyOvertime,
} from "@/hooks/use-overtime"
import { useAttendance } from "@/hooks/use-employee"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import { useTimeFormat } from "@/hooks/use-time-format"
import { useHolidays } from "@/hooks/use-holidays"
import { HOLIDAY_TYPE_LABEL, HOLIDAY_TYPE_MULTIPLIER } from "@/lib/holiday-api"
import { calcHours, type OvertimeType } from "@/lib/overtime-api"

/** Overtime must be at least this many hours to be filed on a regular day. */
export const MIN_OT_HOURS = 1
const MAX_OT_HOURS = 8

// JS getDay() (0=Sun) → policy Weekday code.
const JS_DAY_TO_WEEKDAY = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const

export function fmtHours(h: number) {
  if (!h) return "—"
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

/** Extract "HH:mm" (24h) from an attendance time value (ISO date-time or already "HH:mm"). */
function toHHmm(value?: string | null): string {
  if (!value) return ""
  const m = value.match(/T(\d{2}:\d{2})/)
  if (m) return m[1]
  const d = new Date(value)
  if (!isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`
  }
  return ""
}

/** "HH:mm" plus N hours, wrapping past midnight. */
function addHoursHHmm(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(":").map(Number)
  const total = (h * 60 + m + hours * 60) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`
}

/** Pull a human-readable message out of an axios error response. */
function errorMessage(e: unknown): string {
  const data = (e as { response?: { data?: { message?: string } } })?.response
    ?.data
  return data?.message ?? "Failed to file overtime request. Please try again."
}

/** A labelled start/end time range with a live total and inline error. */
function RangeFields({
  title,
  start,
  end,
  onStart,
  onEnd,
  hours,
  error,
}: {
  title: string
  start: string
  end: string
  onStart: (v: string) => void
  onEnd: (v: string) => void
  hours: number
  error: string | null
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Start Time</Label>
          <Input
            type="time"
            value={start}
            onChange={(e) => onStart(e.target.value)}
            className="h-9 text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">End Time</Label>
          <Input
            type="time"
            value={end}
            onChange={(e) => onEnd(e.target.value)}
            className="h-9 text-[13px]"
          />
        </div>
      </div>
      {error ? (
        <p className="flex items-center gap-1.5 text-[12px] text-red-500">
          <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
          {error}
        </p>
      ) : hours > 0 ? (
        <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12px]">
          <span className="text-primary">Total</span>
          <span className="font-bold text-primary tabular-nums">
            {fmtHours(hours)}
          </span>
        </div>
      ) : null}
    </div>
  )
}

interface OvertimeRequestDialogProps {
  open: boolean
  onClose: () => void
  /** Prefill the overtime date (YYYY-MM-DD), e.g. from a DTR row. */
  defaultDate?: string
  /**
   * Emergency / unplanned overtime: a post-hoc claim for a regular workday that had no prior
   * authorization. Routes to the emergency endpoint (admin-only approval) instead of a normal filing.
   */
  emergency?: boolean
}

/**
 * Shared "File Overtime" form. The system detects the day type from the schedule and adapts:
 * a regular day shows a single Overtime range; a rest day shows a Rest-Day duty range plus an
 * optional Overtime range — filing those as two linked requests (rest-day rate + rest-day OT).
 */
export function OvertimeRequestDialog({
  open,
  onClose,
  defaultDate,
  emergency = false,
}: OvertimeRequestDialogProps) {
  const { formatTime } = useTimeFormat()
  const { data: policy } = useMyPolicy()
  const { data: attendancePage } = useAttendance({ size: 90 })

  const [overtimeDate, setOvertimeDate] = useState("")
  const [rdStart, setRdStart] = useState("")
  const [rdEnd, setRdEnd] = useState("")
  const [otStart, setOtStart] = useState("")
  const [otEnd, setOtEnd] = useState("")
  const [reason, setReason] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])

  const normalMutation = useCreateOvertimeRequest()
  const emergencyMutation = useCreateEmergencyOvertime()
  const createMutation = emergency ? emergencyMutation : normalMutation

  useEffect(() => {
    if (!open) return
    setOvertimeDate(defaultDate ?? "")
    setRdStart("")
    setRdEnd("")
    setOtStart("")
    setOtEnd("")
    setReason("")
    setAttachments([])
  }, [open, defaultDate])

  // The attendance record for the selected date (re-resolved as the date changes).
  const record = useMemo(
    () =>
      overtimeDate
        ? (attendancePage?.content?.find((r) => r.date === overtimeDate) ??
          null)
        : null,
    [overtimeDate, attendancePage]
  )

  // Rest day → REST_DAY (record marked restday, or date outside the policy workdays).
  const isRestDay = useMemo(() => {
    if (record?.status === "restday") return true
    if (!overtimeDate || !policy?.workdays?.length) return false
    const code =
      JS_DAY_TO_WEEKDAY[new Date(`${overtimeDate}T00:00:00`).getDay()]
    return !policy.workdays.includes(code)
  }, [overtimeDate, record, policy])

  // Declared holiday on the selected date (exact, or a recurring fixed-date holiday matched by
  // month/day). The server makes the final classification; this is an informational heads-up.
  const { data: holidayList = [] } = useHolidays()
  const holiday = useMemo(() => {
    if (!overtimeDate) return null
    const md = overtimeDate.slice(5)
    return (
      holidayList.find((h) => h.active && h.date === overtimeDate) ??
      holidayList.find(
        (h) => h.active && h.recurring && h.date.slice(5) === md
      ) ??
      null
    )
  }, [overtimeDate, holidayList])

  const required = policy?.requiredHours ?? 9
  // Only offer the rest-day overtime range when the day actually has overtime (worked past the
  // standard hours) — a rest day worked within the standard hours is rest-day duty only.
  const recordHasOt = !!(record?.otHours && record.otHours !== "—")
  const showRestOtRange = isRestDay && recordHasOt
  const rdTotal = isRestDay ? calcHours(rdStart, rdEnd) : 0
  const otTotal = calcHours(otStart, otEnd)
  const otProvided = isRestDay
    ? showRestOtRange && !!otStart && !!otEnd
    : !!(otStart && otEnd)

  // Auto-fill the range(s) from the day's logged time-in/out — split at the standard hours when
  // there's overtime. Runs once per resolved date so it won't clobber the user's manual edits.
  const prefilledFor = useRef<string | null>(null)
  useEffect(() => {
    if (!open) prefilledFor.current = null
  }, [open])
  useEffect(() => {
    if (!open || !overtimeDate || !record) return
    if (prefilledFor.current === overtimeDate) return
    const inT = toHHmm(record.timeIn)
    const outT = toHHmm(record.timeOut)
    if (!inT || !outT) return
    if (isRestDay) {
      if (recordHasOt) {
        const split = addHoursHHmm(inT, required)
        setRdStart(inT)
        setRdEnd(split)
        setOtStart(split)
        setOtEnd(outT)
      } else {
        setRdStart(inT)
        setRdEnd(outT)
        setOtStart("")
        setOtEnd("")
      }
    } else {
      // Regular OT is the portion worked beyond the standard hours.
      setOtStart(addHoursHHmm(inT, required))
      setOtEnd(outT)
      setRdStart("")
      setRdEnd("")
    }
    prefilledFor.current = overtimeDate
  }, [open, overtimeDate, record, isRestDay, recordHasOt, required])

  const rdError =
    isRestDay && rdStart && rdEnd
      ? rdTotal <= 0
        ? "Rest-day end time must be after the start time."
        : rdTotal > required
          ? `Rest-day duty can't exceed ${required}h — file the excess as overtime.`
          : null
      : null

  const otError = otProvided
    ? otTotal <= 0
      ? "End time must be after start time."
      : !isRestDay && otTotal < MIN_OT_HOURS
        ? `Overtime must be at least ${MIN_OT_HOURS} hour to be filed.`
        : otTotal > MAX_OT_HOURS
          ? `Overtime can't exceed ${MAX_OT_HOURS} hours; please contact HR.`
          : null
    : null

  const rangesValid = isRestDay
    ? !!rdStart &&
      !!rdEnd &&
      rdTotal > 0 &&
      rdTotal <= required &&
      !rdError &&
      (!otProvided || (otTotal > 0 && otTotal <= MAX_OT_HOURS && !otError))
    : otProvided &&
      otTotal >= MIN_OT_HOURS &&
      otTotal <= MAX_OT_HOURS &&
      !otError

  const canSubmit = overtimeDate !== "" && rangesValid && reason.trim() !== ""
  const canDraft = overtimeDate !== "" && rangesValid
  const submitError = createMutation.isError
    ? errorMessage(createMutation.error)
    : null

  const dayLabel = overtimeDate
    ? new Date(`${overtimeDate}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : ""

  function handleClose() {
    onClose()
  }

  function handleSubmit(isDraft: boolean) {
    const body = isRestDay
      ? {
          overtimeDate,
          restStartTime: rdStart,
          restEndTime: rdEnd,
          startTime: otProvided ? otStart : null,
          endTime: otProvided ? otEnd : null,
          overtimeType: "REST_DAY" as OvertimeType,
          reason,
          isDraft,
        }
      : {
          overtimeDate,
          startTime: otStart,
          endTime: otEnd,
          overtimeType: "REGULAR" as OvertimeType,
          reason,
          isDraft,
        }
    createMutation.mutate(body, { onSuccess: handleClose })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
              <HugeiconsIcon
                icon={ClockPlusIcon}
                size={14}
                strokeWidth={1.8}
                className="text-red-600 dark:text-red-400"
              />
            </div>
            {emergency ? "File Emergency Overtime" : "File Overtime Request"}
          </DialogTitle>
          <DialogDescription>
            {emergency
              ? "Unplanned overtime with no prior authorization — requires admin approval."
              : "Submit an overtime request for supervisor / HR approval"}
          </DialogDescription>
        </DialogHeader>

        <div className="-mr-2 max-h-[62vh] space-y-4 overflow-y-auto pr-2">
          {/* Overtime date */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Overtime Date</Label>
            <Input
              type="date"
              value={overtimeDate}
              onChange={(e) => setOvertimeDate(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          {/* Day guide: scheduled shift + logged attendance */}
          {overtimeDate && (policy || record) && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
                {dayLabel}
              </p>
              {holiday && (
                <div className="flex items-start gap-2 rounded-md border border-purple-200 bg-purple-50 px-2.5 py-2 text-[12px] text-purple-700 dark:border-purple-800/40 dark:bg-purple-900/10 dark:text-purple-300">
                  <span className="font-semibold">{holiday.name}</span>
                  <span className="ml-auto shrink-0 font-medium">
                    {HOLIDAY_TYPE_LABEL[holiday.holidayType]} · ×
                    {HOLIDAY_TYPE_MULTIPLIER[holiday.holidayType].toFixed(2)}
                    {isRestDay ? " (×1.30 rest day)" : ""}
                  </span>
                </div>
              )}
              {policy && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Scheduled shift</span>
                  {isRestDay ? (
                    <span className="font-medium text-foreground">
                      Rest day — no scheduled shift
                    </span>
                  ) : (
                    <span className="font-medium text-foreground tabular-nums">
                      {formatTime(policy.earliestClockIn)} –{" "}
                      {formatTime(policy.latestClockOut)} ·{" "}
                      {policy.requiredHours}h
                    </span>
                  )}
                </div>
              )}
              {record && (
                <>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">Logged time</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatTime(record.timeIn)} – {formatTime(record.timeOut)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">Worked / OT</span>
                    <span className="font-medium tabular-nums">
                      {record.hoursWorked}
                      {record.otHours && record.otHours !== "—" ? (
                        <span className="text-primary">
                          {" "}
                          · +{record.otHours}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Time range(s) — adapts to the day type */}
          {isRestDay ? (
            <>
              <RangeFields
                title={`Rest Day Duty Range (≤ ${required}h)`}
                start={rdStart}
                end={rdEnd}
                onStart={setRdStart}
                onEnd={setRdEnd}
                hours={rdTotal}
                error={rdError}
              />
              {showRestOtRange && (
                <RangeFields
                  title="Overtime Range"
                  start={otStart}
                  end={otEnd}
                  onStart={setOtStart}
                  onEnd={setOtEnd}
                  hours={otTotal}
                  error={otError}
                />
              )}
            </>
          ) : (
            <RangeFields
              title="Overtime Time Range"
              start={otStart}
              end={otEnd}
              onStart={setOtStart}
              onEnd={setOtEnd}
              hours={otTotal}
              error={otError}
            />
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Reason / Task Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Describe the work performed or reason for overtime…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-18 resize-none text-[13px]"
            />
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Supporting Documents{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
              <HugeiconsIcon
                icon={DocumentAttachmentIcon}
                size={20}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
              <p className="text-[12px] text-muted-foreground">
                Drop files or{" "}
                <span className="font-medium text-primary">browse</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Approval screenshot, task proof, client request
              </p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files)
                    setAttachments((prev) => [
                      ...prev,
                      ...Array.from(e.target.files!),
                    ])
                }}
              />
            </label>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[12px]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={13}
                        strokeWidth={1.8}
                        className="shrink-0 text-muted-foreground"
                      />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="ml-2 shrink-0 text-muted-foreground hover:text-red-500"
                    >
                      <HugeiconsIcon
                        icon={Delete01Icon}
                        size={12}
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Policy notice */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              {isRestDay
                ? `Rest-day duty is capped at ${required}h; anything beyond is rest-day overtime.`
                : `Overtime must be at least ${MIN_OT_HOURS} hour.`}{" "}
              Subject to supervisor / HR approval; unapproved OT will not be
              paid.
            </p>
          </div>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800/40 dark:bg-red-900/10">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
            />
            <p className="text-[12px] text-red-700 dark:text-red-400">
              {submitError}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={createMutation.isPending}
            onClick={handleClose}
          >
            Cancel
          </Button>
          {!emergency && (
            <Button
              variant="outline"
              size="sm"
              disabled={!canDraft || createMutation.isPending}
              onClick={() => handleSubmit(true)}
            >
              Save as Draft
            </Button>
          )}
          <Button
            size="sm"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => handleSubmit(false)}
          >
            {createMutation.isPending
              ? "Submitting…"
              : emergency
                ? "Submit Emergency OT"
                : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
