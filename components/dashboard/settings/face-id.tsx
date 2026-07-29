"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FaceIdIcon,
  Camera01Icon,
  Alert01Icon,
  CheckmarkBadge01Icon,
  Delete02Icon,
  Refresh01Icon,
  ShieldUserIcon,
  Add01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { CameraPicker } from "@/components/custom/camera-picker"
import { useToastStore } from "@/store/toast-store"
import { usePreferencesStore } from "@/store/preferences-store"
import {
  useMyFaceEnrollment,
  useEnrollFace,
  useRemoveFace,
} from "@/hooks/use-face-enrollment"
import type { EnrollMode } from "@/lib/biometric-api"
import { loadFaceApi, MODEL_VERSION, type FaceApi } from "@/lib/face-api-loader"
import {
  estimatePose,
  POSE_TARGETS,
  HOLD_TICKS,
  TICK_OWNER,
  tickAngle,
  type PoseKey,
  type PoseTarget,
} from "@/lib/face-pose"

/** Descriptors captured per pose target — the gallery ends up ~2× the number of targets. */
const FRAMES_PER_POSE = 2

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Grabs a small mirrored JPEG thumbnail of the video's current frame. */
function grabThumbnail(video: HTMLVideoElement | null): string {
  if (!video) return ""
  const w = 160
  const h = 120
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  ctx.translate(w, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL("image/jpeg", 0.7)
}

// ── Live capture ────────────────────────────────────────────────────────────────

/** Gating states — the face isn't usable yet, so no pose target can be scored. */
type GateStatus =
  | "init"
  | "denied"
  | "no-camera"
  | "busy"
  | "no-stream"
  | "no-face"
  | "multi"
  | "too-far"
  | "too-close"

/** `aligning` = face is usable but off-target; `holding` = on-target, stabilising. */
type LiveStatus = GateStatus | "aligning" | "holding" | "done"

/** Camera never came up — the detection loop must not overwrite these with "no-face". */
const CAMERA_FAILED: LiveStatus[] = ["denied", "no-camera", "busy", "no-stream"]

const LIVE_LABEL: Record<
  GateStatus,
  { label: string; sub: string; tone: "neutral" | "warn" | "deny" | "ok" }
> = {
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
    sub: "Another app may be using it — close it and try again",
    tone: "deny",
  },
  "no-stream": {
    label: "No video from camera",
    sub: "Camera opened but sent no frames — check for a privacy shutter",
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
  "too-close": {
    label: "Move back",
    sub: "You are too close to the camera",
    tone: "warn",
  },
}

const TONE_STROKE: Record<string, string> = {
  neutral: "#60a5fa",
  warn: "#f59e0b",
  deny: "#ef4444",
  ok: "#22c55e",
}

function FaceCapture({
  faceapi,
  onComplete,
  onCancel,
}: {
  faceapi: FaceApi
  onComplete: (descriptors: number[][], thumbnail: string) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // The in-flight getUserMedia call, shared across effect re-runs. Refs survive StrictMode's
  // double-invoke (same fiber), so a remount reuses this instead of opening the device twice.
  const acquireRef = useRef<Promise<MediaStream> | null>(null)
  // Which camera the cached acquisition belongs to, so a switch can't silently reuse the old one.
  const acquiredDeviceRef = useRef<string | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef = useRef<LiveStatus>("init")
  const runningRef = useRef(false)
  // Guided-capture progress. Kept in refs so the detection loop reads current values without
  // being torn down and restarted on every captured pose.
  const poseIdxRef = useRef(0)
  const holdRef = useRef(0)
  const descriptorsRef = useRef<number[][]>([])
  const thumbRef = useRef("")
  const finishedRef = useRef(false)

  const cameraDeviceId = usePreferencesStore((s) => s.cameraDeviceId)

  const [status, setStatus] = useState<LiveStatus>("init")
  const [poseIdx, setPoseIdx] = useState(0)
  const [captured, setCaptured] = useState<PoseKey[]>([])
  const [error, setError] = useState<string | null>(null)

  function pushStatus(next: LiveStatus) {
    if (statusRef.current === next) return
    statusRef.current = next
    setStatus(next)
  }

  // Open the webcam.
  useEffect(() => {
    let cancelled = false
    let watchdog: ReturnType<typeof setTimeout> | undefined

    // A remount landed before the deferred release ran — reclaim the live stream.
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }

    async function open() {
      // Undefined outside a secure context — e.g. reaching the dev server over a LAN IP
      // (http://192.168.x.x:3000) instead of localhost.
      if (!navigator.mediaDevices?.getUserMedia) {
        pushStatus("no-camera")
        setError(
          "This browser won't expose cameras on an insecure origin. Open the app via http://localhost or an https:// URL."
        )
        return
      }

      let stream: MediaStream
      try {
        // Reuse the existing/in-flight stream. Calling getUserMedia a second time for the same
        // device while the first is being released powers the camera down on Windows — the LED
        // goes dark and the <video> keeps showing its frozen, pre-exposure first frame.
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
              // `exact` would fail outright if the saved camera is gone; prefer it and let the
              // browser fall back, since a working default beats a hard error.
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
        // Classify the failure — otherwise every cause reads as a flat "denied".
        const name = (e as DOMException)?.name
        if (name === "NotFoundError" || name === "OverconstrainedError")
          pushStatus("no-camera")
        else if (name === "NotReadableError" || name === "AbortError")
          pushStatus("busy")
        else pushStatus("denied")
        return
      }

      streamRef.current = stream
      // Never stop the device here on cancel — the stream is shared, and the deferred release
      // in the cleanup is the single owner of teardown.
      if (cancelled) return

      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        // Autoplay rejection alone doesn't stop frames; the watchdog below catches a real stall.
      }
      if (cancelled) return
      pushStatus("no-face")

      // A granted stream that never yields frames (privacy shutter, virtual camera with no
      // source, stalled driver) is otherwise indistinguishable from "no face in view".
      watchdog = setTimeout(() => {
        const v = videoRef.current
        const trackLive = stream.getVideoTracks()[0]?.readyState === "live"
        if (
          !cancelled &&
          v &&
          (v.readyState < 2 || v.videoWidth === 0 || !trackLive)
        ) {
          pushStatus("no-stream")
        }
      }, 6000)
    }

    open()
    return () => {
      cancelled = true
      if (watchdog) clearTimeout(watchdog)
      // Defer the release so a StrictMode/Fast-Refresh remount can reclaim the same stream.
      // Only a genuine unmount lets this actually fire.
      stopTimerRef.current = setTimeout(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        acquireRef.current = null
        stopTimerRef.current = null
      }, 500)
    }
    // Switching camera tears the stream down and re-acquires on the new device.
  }, [cameraDeviceId])

  // Guided capture loop — walks the pose targets in order, capturing each automatically once the
  // head holds inside its zone. There is no manual shutter; the sweep drives itself.
  useEffect(() => {
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
      if (statusRef.current === "init") return
      if (CAMERA_FAILED.includes(statusRef.current)) return
      if (runningRef.current || finishedRef.current) return

      const target = POSE_TARGETS[poseIdxRef.current]
      if (!target) return

      runningRef.current = true
      try {
        const found = await faceapi
          .detectAllFaces(video, gateOpts)
          .withFaceLandmarks()
        if (finishedRef.current) return

        if (found.length === 0) {
          holdRef.current = 0
          pushStatus("no-face")
          return
        }
        if (found.length > 1) {
          holdRef.current = 0
          pushStatus("multi")
          return
        }

        const hit = found[0]
        const vw = video.videoWidth || 640
        const widthRatio = hit.detection.box.width / vw
        if (widthRatio < 0.22) {
          holdRef.current = 0
          pushStatus("too-far")
          return
        }
        if (widthRatio > 0.85) {
          holdRef.current = 0
          pushStatus("too-close")
          return
        }

        const pose = estimatePose(
          hit.landmarks.positions,
          hit.landmarks.getLeftEye(),
          hit.landmarks.getRightEye()
        )
        if (!target.inZone(pose)) {
          holdRef.current = 0
          pushStatus("aligning")
          return
        }

        holdRef.current += 1
        pushStatus("holding")
        if (holdRef.current < HOLD_TICKS) return
        holdRef.current = 0

        // On-target and steady — take this pose's descriptors.
        const grabbed: number[][] = []
        for (let i = 0; i < FRAMES_PER_POSE; i++) {
          const res = await faceapi
            .detectSingleFace(video, grabOpts)
            .withFaceLandmarks()
            .withFaceDescriptor()
          if (res) grabbed.push(Array.from(res.descriptor as Float32Array))
          if (i === 0 && target.key === "center" && !thumbRef.current) {
            thumbRef.current = grabThumbnail(video)
          }
          if (i < FRAMES_PER_POSE - 1) await sleep(120)
        }
        // Nothing usable this time — stay on the same target and let the user try again.
        if (grabbed.length === 0) return

        descriptorsRef.current.push(...grabbed)
        setCaptured((prev) =>
          prev.includes(target.key) ? prev : [...prev, target.key]
        )

        const next = poseIdxRef.current + 1
        poseIdxRef.current = next
        setPoseIdx(next)

        if (next >= POSE_TARGETS.length) {
          finishedRef.current = true
          pushStatus("done")
          onComplete(descriptorsRef.current, thumbRef.current)
        }
      } catch {
        // transient detection error — ignore this tick
      } finally {
        runningRef.current = false
      }
    }, 250)
    return () => clearInterval(id)
    // onComplete is stable for the lifetime of the capture phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceapi])

  // Release the device as soon as the sweep finishes, rather than waiting for unmount.
  useEffect(() => {
    if (status !== "done") return
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    // Drop the cached acquisition so a re-enroll opens a fresh device session.
    acquireRef.current = null
  }, [status])

  const target: PoseTarget | undefined = POSE_TARGETS[poseIdx]
  const onTarget = status === "aligning" || status === "holding"

  const cfg =
    status === "done"
      ? {
          label: "All angles captured",
          sub: "Finishing up…",
          tone: "ok" as const,
        }
      : onTarget && target
        ? {
            label: target.label,
            sub: status === "holding" ? "Hold still…" : target.hint,
            tone: (status === "holding" ? "ok" : "warn") as "ok" | "warn",
          }
        : LIVE_LABEL[status as GateStatus]

  const stroke = TONE_STROKE[cfg.tone]
  const capturedSet = new Set(captured)

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-2xl bg-black"
        style={{ aspectRatio: "4/3" }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
          muted
          playsInline
        />

        {/* Oval guide overlay */}
        <div className="pointer-events-none absolute inset-0">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 400 300"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <mask id="face-oval-mask">
                <rect width="400" height="300" fill="white" />
                <ellipse cx="200" cy="150" rx="88" ry="114" fill="black" />
              </mask>
            </defs>
            <rect
              width="400"
              height="300"
              fill="rgba(0,0,0,0.55)"
              mask="url(#face-oval-mask)"
            />
            <ellipse
              cx="200"
              cy="150"
              rx="88"
              ry="114"
              fill="none"
              strokeWidth="2.5"
              stroke={stroke}
              // Solid once the straight-on pose is banked; dashed while it is still pending.
              strokeDasharray={capturedSet.has("center") ? "none" : "6 4"}
            />

            {/* iPhone-style ring: each tick belongs to a pose target and fills when captured. */}
            {TICK_OWNER.map((owner, i) => {
              const rad = (tickAngle(i) * Math.PI) / 180
              const cos = Math.cos(rad)
              const sin = Math.sin(rad)
              const done = capturedSet.has(owner)
              const active = !done && target?.key === owner
              return (
                <line
                  key={i}
                  x1={200 + 96 * cos}
                  y1={150 + 122 * sin}
                  x2={200 + 110 * cos}
                  y2={150 + 140 * sin}
                  strokeWidth={active ? 5 : 4}
                  strokeLinecap="round"
                  stroke={
                    done
                      ? "#22c55e"
                      : active
                        ? stroke
                        : "rgba(255,255,255,0.22)"
                  }
                  className={active ? "animate-pulse" : undefined}
                />
              )
            })}
          </svg>
        </div>

        {/* Status badge */}
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
                cfg.tone === "ok"
                  ? CheckmarkBadge01Icon
                  : cfg.tone === "neutral"
                    ? Camera01Icon
                    : Alert01Icon
              }
              size={13}
              strokeWidth={2}
            />
            <span className="text-[12px] font-semibold">{cfg.label}</span>
          </div>
        </div>

        {/* Sublabel */}
        <div className="absolute right-0 bottom-3 left-0 flex justify-center">
          <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm">
            {cfg.sub}
          </span>
        </div>
      </div>

      {/* One dot per pose target */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {POSE_TARGETS.map((t) => (
          <span
            key={t.key}
            title={t.label}
            className={cn(
              "size-2 rounded-full transition-colors",
              capturedSet.has(t.key)
                ? "bg-green-500"
                : t.key === target?.key
                  ? "bg-primary"
                  : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {captured.length} of {POSE_TARGETS.length} angles captured
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-900/20">
          <HugeiconsIcon
            icon={Alert01Icon}
            size={15}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-red-500"
          />
          <p className="text-[12px] leading-relaxed text-red-700 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      <CameraPicker className="mt-3" disabled={status === "done"} />

      {/* No shutter button — the sweep captures each angle on its own. */}
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={status === "done"}
        >
          Cancel
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
          <HugeiconsIcon icon={Camera01Icon} size={14} strokeWidth={2} />
          {status === "done"
            ? "Done — building your template…"
            : onTarget
              ? "Follow the prompt above"
              : "Waiting for your face…"}
        </div>
      </div>
    </div>
  )
}

// ── Section ──────────────────────────────────────────────────────────────────────

type Phase = "idle" | "loading" | "capture" | "review"

/** Format an ISO date-time as a readable local string. */
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function FaceEnrollmentSection() {
  const pushToast = useToastStore((s) => s.push)
  const { data: enrollment, isLoading } = useMyFaceEnrollment()
  const enrollMutation = useEnrollFace()
  const removeMutation = useRemoveFace()

  const [phase, setPhase] = useState<Phase>("idle")
  const [faceapi, setFaceApi] = useState<FaceApi | null>(null)
  const [modelError, setModelError] = useState(false)
  const [captured, setCaptured] = useState<{
    descriptors: number[][]
    thumbnail: string
  } | null>(null)
  const [mode, setMode] = useState<EnrollMode>("REPLACE")
  const [consent, setConsent] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const enrolled = !!enrollment?.enrolled
  const appending = mode === "APPEND"

  async function startCapture(nextMode: EnrollMode = "REPLACE") {
    setModelError(false)
    setConsent(false)
    setCaptured(null)
    setMode(nextMode)
    if (faceapi) {
      setPhase("capture")
      return
    }
    setPhase("loading")
    try {
      const api = await loadFaceApi()
      setFaceApi(api)
      setPhase("capture")
    } catch {
      setModelError(true)
      setPhase("idle")
      pushToast(
        "Could not load the face models. Check your connection and try again.",
        "error"
      )
    }
  }

  function onCaptureComplete(descriptors: number[][], thumbnail: string) {
    setCaptured({ descriptors, thumbnail })
    setConsent(false)
    setPhase("review")
  }

  async function submitEnroll() {
    if (!captured || !consent) return
    try {
      await enrollMutation.mutateAsync({
        descriptors: captured.descriptors,
        thumbnail: captured.thumbnail || undefined,
        modelVersion: MODEL_VERSION,
        consent: true,
        mode,
      })
      pushToast(
        appending ? "Alternate look added" : "Face ID enrolled",
        "success"
      )
      setCaptured(null)
      setConsent(false)
      setMode("REPLACE")
      setPhase("idle")
    } catch {
      // error surfaced by the API interceptor toast
    }
  }

  async function removeFace() {
    try {
      await removeMutation.mutateAsync()
      pushToast("Face ID removed", "success")
      setConfirmRemove(false)
    } catch {
      // error surfaced by the API interceptor toast
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <HugeiconsIcon icon={FaceIdIcon} size={18} strokeWidth={1.8} />
          Face ID
        </h3>
        <p className="text-[13px] text-muted-foreground">
          Enroll your face for faster, camera-based check-in. Your face template
          is processed on this device and stored encrypted for your company.
        </p>
      </div>
      <Separator />

      {/* Idle / status */}
      {(phase === "idle" || phase === "loading") && (
        <>
          {isLoading ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
              Loading…
            </div>
          ) : enrolled ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                {enrollment?.thumbnailUrl ? (
                  <img
                    src={enrollment.thumbnailUrl}
                    alt="Enrolled face reference"
                    className="size-16 shrink-0 rounded-xl object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                    <HugeiconsIcon
                      icon={FaceIdIcon}
                      size={28}
                      strokeWidth={1.8}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold">
                      Face ID is set up
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
                      <HugeiconsIcon
                        icon={CheckmarkBadge01Icon}
                        size={11}
                        strokeWidth={2}
                      />
                      Active
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Enrolled {fmtDateTime(enrollment?.enrolledAt ?? null)} ·{" "}
                    {enrollment?.templateCount ?? 0} template
                    {(enrollment?.templateCount ?? 0) === 1 ? "" : "s"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCapture("APPEND")}
                      disabled={phase === "loading"}
                    >
                      <HugeiconsIcon
                        icon={Add01Icon}
                        size={14}
                        strokeWidth={2}
                      />
                      Add another look
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCapture("REPLACE")}
                      disabled={phase === "loading"}
                    >
                      <HugeiconsIcon
                        icon={Refresh01Icon}
                        size={14}
                        strokeWidth={2}
                      />
                      {phase === "loading" ? "Preparing…" : "Re-enroll"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmRemove(true)}
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        size={14}
                        strokeWidth={2}
                      />
                      Remove face
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HugeiconsIcon
                    icon={FaceIdIcon}
                    size={28}
                    strokeWidth={1.6}
                  />
                </div>
                <div>
                  <p className="text-[14px] font-semibold">Set up Face ID</p>
                  <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
                    We&apos;ll guide you through {POSE_TARGETS.length} head
                    angles to build your face template. This happens entirely in
                    your browser — only the encrypted template is sent to your
                    company&apos;s server.
                  </p>
                </div>
                <Button
                  onClick={() => startCapture("REPLACE")}
                  disabled={phase === "loading"}
                >
                  <HugeiconsIcon
                    icon={Camera01Icon}
                    size={16}
                    strokeWidth={2}
                  />
                  {phase === "loading" ? "Preparing camera…" : "Set up Face ID"}
                </Button>
                {modelError && (
                  <p className="text-[12px] text-red-500">
                    Could not load the face models. Please try again.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Privacy note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-4">
            <HugeiconsIcon
              icon={ShieldUserIcon}
              size={16}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-muted-foreground"
            />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Your biometric face template is encrypted at rest and scoped to
              your company. It is never shared across companies and you can
              remove it at any time.
            </p>
          </div>
        </>
      )}

      {/* Loading models spinner state (camera not yet open) */}
      {phase === "loading" && (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
          Preparing the camera and face models…
        </div>
      )}

      {/* Capture */}
      {phase === "capture" && faceapi && (
        <div className="rounded-xl border border-border bg-card p-5">
          <FaceCapture
            faceapi={faceapi}
            onComplete={onCaptureComplete}
            onCancel={() => setPhase("idle")}
          />
        </div>
      )}

      {/* Review + consent */}
      {phase === "review" && captured && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            {captured.thumbnail ? (
              <img
                src={captured.thumbnail}
                alt="Captured face"
                className="size-20 shrink-0 rounded-xl object-cover ring-2 ring-green-500/40"
              />
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                <HugeiconsIcon
                  icon={CheckmarkBadge01Icon}
                  size={32}
                  strokeWidth={1.6}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">
                Captured {captured.descriptors.length} frame
                {captured.descriptors.length === 1 ? "" : "s"} across{" "}
                {POSE_TARGETS.length} angles
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {appending
                  ? "This look will be added to your existing Face ID, not replace it."
                  : "Review the reference image, agree to storage, and enroll."}
              </p>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/20 p-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
              data-testid="face-consent-checkbox"
            />
            <span className="text-[12px] leading-relaxed text-muted-foreground">
              I consent to my company storing an encrypted face template derived
              from these images for the purpose of biometric check-in.
            </span>
          </label>

          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCaptured(null)
                setPhase("capture")
              }}
              disabled={enrollMutation.isPending}
            >
              <HugeiconsIcon icon={Refresh01Icon} size={14} strokeWidth={2} />
              Retake
            </Button>
            <Button
              className="flex-1"
              onClick={submitEnroll}
              disabled={!consent || enrollMutation.isPending}
              data-testid="face-enroll-submit"
            >
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                size={16}
                strokeWidth={2}
              />
              {enrollMutation.isPending
                ? "Saving…"
                : appending
                  ? "Add this look"
                  : "Enroll face"}
            </Button>
          </div>
        </div>
      )}

      {/* Remove confirmation */}
      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Face ID?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            This permanently deletes your stored face template. You can enroll
            again at any time.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemove(false)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={removeFace}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing…" : "Remove face"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
