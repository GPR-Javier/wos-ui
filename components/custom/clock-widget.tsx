"use client"

import { useCallback, useState } from "react"
import { ClockPanel } from "@/components/custom/clock-panel"
import { ConfirmPunchModal } from "@/components/custom/confirm-punch-modal"
import { PunchFaceModal } from "@/components/custom/punch-face-modal"
import { useAttendanceClock } from "@/hooks/use-attendance-clock"
import { useMyPolicy } from "@/hooks/use-schedule-policy"
import { apiErrorMessage } from "@/lib/api-error"
import { useToastStore } from "@/store/toast-store"

/**
 * Dashboard clock card. A thin wrapper over the shared {@link useAttendanceClock}
 * hook + {@link ClockPanel} — the same building blocks the DTR clock uses, so the
 * two stay in lockstep. This one owns the confirm + face-verification modals.
 */
export function ClockWidget() {
  const pushToast = useToastStore((s) => s.push)
  const { data: myPolicy } = useMyPolicy()
  const clock = useAttendanceClock({
    requiredHours: myPolicy?.requiredHours ?? 9,
  })
  const [facePunchType, setFacePunchType] = useState<"in" | "out" | null>(null)
  const [faceError, setFaceError] = useState<string | null>(null)
  const [faceSuccess, setFaceSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmPunchType, setConfirmPunchType] = useState<"in" | "out" | null>(
    null
  )

  const applyPunch = useCallback(
    (type: "in" | "out", faceDescriptor?: number[]) =>
      type === "in"
        ? clock.applyClockIn(faceDescriptor)
        : clock.applyClockOut(faceDescriptor),
    [clock]
  )

  const startPunch = useCallback(
    async (type: "in" | "out") => {
      if (clock.requiresFaceVerification) {
        setFaceError(null)
        setFaceSuccess(null)
        setFacePunchType(type)
        return
      }
      // No verification modal to confirm in, so a toast is the only feedback this path gets.
      const result = await applyPunch(type)
      if (result.ok) {
        pushToast(
          `${type === "in" ? "Timed in" : "Timed out"} at ${clock.formatTime(result.at ?? new Date())}`,
          "success"
        )
      }
    },
    [clock, applyPunch, pushToast]
  )

  // The modal only produces a descriptor — wos-hr decides whether it matches, so a rejection
  // comes back here as a failed punch and is shown inline rather than closing the modal.
  const onVerified = useCallback(
    async (descriptor: number[]) => {
      if (!facePunchType) return
      setSubmitting(true)
      const result = await applyPunch(facePunchType, descriptor)
      setSubmitting(false)
      if (result.ok) {
        // Leave the modal open on its success panel — it dismisses itself.
        setFaceError(null)
        setFaceSuccess(clock.formatTime(result.at ?? new Date()))
      } else {
        setFaceError(
          apiErrorMessage(
            result.error,
            "Verification failed. Please try again."
          )
        )
      }
    },
    [facePunchType, applyPunch, clock]
  )

  function closeFaceModal() {
    setFacePunchType(null)
    setFaceError(null)
    setFaceSuccess(null)
  }

  return (
    <>
      <ClockPanel
        clock={clock}
        onClockIn={() => setConfirmPunchType("in")}
        onClockOut={() => setConfirmPunchType("out")}
      />

      <ConfirmPunchModal
        punchType={confirmPunchType}
        onCancel={() => setConfirmPunchType(null)}
        onConfirm={() => {
          if (confirmPunchType) void startPunch(confirmPunchType)
          setConfirmPunchType(null)
        }}
      />

      {facePunchType && (
        <PunchFaceModal
          punchType={facePunchType}
          submitting={submitting}
          errorMessage={faceError}
          successLabel={faceSuccess}
          onClose={closeFaceModal}
          onRetry={() => setFaceError(null)}
          onVerified={onVerified}
        />
      )}
    </>
  )
}
