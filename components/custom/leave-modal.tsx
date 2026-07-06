"use client"

import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert01Icon } from "@hugeicons/core-free-icons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/date-range-picker"
import { useLeaveBalances } from "@/hooks/use-employee"
import { useCreateLeaveRequest, useUpdateLeaveRequest } from "@/hooks/use-leave"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import { useHolidays } from "@/hooks/use-holidays"
import {
  enumerateDates,
  LEAVE_TYPE_LABEL,
  LEAVE_DURATION_LABEL,
  type LeaveType,
  type LeaveDuration,
  type LeaveRequest,
} from "@/lib/leave-api"
import type { LeaveBalance } from "@/lib/employee-api"

// JS getDay() (0=Sun) → schedule-policy Weekday code.
const JS_DAY_TO_WEEKDAY = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const

const CREDIT_TYPES: LeaveType[] = ["VACATION", "SICK", "EMERGENCY"]
const TYPE_OPTIONS: LeaveType[] = [
  "VACATION",
  "SICK",
  "EMERGENCY",
  "MATERNITY",
  "PATERNITY",
]

function errorMessage(e: unknown): string {
  const data = (e as { response?: { data?: { message?: string } } })?.response
    ?.data
  return data?.message ?? "Failed to file leave request. Please try again."
}

/** The balance pool covering a leave type (FLEXI when enabled, else the dedicated type). */
function poolFor(
  balances: LeaveBalance[],
  type: LeaveType
): LeaveBalance | null {
  if (!CREDIT_TYPES.includes(type)) return null // maternity/paternity — not credit-limited
  return (
    balances.find((b) => b.type === "FLEXI") ??
    balances.find((b) => b.type === type) ??
    null
  )
}

function fmtDayLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

interface LeaveModalProps {
  open: boolean
  onClose: () => void
  /** Edit/resubmit an existing draft/returned request instead of filing a new one. */
  editing?: LeaveRequest | null
}

