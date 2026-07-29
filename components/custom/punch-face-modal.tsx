"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FaceIdIcon,
  Alert01Icon,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSlugHref } from "@/lib/slug"
import { loadFaceApi, type FaceApi } from "@/lib/face-api-loader"
import { CameraPicker } from "@/components/custom/camera-picker"
import { useMyFaceEnrollment } from "@/hooks/use-face-enrollment"
import { usePreferencesStore } from "@/store/preferences-store"

/**
 * Face-verification gate shown before clock-in / clock-out for roles that require it.
 *
 * This only *produces* a descriptor from the live frame — it deliberately makes no accept/reject
 * decision, because the enrolled gallery never leaves the server. wos-hr matches the descriptor
 * as part of recording the punch, so a tampered client can't talk its way past this.
 */

type ScanStatus =
  | "loading"
  | "model-error"
  | "init"
  | "denied"
  | "no-camera"
  | "busy"
  | "no-face"
  | "multi"
  | "too-far"
  | "scanning"
  | "captured"

const LABEL: Record<
  ScanStatus,
  { label: string; sub: string; tone: "neutral" | "warn" | "deny" | "ok" }
> = {
  loading: { label: "Preparing…", sub: "Loading face models", tone: "neutral" },
  "model-error": {
    label: "Could not load face models",
    sub: "Check your connection and try again",
    tone: "deny",
  },
  init: { label: "Starting camera…", sub: "Please wait", tone: "neutral" },
  denied: {
    label: "Camera access denied",
    sub: "Allow camera access in your browser",
    tone: "deny",
  },
  "no-camera": {
    label: "No camera found",
    sub: "Connect a webcam, then try again",
    tone: "deny",
  },
  busy: {
    label: "Camera unavailable",
    sub: "Another app may be using it",
    tone: "deny",
  },
  "no-face": {
    label: "No face detected",
    sub: "Position your face inside the oval",
    tone: "deny",
  },
  multi: {
    label: "Only one face",
    sub: "Only your face should be in view",
    tone: "deny",
  },
  "too-far": {
    label: "Move closer",
    sub: "You are too far from the camera",
    tone: "warn",
  },
  scanning: { label: "Verifying…", sub: "Hold still", tone: "ok" },
  captured: {
    label: "Face captured",
    sub: "Completing your punch…",
    tone: "ok",
  },
}

const TONE_STROKE: Record<string, string> = {
  neutral: "#60a5fa",
  warn: "#f59e0b",
  deny: "#ef4444",
  ok: "#22c55e",
}

