"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Clock01Icon,
  File01Icon,
  InformationCircleIcon,
  Delete01Icon,
  DocumentAttachmentIcon,
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
  useCreateChangeTimeRequest,
  useUpdateChangeTimeRequest,
} from "@/hooks/use-change-time"
import type {
  ChangeTimeRequest,
  ChangeTimeRequestType,
} from "@/lib/change-time-api"

interface ChangeTimeRequestDialogProps {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits this request instead of creating a new one. */
  editing?: ChangeTimeRequest | null
  /** Optional default attendance date (YYYY-MM-DD) when creating a new request. */
  defaultDate?: string
}

/**
 * Shared "Change Time In / Time Out" request form. Used by the employee
 * Change-Time screen as well as the DTR / Request screens so every entry point
 * files the same real correction request (wired to the change-time API).
 */
export function ChangeTimeRequestDialog({
  open,
  onClose,
  editing,
  defaultDate,
}: ChangeTimeRequestDialogProps) {
  const today = new Date().toISOString().split("T")[0]
  const isEditing = !!editing

  const [attendanceDate, setAttendanceDate] = useState("")
  const [requestType, setRequestType] =
    useState<ChangeTimeRequestType>("TIME_IN")
  const [requestedTimeIn, setRequestedTimeIn] = useState("")
  const [requestedTimeOut, setRequestedTimeOut] = useState("")
  const [reason, setReason] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])

  const createMutation = useCreateChangeTimeRequest()
  const updateMutation = useUpdateChangeTimeRequest()
  const isPending = createMutation.isPending || updateMutation.isPending

  const showTimeIn = requestType === "TIME_IN" || requestType === "BOTH"
  const showTimeOut = requestType === "TIME_OUT" || requestType === "BOTH"

  // Seed the form whenever it opens — from the request being edited, or blank for a new one.
  useEffect(() => {
    if (!open) return
    setAttendanceDate(editing?.attendanceDate ?? defaultDate ?? "")
    setRequestType(editing?.requestType ?? "TIME_IN")
    setRequestedTimeIn(editing?.requestedTimeIn ?? "")
    setRequestedTimeOut(editing?.requestedTimeOut ?? "")
    setReason(editing?.reason ?? "")
    setAttachments([])
  }, [open, editing, defaultDate])

  function handleSubmit(isDraft: boolean) {
    const body = {
      attendanceDate,
      requestType,
      requestedTimeIn: showTimeIn ? requestedTimeIn || null : null,
      requestedTimeOut: showTimeOut ? requestedTimeOut || null : null,
      reason,
      isDraft,
    }
    if (isEditing && editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: onClose })
    } else {
      createMutation.mutate(body, { onSuccess: onClose })
    }
  }

  const canSubmit =
    attendanceDate !== "" &&
    reason.trim() !== "" &&
    (showTimeIn ? requestedTimeIn !== "" : true) &&
    (showTimeOut ? requestedTimeOut !== "" : true)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={14}
                strokeWidth={1.8}
                className="text-amber-600 dark:text-amber-400"
              />
            </div>
            {isEditing ? "Edit Time Correction" : "Request Time Correction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your time-correction request"
              : "Submit a correction to your daily time record for HR approval"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Attendance date */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Attendance Date</Label>
            <Input
              type="date"
              max={today}
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="h-9 text-[13px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Cannot be a future date.
            </p>
          </div>

          {/* Request type selector */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">What do you want to change?</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "TIME_IN", label: "Time-In", sub: "Clock-in only" },
                  {
                    value: "TIME_OUT",
                    label: "Time-Out",
                    sub: "Clock-out only",
                  },
                  { value: "BOTH", label: "Both", sub: "In & out" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRequestType(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-all",
                    requestType === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <p
                    className={cn(
                      "text-[12px] font-semibold",
                      requestType === opt.value
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Time fields */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Corrected Time
            </p>
            <div
              className={cn(
                "grid gap-3",
                requestType === "BOTH" ? "grid-cols-2" : "grid-cols-1"
              )}
            >
              {showTimeIn && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-primary">
                    Corrected Time-In
                  </Label>
                  <Input
                    type="time"
                    value={requestedTimeIn}
                    onChange={(e) => setRequestedTimeIn(e.target.value)}
                    className="h-9 border-primary/40 text-[13px] focus:ring-primary/30"
                  />
                </div>
              )}
              {showTimeOut && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-primary">
                    Corrected Time-Out
                  </Label>
                  <Input
                    type="time"
                    value={requestedTimeOut}
                    onChange={(e) => setRequestedTimeOut(e.target.value)}
                    className="h-9 border-primary/40 text-[13px] focus:ring-primary/30"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Briefly explain why this correction is needed…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20 resize-none text-[13px]"
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
                Screenshot, medical cert, approval proof
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

          {/* Info notice */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Approved corrections update your attendance record and may affect
              late/undertime calculations.
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
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!attendanceDate || !reason.trim() || isPending}
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
