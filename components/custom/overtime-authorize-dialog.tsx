"use client"

import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Clock01Icon,
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
import { useCreateOvertimeAuthorization } from "@/hooks/use-overtime"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import { useHolidays } from "@/hooks/use-holidays"
import { useTimeFormat } from "@/hooks/use-time-format"
import { HOLIDAY_TYPE_LABEL, HOLIDAY_TYPE_MULTIPLIER } from "@/lib/holiday-api"
import { calcHours } from "@/lib/overtime-api"
import { fmtHours } from "@/components/custom/overtime-request-dialog"

const MIN_OT_HOURS = 1

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

function errorMessage(e: unknown): string {
  const data = (e as { response?: { data?: { message?: string } } })?.response
    ?.data
  return data?.message ?? "Failed to file authorization. Please try again."
}

function todayISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate()
  ).padStart(2, "0")}`
}

interface Props {
  open: boolean
  onClose: () => void
  /** Prefill the date (YYYY-MM-DD). */
  defaultDate?: string
}

/**
 * Phase 1 — file an overtime / rest-day / holiday authorization BEFORE the work. The employee
 * supplies the planned date and an estimated window; the server classifies the rate type from the
 * schedule + holiday calendar. Permission is decided before any hours are rendered.
 */
export function OvertimeAuthorizeDialog({ open, onClose, defaultDate }: Props) {
  const { formatTime } = useTimeFormat()
  const { data: policy } = useMyPolicy()
  const { data: holidayList = [] } = useHolidays()
  const createMutation = useCreateOvertimeAuthorization()

  const [date, setDate] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) return
    setDate(defaultDate ?? "")
    setStart("")
    setEnd("")
    setReason("")
  }, [open, defaultDate])

  const isRestDay = useMemo(() => {
    if (!date || !policy?.workdays?.length) return false
    const code = JS_DAY_TO_WEEKDAY[new Date(`${date}T00:00:00`).getDay()]
    return !policy.workdays.includes(code)
  }, [date, policy])

  const holiday = useMemo(() => {
    if (!date) return null
    const md = date.slice(5)
    return (
      holidayList.find((h) => h.active && h.date === date) ??
      holidayList.find(
        (h) => h.active && h.recurring && h.date.slice(5) === md
      ) ??
      null
    )
  }, [date, holidayList])

  const hours = calcHours(start, end)
  const rangeError =
    start && end
      ? hours <= 0
        ? "End time must be after start time."
        : hours < MIN_OT_HOURS
          ? `Planned overtime must be at least ${MIN_OT_HOURS} hour.`
          : null
      : null

  const isPast = date !== "" && date < todayISO()
  const dateError = isPast
    ? "Authorization is for upcoming work — for a past date, file an emergency claim."
    : null

  const canSubmit =
    date !== "" &&
    !dateError &&
    !!start &&
    !!end &&
    hours >= MIN_OT_HOURS &&
    !rangeError &&
    reason.trim() !== ""

  const submitError = createMutation.isError
    ? errorMessage(createMutation.error)
    : null

  const dayLabel = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : ""

  function handleSubmit(isDraft: boolean) {
    createMutation.mutate(
      {
        overtimeDate: date,
        plannedStartTime: start,
        plannedEndTime: end,
        reason,
        isDraft,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <HugeiconsIcon
                icon={Calendar01Icon}
                size={14}
                strokeWidth={1.8}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            Request Overtime Authorization
          </DialogTitle>
          <DialogDescription>
            Get permission before the work — file your actual hours afterward.
          </DialogDescription>
        </DialogHeader>

        <div className="-mr-2 max-h-[62vh] space-y-4 overflow-y-auto pr-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Planned Date</Label>
            <Input
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-[13px]"
            />
            {dateError && (
              <p className="flex items-center gap-1.5 text-[12px] text-red-500">
                <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
                {dateError}
              </p>
            )}
          </div>

          {/* Day guide */}
          {date && !dateError && policy && (
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
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Scheduled shift</span>
                {isRestDay ? (
                  <span className="font-medium text-foreground">
                    Rest day — no scheduled shift
                  </span>
                ) : (
                  <span className="font-medium text-foreground tabular-nums">
                    {formatTime(policy.earliestClockIn)} –{" "}
                    {formatTime(policy.latestClockOut)} · {policy.requiredHours}
                    h
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Estimated window */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Estimated Window
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Start Time</Label>
                <Input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">End Time</Label>
                <Input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
            {rangeError ? (
              <p className="flex items-center gap-1.5 text-[12px] text-red-500">
                <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
                {rangeError}
              </p>
            ) : hours > 0 ? (
              <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12px]">
                <span className="text-primary">Estimated total</span>
                <span className="font-bold text-primary tabular-nums">
                  {fmtHours(hours)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Reason / Task <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Why is this overtime needed?…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-18 resize-none text-[13px]"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
            />
            <p className="text-[12px] text-blue-700 dark:text-blue-400">
              This requests permission only. Once authorized, file your actual
              hours after the work. Working a rest day or holiday requires an
              approved authorization before you can clock in.
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
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={
              date === "" ||
              !!dateError ||
              !start ||
              !end ||
              !!rangeError ||
              createMutation.isPending
            }
            onClick={() => handleSubmit(true)}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => handleSubmit(false)}
          >
            {createMutation.isPending ? "Submitting…" : "Request Authorization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
