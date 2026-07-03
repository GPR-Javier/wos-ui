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
import { useCreateObRequest, useUpdateObRequest } from "@/hooks/use-ob"
import type { ObRequest, ObDuration } from "@/lib/ob-api"

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

  const createMutation = useCreateObRequest()
  const updateMutation = useUpdateObRequest()
  const isPending = createMutation.isPending || updateMutation.isPending

  const showCustom = duration === "CUSTOM"

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
  }, [open, editing, defaultDate])

  function handleSubmit(isDraft: boolean) {
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
    if (isEditing && editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: onClose })
    } else {
      createMutation.mutate(body, { onSuccess: onClose })
    }
  }

  const canSubmit =
    obDate !== "" &&
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
            {isEditing ? "Edit Official Business" : "Official Business Request"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
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
                onChange={(e) => setObDate(e.target.value)}
                className="h-9 text-[13px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Must be filed in advance.
              </p>
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
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !obDate || !purpose.trim() || !location.trim() || isPending
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
