"use client"

import { useCallback, useState } from "react"
import { ClockPanel } from "@/components/custom/clock-panel"
import { ConfirmPunchModal } from "@/components/custom/confirm-punch-modal"
import { PunchCameraModal } from "@/components/custom/punch-camera-modal"
import { useAttendanceClock } from "@/hooks/use-attendance-clock"
import { useMyPolicy } from "@/hooks/use-schedule-policy"

/**
 * Dashboard clock card. A thin wrapper over the shared {@link useAttendanceClock}
 * hook + {@link ClockPanel} — the same building blocks the DTR clock uses, so the
 * two stay in lockstep. This one owns the confirm + camera punch modals.
 */
export function ClockWidget() {
  const { data: myPolicy } = useMyPolicy()
  const clock = useAttendanceClock({
    requiredHours: myPolicy?.requiredHours ?? 9,
  })
  const [cameraPunchType, setCameraPunchType] = useState<"in" | "out" | null>(
    null
  )
  const [confirmPunchType, setConfirmPunchType] = useState<"in" | "out" | null>(
    null
  )

  const applyPunch = useCallback(
    (type: "in" | "out") => {
      if (type === "in") clock.applyClockIn()
      else clock.applyClockOut()
    },
    [clock]
  )

  const startPunch = useCallback(
    (type: "in" | "out") => {
      if (clock.requiresCameraValidation) setCameraPunchType(type)
      else applyPunch(type)
    },
    [clock.requiresCameraValidation, applyPunch]
  )

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
          if (confirmPunchType) startPunch(confirmPunchType)
          setConfirmPunchType(null)
        }}
      />

      {cameraPunchType && (
        <PunchCameraModal
          punchType={cameraPunchType}
          onClose={() => setCameraPunchType(null)}
          onCaptured={() => {
            applyPunch(cameraPunchType)
            setCameraPunchType(null)
          }}
        />
      )}
    </>
  )
}
