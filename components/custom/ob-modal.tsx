"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Briefcase01Icon,
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
import { cn } from "@/lib/utils"
import {
  useCreateObRequest,
  useUpdateObRequest,
  useMyObRequests,
} from "@/hooks/use-ob"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import { useMyLeaveRequests } from "@/hooks/use-leave"
import { useHolidays } from "@/hooks/use-holidays"
import { apiErrorMessage } from "@/lib/api-error"
import type { ObRequest, ObDuration } from "@/lib/ob-api"
import type { Weekday } from "@/lib/schedule-policy-api"

/** getDay() (0=Sun..6=Sat) → backend Weekday union. */
const WEEKDAY_BY_INDEX = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const satisfies readonly Weekday[]

export const OB_DURATION_LABEL: Record<ObDuration, string> = {
  FULL_DAY: "Full Day",
  HALF_DAY_AM: "Half Day AM",
  HALF_DAY_PM: "Half Day PM",
  CUSTOM: "Custom Hours",
}

interface ObModalProps {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits this request instead of creating a new one. */
  editing?: ObRequest | null
  /** Optional default OB date (YYYY-MM-DD) when creating a new request. */
  defaultDate?: string
}

/**
 * Shared "Official Business" request form. Used by the employee Official Business
 * screen as well as the Request hub so every entry point files the same real OB
 * request (wired to the ob API).
 */