export function LeaveModal({ open, onClose, editing }: LeaveModalProps) {
  const isEditing = !!editing
  const { data: balances = [] } = useLeaveBalances()
  const { data: policy } = useMyPolicy()
  const { data: holidayList = [] } = useHolidays()
  const createMutation = useCreateLeaveRequest()
  const updateMutation = useUpdateLeaveRequest()
  const mutation = isEditing ? updateMutation : createMutation

  const [type, setType] = useState<LeaveType>("VACATION")
  const [range, setRange] = useState<DateRangeValue | null>(null)
  const [dayParts, setDayParts] = useState<Record<string, LeaveDuration>>({})
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) return
    setType(editing?.leaveType ?? "VACATION")
    setRange(
      editing ? { from: editing.startDate, until: editing.endDate } : null
    )
    setDayParts(editing?.dayParts ?? {})
    setReason(editing?.reason ?? "")
  }, [open, editing])

  // Per-date breakdown: a rest day (outside the schedule's workdays) or a company holiday is not a
  // working day, so its duration is locked and it doesn't consume leave.
  const dayRows = useMemo(() => {
    if (!range?.from || !range?.until) return []
    const workdays = policy?.workdays ?? []
    return enumerateDates(range.from, range.until).map((d) => {
      const code = JS_DAY_TO_WEEKDAY[new Date(`${d}T00:00:00`).getDay()]
      const restDay = workdays.length > 0 && !workdays.includes(code)
      const md = d.slice(5)
      const holiday =
        holidayList.find((h) => h.active && h.date === d) ??
        holidayList.find(
          (h) => h.active && h.recurring && h.date.slice(5) === md
        ) ??
        null
      return { date: d, restDay, holiday, working: !restDay && !holiday }
    })
  }, [range, policy, holidayList])

  const dates = dayRows.map((r) => r.date)

  // Only working days carry a half-day override and count toward leave.
  const scopedParts = useMemo(() => {
    const out: Record<string, LeaveDuration> = {}
    for (const r of dayRows) {
      if (r.working && dayParts[r.date] && dayParts[r.date] !== "FULL") {
        out[r.date] = dayParts[r.date]
      }
    }
    return out
  }, [dayRows, dayParts])

  const days = dayRows.reduce(
    (sum, r) => (r.working ? sum + (scopedParts[r.date] ? 0.5 : 1) : sum),
    0
  )
  const pool = poolFor(balances, type)
  const available = pool
    ? pool.remaining - pool.pending + (isEditing ? editing!.days : 0)
    : Infinity

  const balanceError =
    pool && days > available
      ? `Not enough credit — ${Math.max(0, available)} day(s) available.`
      : null

  const canSubmit = dates.length >= 1 && days >= 0.5 && !balanceError
  const submitError = mutation.isError ? errorMessage(mutation.error) : null

  function setPart(date: string, part: LeaveDuration) {
    setDayParts((prev) => ({ ...prev, [date]: part }))
  }

  function handleSubmit(isDraft: boolean) {
    // Both action buttons are gated on `dates.length` / `canSubmit`, which are only
    // truthy once the range is fully picked — so `range` is guaranteed here.
    const body = {
      leaveType: type,
      startDate: range!.from,
      endDate: range!.until,
      dayParts: scopedParts,
      reason: reason || undefined,
      isDraft,
    }
    if (isEditing && editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: onClose })
    } else {
      createMutation.mutate(body, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit leave request" : "File a leave request"}
          </DialogTitle>
          <DialogDescription>
            {editing?.status === "RETURNED"
              ? "Revise and resubmit — it goes back to HR for review."
              : "Your request will be sent to HR for review"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {editing?.status === "RETURNED" && editing.reviewNote && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
              <span className="font-semibold">Returned: </span>
              {editing.reviewNote}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="leave-type">Leave type</Label>
            <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
              <SelectTrigger id="leave-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LEAVE_TYPE_LABEL[t]} leave
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5" data-testid="leave-daterange">
            <Label>Dates</Label>
            <DateRangePicker
              value={range}
              onChange={setRange}
              align="start"
              className="w-full"
              fromPlaceholder="Start date"
              untilPlaceholder="End date"
            />
          </div>

          {/* Per-day duration */}
          {dates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Duration per day</Label>
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                {dayRows.map((r) => (
                  <div
                    key={r.date}
                    className="flex items-center justify-between gap-2"
                  >
                    <span
                      className={
                        r.working
                          ? "text-[12px] font-medium tabular-nums"
                          : "text-[12px] text-muted-foreground tabular-nums"
                      }
                    >
                      {fmtDayLabel(r.date)}
                    </span>
                    {r.working ? (
                      <Select
                        value={dayParts[r.date] ?? "FULL"}
                        onValueChange={(v) =>
                          setPart(r.date, v as LeaveDuration)
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">
                            {LEAVE_DURATION_LABEL.FULL}
                          </SelectItem>
                          <SelectItem value="HALF_AM">
                            {LEAVE_DURATION_LABEL.HALF_AM}
                          </SelectItem>
                          <SelectItem value="HALF_PM">
                            {LEAVE_DURATION_LABEL.HALF_PM}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="rounded-md border border-border bg-muted px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
                        {r.holiday ? r.holiday.name : "Rest day"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="leave-reason">Reason (optional)</Label>
            <Textarea
              id="leave-reason"
              data-testid="leave-reason"
              placeholder="Brief description…"
              rows={2}
              className="resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {balanceError && (
            <p className="flex items-center gap-1.5 text-[12px] text-red-500">
              <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
              {balanceError}
            </p>
          )}

          {dates.length > 0 && days === 0 && (
            <p className="text-[12px] text-muted-foreground">
              All selected dates are rest days or holidays — nothing to file.
            </p>
          )}

          {days >= 0.5 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-[12px] text-primary">
              {days} day{days === 1 ? "" : "s"} requested
              {pool
                ? ` · ${Math.max(0, available - days)} ${LEAVE_TYPE_LABEL[type].toLowerCase()} day(s) left after this`
                : " · not deducted from credits"}
            </div>
          )}

          {submitError && (
            <p className="flex items-center gap-1.5 text-[12px] text-red-500">
              <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              data-testid="leave-save-draft"
              disabled={dates.length === 0 || mutation.isPending}
              onClick={() => handleSubmit(true)}
            >
              Save as Draft
            </Button>
          )}
          <Button
            size="sm"
            data-testid="leave-submit"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => handleSubmit(false)}
          >
            {mutation.isPending
              ? "Submitting…"
              : isEditing
                ? "Save & resubmit"
                : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
