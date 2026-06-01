"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"

type CheckState = "checking" | "ok" | "fail"
type NetRating = "fast" | "moderate" | "slow"

const RULES = [
  "Sit in a quiet, well-lit room with a plain background.",
  "Keep your face clearly visible and centered — only you should be on camera.",
  "No phones or other devices should be visible.",
  "Don't look away or tilt your head as if reading from somewhere.",
  "Don't switch tabs or leave the screen during the interview.",
  "Speak clearly and make sure your internet connection is stable.",
]

function StatusPill({ state }: { state: CheckState }) {
  if (state === "checking")
    return <span className="text-[11px] text-muted-foreground">Checking…</span>
  if (state === "ok")
    return (
      <span className="flex items-center gap-1 text-[12px] font-medium text-green-600 dark:text-green-400">
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={2} />
        Ready
      </span>
    )
  return (
    <span className="flex items-center gap-1 text-[12px] font-medium text-destructive">
      <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
      Not detected
    </span>
  )
}

function CheckRow({ label, state }: { label: string; state: CheckState }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-[13px]">{label}</span>
      <StatusPill state={state} />
    </div>
  )
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "en-US"
  window.speechSynthesis.speak(u)
}

function createAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  return AC ? new AC() : null
}

/**
 * Pre-interview readiness gate: previews the camera, verifies mic/internet/speech,
 * shows the rules, and requires explicit consent before the (non-reversible) start.
 */
export function InterviewPreflight({
  busy,
  onCancel,
  onStart,
}: {
  busy: boolean
  onCancel: () => void
  onStart: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<CheckState>("checking")
  const [mic, setMic] = useState<CheckState>("checking")
  const [online] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  )
  const [speechOk] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  )
  const [agree, setAgree] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const [netTesting, setNetTesting] = useState(false)
  const [net, setNet] = useState<{
    rating: NetRating
    ms: number | null
    mbps: number | null
  } | null>(null)

  async function testInternet() {
    setNetTesting(true)
    setNet(null)
    const conn = (
      navigator as unknown as { connection?: { downlink?: number } }
    ).connection
    const mbps = typeof conn?.downlink === "number" ? conn.downlink : null
    let ms: number | null = null
    try {
      const samples: number[] = []
      for (let i = 0; i < 3; i++) {
        const start = performance.now()
        await fetch(`/favicon.svg?cb=${Date.now()}-${i}`, { cache: "no-store" })
        samples.push(performance.now() - start)
      }
      ms = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
    } catch {
      ms = null
    }
    let rating: NetRating
    if (ms === null) rating = "slow"
    else if (mbps != null)
      rating = mbps >= 5 ? "fast" : mbps >= 1.5 ? "moderate" : "slow"
    else rating = ms < 120 ? "fast" : ms < 350 ? "moderate" : "slow"
    setNet({ rating, ms, mbps })
    setNetTesting(false)
  }

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCamera(stream.getVideoTracks().length > 0 ? "ok" : "fail")
        setMic(stream.getAudioTracks().length > 0 ? "ok" : "fail")

        // Live mic level meter (voice indicator).
        const ctx = createAudioCtx()
        if (ctx && stream.getAudioTracks().length > 0) {
          audioCtxRef.current = ctx
          const source = ctx.createMediaStreamSource(stream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          const data = new Uint8Array(analyser.frequencyBinCount)
          const loop = () => {
            analyser.getByteTimeDomainData(data)
            let sum = 0
            for (let i = 0; i < data.length; i++) {
              const x = (data[i] - 128) / 128
              sum += x * x
            }
            const rms = Math.sqrt(sum / data.length)
            // Perceptual scaling: sqrt curve boosts quiet/normal speech so you don't
            // have to shout; smoothed with an attack/decay envelope for a natural meter.
            const target = Math.min(1, Math.sqrt(rms) * 2.4)
            setMicLevel(
              (prev) => prev + (target - prev) * (target > prev ? 0.5 : 0.15)
            )
            rafRef.current = requestAnimationFrame(loop)
          }
          loop()
        }
      })
      .catch(() => {
        setCamera("fail")
        setMic("fail")
      })
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      audioCtxRef.current?.close().catch(() => {})
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const ready = camera === "ok" && mic === "ok" && agree

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight">
        Before you start the interview
      </h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        This is a recorded, AI-led interview. Please get set up and read the
        rules — once you start, the attempt can&apos;t be undone.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* Camera preview */}
        <div>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            {camera !== "ok" && (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-[12px] text-white/70">
                {camera === "checking"
                  ? "Requesting camera…"
                  : "Camera blocked — allow access in your browser to continue."}
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Camera preview
          </p>
        </div>

        {/* Checks */}
        <div className="space-y-2">
          <CheckRow label="Camera" state={camera} />

          {/* Microphone with live level meter */}
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px]">Microphone</span>
              <StatusPill state={mic} />
            </div>
            {mic === "ok" && (
              <>
                <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-[width] duration-75"
                    style={{ width: `${Math.round(micLevel * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Speak — the bar should move.
                </p>
              </>
            )}
          </div>

          {/* Internet with a speed test */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-[13px]">Internet connection</span>
            <div className="flex items-center gap-2">
              {netTesting ? (
                <span className="text-[11px] text-muted-foreground">
                  Testing…
                </span>
              ) : net ? (
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    net.rating === "fast"
                      ? "text-green-600 dark:text-green-400"
                      : net.rating === "moderate"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive"
                  )}
                >
                  {net.rating === "fast"
                    ? "Fast"
                    : net.rating === "moderate"
                      ? "Moderate"
                      : "Slow"}
                  {net.ms != null ? ` · ${net.ms} ms` : ""}
                  {net.mbps != null ? ` · ~${net.mbps} Mbps` : ""}
                </span>
              ) : (
                <StatusPill state={online ? "ok" : "fail"} />
              )}
              <Button
                variant="outline"
                size="xs"
                onClick={testInternet}
                disabled={netTesting}
              >
                {netTesting ? "…" : "Test"}
              </Button>
            </div>
          </div>

          {/* Voice playback with a Test button */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-[13px]">Voice playback</span>
            <div className="flex items-center gap-2">
              <StatusPill state={speechOk ? "ok" : "fail"} />
              {speechOk && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    speak(
                      "This is a sample of the interview voice. If you can hear this clearly, you're ready to begin."
                    )
                  }
                >
                  Test
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/15">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-800 dark:text-amber-300">
          <HugeiconsIcon icon={Alert01Icon} size={15} strokeWidth={2} />
          Interview rules
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-amber-900/90 dark:text-amber-200/80">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
          <li className="font-medium">
            Violating these (multiple faces, visible phone, looking away,
            tab-switching) may disqualify your session.
          </li>
        </ul>
      </div>

      {/* Consent */}
      <label className="mt-4 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span className="text-[13px] text-muted-foreground">
          I&apos;ve read the rules and understand the interview is recorded and{" "}
          <span className="font-medium text-foreground">cannot be undone</span>{" "}
          once started.
        </span>
      </label>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <Button
          onClick={() => {
            // Enter fullscreen from this user gesture; the interview enforces it.
            document.documentElement.requestFullscreen?.().catch(() => {})
            onStart()
          }}
          disabled={!ready || busy}
        >
          {busy ? "Starting…" : "Start interview"}
        </Button>
      </div>
    </div>
  )
}
