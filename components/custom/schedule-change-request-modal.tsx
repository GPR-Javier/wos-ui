"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  SchedulePolicyForm,
  type SchedulePolicyFormValue,
} from "./schedule-policy-form"
import { useCreateChangeRequest } from "@/hooks/use-schedule-change-request"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import type { ChangeRequestType } from "@/lib/schedule-change-request-api"
import type { SchedulePolicyPayload } from "@/lib/schedule-policy-api"

const TYPE_OPTIONS: {
  value: ChangeRequestType
  label: string
  help: string
}[] = [
  {
    value: "SHIFT_CHANGE",
    label: "Temporary shift change",
    help: "Different hours for a specific date range. Reverts automatically afterwards.",
  },
  {
    value: "DAY_OFF",
    label: "Day off",
    help: "Mark specific dates as non-workdays.",
  },
  {
    value: "PERMANENT_POLICY_CHANGE",
    label: "Permanent change",
    help: "Apply from the chosen date onwards with no end date.",
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function ScheduleChangeRequestModal({ open, onClose }: Props) {
  const myPolicyQ = useMyPolicy()
  const createMutation = useCreateChangeRequest()

  const [type, setType] = useState<ChangeRequestType>("SHIFT_CHANGE")
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [effectiveUntil, setEffectiveUntil] = useState("")
  const [reason, setReason] = useState("")
  const [policy, setPolicy] = useState<SchedulePolicyFormValue>({
    payload: {},
    note: "",
  })

  // Seed the form with the user's current effective policy as a starting point
  // — they edit FROM their current schedule, not from a blank slate.
  useEffect(() => {
    if (!open) return
    setType("SHIFT_CHANGE")
    setEffectiveFrom("")
    setEffectiveUntil("")
    setReason("")
    setPolicy({
      payload: myPolicyQ.data ? { ...myPolicyQ.data } : {},
      note: "",
    })
  }, [open, myPolicyQ.data])

  const needsUntil = type !== "PERMANENT_POLICY_CHANGE"
  const canSubmit = useMemo(() => {
    if (!effectiveFrom) return false
    if (needsUntil && !effectiveUntil) return false
    if (needsUntil && effectiveUntil < effectiveFrom) return false
    return true
  }, [effectiveFrom, effectiveUntil, needsUntil])

  const handleSubmit = () => {
    const payload: SchedulePolicyPayload = policy.payload
    createMutation.mutate(
      {
        type,
        effectiveFrom,
        effectiveUntil: needsUntil ? effectiveUntil : null,
        requestedPayload: payload,
        reason: reason || null,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request schedule change</DialogTitle>
        </DialogHeader>

        <p className="text-[12px] text-muted-foreground">
          Submits for admin review. Your current schedule keeps applying until
          approval.
        </p>

        {/* Type selector */}
        <div className="space-y-1.5">
          <Label className="text-[12px]">Request type</Label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cn(
                  "rounded-lg border p-2.5 text-left transition-colors",
                  type === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <p className="text-[12px] font-medium">{opt.label}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                  {opt.help}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Effective from</Label>
            <Input
              type="date"
              className="h-9 text-[13px]"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Effective until {needsUntil ? "" : "(not needed)"}
            </Label>
            <Input
              type="date"
              className="h-9 text-[13px]"
              value={effectiveUntil}
              min={effectiveFrom}
              disabled={!needsUntil}
              onChange={(e) => setEffectiveUntil(e.target.value)}
            />
          </div>
        </div>

        {/* Policy edit — collapsed for DAY_OFF since only workdays matter */}
        <div className="max-h-[40vh] overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
          <p className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Requested schedule
          </p>
          <SchedulePolicyForm
            value={policy}
            onChange={setPolicy}
            showNote={false}
          />
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <Label className="text-[12px]">Reason (visible to admin)</Label>
          <Textarea
            className="min-h-16 resize-none text-[13px]"
            placeholder="Why are you requesting this change?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || createMutation.isPending}
            onClick={handleSubmit}
          >
            {createMutation.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
