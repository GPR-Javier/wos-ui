"use client"

import { AttendanceCameraCapture } from "@/components/custom/attendance-camera-capture"

/**
 * Camera-verification modal shown before clock-in / clock-out for roles that require
 * photo validation. Shared by the dashboard `ClockWidget` and the DTR clock panel.
 */
export function PunchCameraModal({
  punchType,
  onClose,
  onCaptured,
}: {
  punchType: "in" | "out"
  onClose: () => void
  onCaptured: (capturedTime: string) => void
}) {
  const isClockIn = punchType === "in"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {isClockIn ? "Clock In" : "Clock Out"} Verification
            </p>
            <p className="text-[13px] text-muted-foreground">
              Capture your photo to complete{" "}
              {isClockIn ? "clock in" : "clock out"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close camera"
          >
            ✕
          </button>
        </div>
        <AttendanceCameraCapture
          punchType={punchType}
          onCapture={onCaptured}
          onBack={onClose}
        />
      </div>
    </div>
  )
}
