"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type PunchType = "in" | "out"

export function ConfirmPunchModal({
  punchType,
  onConfirm,
  onCancel,
}: {
  punchType: PunchType | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const isClockIn = punchType === "in"
  const verb = isClockIn ? "Time In" : "Time Out"

  return (
    <Dialog
      open={punchType !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm {verb}</DialogTitle>
          <DialogDescription>
            Are you sure you want to {isClockIn ? "clock in" : "clock out"} now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              !isClockIn &&
                "bg-red-500 hover:bg-red-600 focus-visible:ring-red-500"
            )}
          >
            Yes, {verb.toLowerCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
