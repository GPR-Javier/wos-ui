"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  SchedulePolicyForm,
  type SchedulePolicyFormValue,
} from "./schedule-policy-form"
import {
  useCurrentPolicy,
  useSavePolicy,
} from "@/hooks/use-schedule-policy"
import type {
  PolicyScope,
  SchedulePolicyPayload,
} from "@/lib/schedule-policy-api"

const DEFAULT_PAYLOAD: SchedulePolicyPayload = {
  earliestClockIn: "06:00",
  latestClockIn: "09:00",
  lateGraceMins: 10,
  earliestClockOut: "15:00",
  latestClockOut: "19:00",
  requiredHours: 8,
  undertimeGraceMins: 10,
  workdays: ["MON", "TUE", "WED", "THU", "FRI"],
  timezone: "Asia/Manila",
}

interface Props {
  open: boolean
  scope: PolicyScope
  scopeRef: number | null
  scopeLabel: string
  onClose: () => void
}

export function SchedulePolicyModal({
  open,
  scope,
  scopeRef,
  scopeLabel,
  onClose,
}: Props) {
  const currentQ = useCurrentPolicy(scope, scopeRef)
  const saveMutation = useSavePolicy(scope)

  const [value, setValue] = useState<SchedulePolicyFormValue>({
    payload: DEFAULT_PAYLOAD,
    note: "",
  })

  // Seed from the current version when the modal opens.
  useEffect(() => {
    if (!open) return
    const cur = currentQ.data?.payload
    setValue({
      payload: cur ?? DEFAULT_PAYLOAD,
      note: "",
    })
  }, [open, currentQ.data])

  const isLoading = currentQ.isLoading

  const handleSave = () => {
    saveMutation.mutate(
      {
        scopeRef: scope === "ORG" ? null : scopeRef,
        payload: value.payload,
        note: value.note || null,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            Edit schedule policy · <span className="text-muted-foreground">{scopeLabel}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">
            Loading current policy…
          </div>
        ) : (
          <>
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              Saving creates a new version effective immediately. Past attendance
              already evaluated under the previous version will <span className="font-semibold">not</span> be reclassified.
            </p>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <SchedulePolicyForm value={value} onChange={setValue} />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={isLoading || saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending ? "Saving…" : "Save new version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
