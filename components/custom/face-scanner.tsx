"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert01Icon, CheckmarkBadge01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { CameraPicker } from "@/components/custom/camera-picker"
import { loadFaceApi, type FaceApi } from "@/lib/face-api-loader"
import { usePreferencesStore } from "@/store/preferences-store"

/**
 * Camera view that produces a single face descriptor and hands it to the caller.
 *
 * It makes no accept/reject decision — enrolled galleries never leave the server, so matching is
 * always someone else's job. Shared by the in-app punch modal and the login-page kiosk so the
 * camera lifecycle lives in exactly one place: acquisition is memoised across StrictMode's double
 * mount (a second getUserMedia on the same device powers the camera down on Windows), release is
 * deferred so a remount can reclaim the stream, and switching cameras tears down the old device.
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
  captured: { label: "Face captured", sub: "Just a moment…", tone: "ok" },
}

const TONE_STROKE: Record<string, string> = {
  neutral: "#60a5fa",
  warn: "#f59e0b",
  deny: "#ef4444",
  ok: "#22c55e",
}

export function FaceScanner({
  onDescriptor,
  busy,
  busyLabel,
  attempt = 0,
  maskId = "face-scanner-oval",
  showCameraPicker = true,
  className,
}: {
  /** Receives the live 128-float descriptor exactly once per scan. */
  onDescriptor: (descriptor: number[]) => void
  /** Caller is mid-request; shown instead of the status sublabel. */
  busy?: boolean
  busyLabel?: string
  /** Increment to re-arm the scanner after a rejection. */
  attempt?: number
  /** Unique per instance if two scanners could ever mount together (SVG mask ids are global). */
  maskId?: string
  showCameraPicker?: boolean
  className?: string
}) {
  const cameraDeviceId = usePreferencesStore((s) => s.cameraDeviceId)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const acquireRef = useRef<Promise<MediaStream> | null>(null)
  const acquiredDeviceRef = useRef<string | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef = useRef<ScanStatus>("loading")
  const runningRef = useRef(false)
  const holdRef = useRef(0)
  const doneRef = useRef(false)

  const [faceapi, setFaceApi] = useState<FaceApi | null>(null)
  const [status, setStatus] = useState<ScanStatus>("loading")

  function pushStatus(next: ScanStatus) {
    if (statusRef.current === next) return
    statusRef.current = next
    setStatus(next)
  }

  // Re-arm on a new attempt.
  useEffect(() => {
    if (attempt === 0) return
    doneRef.current = false
    holdRef.current = 0
  }, [attempt])

  useEffect(() => {
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
  }, [])

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
      // Deferred so a StrictMode/Fast-Refresh remount can reclaim the same stream.
      stopTimerRef.current = setTimeout(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        acquireRef.current = null
        stopTimerRef.current = null
      }, 500)
    }
  }, [faceapi, attempt, cameraDeviceId])

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
        // Two consecutive in-zone ticks, so a motion-blurred frame isn't what gets sent.
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
        onDescriptor(Array.from(res.descriptor as Float32Array))
      } catch {
        // transient detection error — ignore this tick
      } finally {
        runningRef.current = false
      }
    }, 250)
    return () => clearInterval(id)
    // onDescriptor is stable for the lifetime of the scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceapi, attempt])

  const cfg = LABEL[status]
  const stroke = TONE_STROKE[cfg.tone]

  return (
    <div className={className}>
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
              <mask id={maskId}>
                <rect width="400" height="300" fill="white" />
                <ellipse cx="200" cy="150" rx="88" ry="114" fill="black" />
              </mask>
            </defs>
            <rect
              width="400"
              height="300"
              fill="rgba(0,0,0,0.55)"
              mask={`url(#${maskId})`}
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
              icon={cfg.tone === "ok" ? CheckmarkBadge01Icon : Alert01Icon}
              size={13}
              strokeWidth={2}
            />
            <span className="text-[12px] font-semibold">{cfg.label}</span>
          </div>
        </div>

        <div className="absolute right-0 bottom-3 left-0 flex justify-center">
          <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm">
            {busy ? (busyLabel ?? "Working…") : cfg.sub}
          </span>
        </div>
      </div>

      {showCameraPicker && (
        <CameraPicker className="px-5 pt-4" disabled={busy} />
      )}
    </div>
  )
}
