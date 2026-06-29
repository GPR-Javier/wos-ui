"use client"

import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  Alert01Icon,
  InformationCircleIcon,
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
import { useSubmitOvertimeClaim } from "@/hooks/use-overtime"
import { useAttendance } from "@/hooks/use-employee"
import { useTimeFormat } from "@/hooks/use-time-format"
import { calcHours, type OvertimeRequest } from "@/lib/overtime-api"
import { fmtHours } from "@/components/custom/overtime-request-dialog"

const MIN_OT_HOURS = 1

function errorMessage(e: unknown): string {
  const data = (e as { response?: { data?: { message?: string } } })?.response
    ?.data
  return data?.message ?? "Failed to file actual hours. Please try again."
}

/** Extract "HH:mm" from an attendance time value (ISO date-time or already "HH:mm"). */
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

interface Props {
  request: OvertimeRequest
  onClose: () => void
}

/**
 * Phase 2 — file the ACTUAL hours worked against an AUTHORIZED request. Prefills from the day's
 * logged attendance (falling back to the planned window); the server re-derives the rate type from
 * the real day and routes it for claim approval.
 */
export function OvertimeClaimDialog({ request, onClose }: Props) {
  const { formatTime } = useTimeFormat()
  const { data: attendancePage } = useAttendance({ size: 90 })
  const claimMutation = useSubmitOvertimeClaim()

  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [reason, setReason] = useState("")

  const record = useMemo(
    () =>
      attendancePage?.content?.find((r) => r.date === request.overtimeDate) ??
      null,
    [attendancePage, request.overtimeDate]
  )

  // Prefill: existing actuals (when revising a returned claim), else logged attendance, else the plan.
  useEffect(() => {
    const loggedIn = toHHmm(record?.timeIn)
    const loggedOut = toHHmm(record?.timeOut)
    setStart(request.startTime || loggedIn || request.plannedStartTime || "")
    setEnd(request.endTime || loggedOut || request.plannedEndTime || "")
    setReason("")
  }, [
    record,
    request.startTime,
    request.endTime,
    request.plannedStartTime,
    request.plannedEndTime,
  ])

  const hours = calcHours(start, end)
  const rangeError =
    start && end
      ? hours <= 0
        ? "End time must be after start time."
        : hours < MIN_OT_HOURS
          ? `Overtime must be at least ${MIN_OT_HOURS} hour.`
          : null
      : null

  const canSubmit = !!start && !!end && hours >= MIN_OT_HOURS && !rangeError
  const submitError = claimMutation.isError
    ? errorMessage(claimMutation.error)
    : null

  const dayLabel = new Date(
    `${request.overtimeDate}T00:00:00`
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  function handleSubmit() {
    claimMutation.mutate(
      { id: request.id, body: { startTime: start, endTime: end, reason } },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={14}
                strokeWidth={1.8}
                className="text-green-600 dark:text-green-400"
              />
            </div>
            File Actual Hours
          </DialogTitle>
          <DialogDescription>{dayLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Admin's revision note (when this claim was returned) */}
          {request.status === "RETURNED" && request.reviewNote && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                Returned for revision
              </p>
              <p className="text-[12px] text-amber-700 dark:text-amber-300">
                {request.reviewNote}
              </p>
            </div>
          )}

          {/* Authorized estimate */}
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[12px] dark:border-blue-800/40 dark:bg-blue-900/10">
            <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <HugeiconsIcon icon={Clock01Icon} size={13} strokeWidth={1.8} />
              Authorized estimate
            </span>
            <span className="font-semibold text-blue-700 tabular-nums dark:text-blue-300">
              {request.plannedStartTime
                ? `${formatTime(request.plannedStartTime)} – ${formatTime(
                    request.plannedEndTime ?? ""
                  )}`
                : "—"}
              {request.plannedHours
                ? ` · ${fmtHours(request.plannedHours)}`
                : ""}
            </span>
          </div>

          {/* Actual window */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Actual Hours Worked
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
                <span className="text-primary">Actual total</span>
                <span className="font-bold text-primary tabular-nums">
                  {fmtHours(hours)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Optional note */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              placeholder="Anything different from the plan?…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-16 resize-none text-[13px]"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Your actual hours go for approval before they reach payroll. The
              pay rate reflects the real day worked.
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
            disabled={claimMutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || claimMutation.isPending}
            onClick={handleSubmit}
          >
            {claimMutation.isPending
              ? "Submitting…"
              : request.status === "RETURNED"
                ? "Resubmit Hours"
                : "Submit Actual Hours"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