export function ObModal({ open, onClose, editing, defaultDate }: ObModalProps) {
  const today = new Date().toISOString().split("T")[0]
  const isEditing = !!editing

  const [obDate, setObDate] = useState("")
  const [duration, setDuration] = useState<ObDuration>("FULL_DAY")
  const [customStartTime, setCustomStartTime] = useState("")
  const [customEndTime, setCustomEndTime] = useState("")
  const [purpose, setPurpose] = useState("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  // Backend backstop: the message a server-side 400 returned (e.g. a rule the
  // client-side pre-check couldn't see). Shown inline under the date field.
  const [serverError, setServerError] = useState<string | null>(null)

  const createMutation = useCreateObRequest()
  const updateMutation = useUpdateObRequest()
  const isPending = createMutation.isPending || updateMutation.isPending
  const isResubmit = editing?.status === "RETURNED"

  const showCustom = duration === "CUSTOM"

  // ── Data for the client-side date pre-check (instant UX mirror of the backend rules) ──
  // Wide holiday window so recurring holidays seeded in this year are caught.
  const holidayUntil = (() => {
    const d = new Date(today + "T00:00:00")
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().split("T")[0]
  })()
  const policyQ = useMyPolicy()
  const leaveQ = useMyLeaveRequests({ status: "APPROVED" })
  const holidaysQ = useHolidays({ from: today, until: holidayUntil })
  const approvedObQ = useMyObRequests({ status: "APPROVED" })

  /**
   * Blocking reason for the picked OB date, or null. Each constraint fires ONLY
   * once its source query has loaded (data !== undefined) — loading/empty never
   * produces a false positive. Order + wording mirror the backend verbatim.
   */
  const dateError: string | null = (() => {
    if (obDate === "") return null
    const picked = new Date(obDate + "T00:00:00")
    const weekday = WEEKDAY_BY_INDEX[picked.getDay()]

    // 1. Rest day — only when workdays is defined AND non-empty (matches OT semantics).
    const workdays = policyQ.data?.workdays
    if (workdays && workdays.length > 0 && !workdays.includes(weekday)) {
      return "You cannot file OB on your rest day."
    }

    // 2. Approved leave — any approved row whose inclusive range covers the date.
    const leaveRows = leaveQ.data?.content
    if (
      leaveRows &&
      leaveRows.some((r) => r.startDate <= obDate && obDate <= r.endDate)
    ) {
      return "You cannot file OB on a day you are on approved leave."
    }

    // 3. Company holiday — active row on the exact date, or a recurring row on the same month/day.
    const holidays = holidaysQ.data
    if (
      holidays &&
      holidays.some(
        (h) =>
          h.active &&
          (h.date === obDate ||
            (h.recurring && h.date.slice(5) === obDate.slice(5)))
      )
    ) {
      return "You cannot file OB on a company holiday."
    }

    // 4. Existing approved OB for the same date (ignore the request being edited).
    const obRows = approvedObQ.data?.content
    if (
      obRows &&
      obRows.some((r) => r.obDate === obDate && r.id !== editing?.id)
    ) {
      return "You already have an approved OB request for this date."
    }

    return null
  })()

  // Seed the form whenever it opens — from the request being edited, or blank for a new one.
  useEffect(() => {
    if (!open) return
    setObDate(editing?.obDate ?? defaultDate ?? "")
    setDuration(editing?.duration ?? "FULL_DAY")
    setCustomStartTime(editing?.customStartTime ?? "")
    setCustomEndTime(editing?.customEndTime ?? "")
    setPurpose(editing?.purpose ?? "")
    setLocation(editing?.location ?? "")
    setNotes(editing?.notes ?? "")
    setServerError(null)
  }, [open, editing, defaultDate])

  function handleSubmit(isDraft: boolean) {
    setServerError(null)
    const body = {
      obDate,
      duration,
      customStartTime: showCustom ? customStartTime || null : null,
      customEndTime: showCustom ? customEndTime || null : null,
      purpose,
      location,
      notes: notes || null,
      isDraft,
    }
    // Surface a backend rejection (e.g. a rule the FE window missed) inline. The
    // global axios interceptor also raises a toast; this mirrors it next to the field.
    const onError = (e: unknown) => setServerError(apiErrorMessage(e))
    if (isEditing && editing) {
      updateMutation.mutate(
        { id: editing.id, body },
        { onSuccess: onClose, onError }
      )
    } else {
      createMutation.mutate(body, { onSuccess: onClose, onError })
    }
  }

  const canSubmit =
    obDate !== "" &&
    !dateError &&
    purpose.trim() !== "" &&
    location.trim() !== "" &&
    (showCustom ? customStartTime !== "" && customEndTime !== "" : true)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-success-light">
              <HugeiconsIcon
                icon={Briefcase01Icon}
                size={14}
                strokeWidth={1.8}
                className="text-success"
              />
            </div>
            {isResubmit
              ? "Resubmit Official Business"
              : isEditing
                ? "Edit Official Business"
                : "Official Business Request"}
          </DialogTitle>
          <DialogDescription>
            {isResubmit
              ? "Address the reviewer's remarks, then resubmit for approval"
              : isEditing
                ? "Update your official business request"
                : "Request time away from office for work-related activities"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Purpose */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Purpose / Activity <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Client meeting, training, conference…"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          {/* Date + duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">OB Date</Label>
              <Input
                type="date"
                min={today}
                value={obDate}
                onChange={(e) => {
                  setObDate(e.target.value)
                  setServerError(null)
                }}
                className={cn(
                  "h-9 text-[13px]",
                  (dateError || serverError) && "border-red-500"
                )}
                aria-invalid={!!(dateError || serverError)}
              />
              {dateError || serverError ? (
                <p className="text-[11px] text-red-500">
                  {dateError ?? serverError}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Must be filed in advance.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Duration</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(OB_DURATION_LABEL) as ObDuration[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all",
                      duration === d
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    {OB_DURATION_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom time fields */}
          {showCustom && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Custom Hours
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-primary">
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="h-9 border-primary/40 text-[13px] focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-primary">
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="h-9 border-primary/40 text-[13px] focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Location / Venue <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Makati office, BGC, Remote"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Supporting Details{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              placeholder="Add any relevant context…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 resize-none text-[13px]"
            />
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-2 rounded-lg border border-success-border bg-success-light px-3 py-2.5">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-success"
            />
            <p className="text-[12px] text-success">
              Official business days do not count against your leave balance.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          {isEditing ? (
            <Button
              size="sm"
              disabled={!canSubmit || isPending}
              onClick={() => handleSubmit(false)}
            >
              {isPending
                ? "Saving…"
                : isResubmit
                  ? "Resubmit for Approval"
                  : "Save Changes"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !obDate ||
                  !!dateError ||
                  !purpose.trim() ||
                  !location.trim() ||
                  isPending
                }
                onClick={() => handleSubmit(true)}
              >
                Save as Draft
              </Button>
              <Button
                size="sm"
                disabled={!canSubmit || isPending}
                onClick={() => handleSubmit(false)}
              >
                {isPending ? "Submitting…" : "Submit Request"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