export function PunchFaceModal({
  punchType,
  onClose,
  onVerified,
  onRetry,
  submitting,
  errorMessage,
  successLabel,
}: {
  punchType: "in" | "out"
  onClose: () => void
  /** Receives the live 128-float descriptor; the caller sends it with the punch. */
  onVerified: (descriptor: number[]) => void
  /** Called when the user chooses to rescan — the caller should clear `errorMessage`. */
  onRetry?: () => void
  /** True while the punch request is in flight. */
  submitting?: boolean
  /** Server-side rejection (e.g. face not matched) surfaced back into the modal. */
  errorMessage?: string | null
  /**
   * Set once the punch is recorded, e.g. "1:23 PM". Swaps the camera for a success panel that
   * auto-dismisses, so the punch is visibly confirmed instead of the modal just vanishing.
   */
  successLabel?: string | null
}) {
  const isClockIn = punchType === "in"
  const slugHref = useSlugHref()
  const { data: enrollment, isLoading: enrollmentLoading } =
    useMyFaceEnrollment()

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const acquireRef = useRef<Promise<MediaStream> | null>(null)
  // Which camera the cached acquisition belongs to, so a switch can't silently reuse the old one.
  const acquiredDeviceRef = useRef<string | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef = useRef<ScanStatus>("loading")
  const runningRef = useRef(false)
  const holdRef = useRef(0)
  const doneRef = useRef(false)

  const cameraDeviceId = usePreferencesStore((s) => s.cameraDeviceId)

  const [faceapi, setFaceApi] = useState<FaceApi | null>(null)
  const [status, setStatus] = useState<ScanStatus>("loading")
  // Bumped by retry() to restart the camera + detection effects after a rejection.
  const [attempt, setAttempt] = useState(0)

  const enrolled = !!enrollment?.enrolled
  // Nothing to match against — send them to enrollment instead of opening the camera.
  const blocked = !enrollmentLoading && !enrolled

  function pushStatus(next: ScanStatus) {
    if (statusRef.current === next) return
    statusRef.current = next
    setStatus(next)
  }

  // Load models (skipped entirely when the user isn't enrolled).
  useEffect(() => {
    if (blocked || enrollmentLoading) return
    let cancelled = false
    loadFaceApi()
      .then((api) => {
        if (cancelled) return
        setFaceApi(api)
        pushStatus("init")
      })
      .catch(() => {
        if (!cancelled) pushStatus("model-error")
      })
    return () => {
      cancelled = true
    }
  }, [blocked, enrollmentLoading])

  // Open the camera once the models are ready. Mirrors the enrollment flow: one shared
  // acquisition and a deferred release, so StrictMode's double-mount can't power the device down.
  useEffect(() => {
    if (!faceapi) return
    let cancelled = false

    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }

    async function open() {
      if (!navigator.mediaDevices?.getUserMedia) {
        pushStatus("no-camera")
        return
      }
      let stream: MediaStream
      try {
        // A camera switch must release the previous device rather than reuse its stream.
        if (
          acquireRef.current &&
          acquiredDeviceRef.current !== cameraDeviceId
        ) {
          streamRef.current?.getTracks().forEach((t) => t.stop())
          streamRef.current = null
          acquireRef.current = null
        }
        if (!acquireRef.current) {
          acquiredDeviceRef.current = cameraDeviceId
          acquireRef.current = navigator.mediaDevices.getUserMedia({
            video: {
              // Preferred, not exact — a working default beats a hard error if it's unplugged.
              ...(cameraDeviceId
                ? { deviceId: { ideal: cameraDeviceId } }
                : {}),
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          })
        }
        stream = await acquireRef.current
      } catch (e) {
        acquireRef.current = null
        if (cancelled) return
        const name = (e as DOMException)?.name
        if (name === "NotFoundError" || name === "OverconstrainedError")
          pushStatus("no-camera")
        else if (name === "NotReadableError" || name === "AbortError")
          pushStatus("busy")
        else pushStatus("denied")
        return
      }

      streamRef.current = stream
      if (cancelled) return
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        // Autoplay rejection doesn't necessarily stop frames.
      }
      if (!cancelled) pushStatus("no-face")
    }

    open()
    return () => {
      cancelled = true
      stopTimerRef.current = setTimeout(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        acquireRef.current = null
        stopTimerRef.current = null
      }, 500)
    }
    // Switching camera tears the stream down and re-acquires on the new device.
  }, [faceapi, attempt, cameraDeviceId])

  // Detection loop — grabs a descriptor as soon as a single face holds steady.
  useEffect(() => {
    if (!faceapi) return
    const gateOpts = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5,
    })
    const grabOpts = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    })

    const id = setInterval(async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      if (runningRef.current || doneRef.current) return
      if (statusRef.current === "init" || statusRef.current === "captured")
        return

      runningRef.current = true
      try {
        const dets = await faceapi.detectAllFaces(video, gateOpts)
        if (doneRef.current) return

        if (dets.length === 0) {
          holdRef.current = 0
          pushStatus("no-face")
          return
        }
        if (dets.length > 1) {
          holdRef.current = 0
          pushStatus("multi")
          return
        }
        if (dets[0].box.width / (video.videoWidth || 640) < 0.22) {
          holdRef.current = 0
          pushStatus("too-far")
          return
        }

        holdRef.current += 1
        pushStatus("scanning")
        if (holdRef.current < 2) return

        const res = await faceapi
          .detectSingleFace(video, grabOpts)
          .withFaceLandmarks()
          .withFaceDescriptor()
        if (!res || doneRef.current) return

        doneRef.current = true
        pushStatus("captured")
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        acquireRef.current = null
        onVerified(Array.from(res.descriptor as Float32Array))
      } catch {
        // transient detection error — ignore this tick
      } finally {
        runningRef.current = false
      }
    }, 250)
    return () => clearInterval(id)
    // onVerified is stable for the lifetime of the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceapi, attempt])

  // Hold the confirmation on screen briefly, then dismiss. The camera is already released by the
  // time this runs, so the delay costs nothing but a moment of reassurance.
  useEffect(() => {
    if (!successLabel) return
    const id = setTimeout(onClose, 1800)
    return () => clearTimeout(id)
    // onClose is stable for the lifetime of the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successLabel])

  /**
   * Re-arms the scanner after a server-side rejection. Deliberately user-triggered rather than
   * automatic: a silent retry loop would hammer the camera and re-submit the same failing face.
   */
  function retry() {
    doneRef.current = false
    holdRef.current = 0
    acquireRef.current = null
    pushStatus("init")
    onRetry?.()
    setAttempt((n) => n + 1)
  }

  const cfg = LABEL[status]
  const stroke = TONE_STROKE[cfg.tone]

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
              Verify your face to complete{" "}
              {isClockIn ? "clock in" : "clock out"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {successLabel ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                size={36}
                strokeWidth={1.6}
              />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-green-600 dark:text-green-400">
                {isClockIn ? "Timed in" : "Timed out"}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Face verified at {successLabel}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : blocked ? (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <HugeiconsIcon icon={FaceIdIcon} size={28} strokeWidth={1.6} />
            </div>
            <div>
              <p className="text-[14px] font-semibold">
                Face ID isn&apos;t set up
              </p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted-foreground">
                Your role requires face verification to clock in and out. Enroll
                your face once, then you can punch normally.
              </p>
            </div>
            <div className="flex w-full items-center gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button asChild className="flex-1">
                <Link href={slugHref("/dashboard/settings/face-id")}>
                  Set up Face ID
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="relative overflow-hidden bg-black"
              style={{ aspectRatio: "4/3" }}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
                muted
                playsInline
              />
              <div className="pointer-events-none absolute inset-0">
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 400 300"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <mask id="punch-oval-mask">
                      <rect width="400" height="300" fill="white" />
                      <ellipse
                        cx="200"
                        cy="150"
                        rx="88"
                        ry="114"
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect
                    width="400"
                    height="300"
                    fill="rgba(0,0,0,0.55)"
                    mask="url(#punch-oval-mask)"
                  />
                  <ellipse
                    cx="200"
                    cy="150"
                    rx="88"
                    ry="114"
                    fill="none"
                    strokeWidth="2.5"
                    stroke={stroke}
                    strokeDasharray={cfg.tone === "ok" ? "none" : "6 4"}
                  />
                </svg>
              </div>

              <div className="absolute top-3 right-0 left-0 flex justify-center">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 backdrop-blur-md",
                    cfg.tone === "ok"
                      ? "border-green-500/40 bg-green-500/20 text-green-400"
                      : cfg.tone === "warn"
                        ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                        : cfg.tone === "deny"
                          ? "border-red-500/40 bg-red-500/20 text-red-400"
                          : "border-white/20 bg-black/40 text-white/80"
                  )}
                >
                  <HugeiconsIcon
                    icon={
                      cfg.tone === "ok" ? CheckmarkBadge01Icon : Alert01Icon
                    }
                    size={13}
                    strokeWidth={2}
                  />
                  <span className="text-[12px] font-semibold">{cfg.label}</span>
                </div>
              </div>

              <div className="absolute right-0 bottom-3 left-0 flex justify-center">
                <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm">
                  {submitting ? "Recording your punch…" : cfg.sub}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-900/20">
                <HugeiconsIcon
                  icon={Alert01Icon}
                  size={15}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-red-500"
                />
                <p className="text-[12px] leading-relaxed text-red-700 dark:text-red-400">
                  {errorMessage}
                </p>
              </div>
            )}

            <CameraPicker className="px-5 pt-4" disabled={submitting} />

            <div className="flex items-center gap-3 p-5">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              {errorMessage && (
                <Button
                  className="flex-1"
                  onClick={retry}
                  disabled={submitting}
                >
                  Try again
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
