"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  VolumeHighIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import type { StartResponse, AnswerInput } from "@/lib/assessment-runtime-api"

// ── Minimal Web Speech typings (avoids `any`) ─────────────────────────────────
interface SRAlt {
  transcript: string
}
interface SRResult {
  readonly length: number
  isFinal: boolean
  readonly [i: number]: SRAlt
}
interface SREvent {
  resultIndex: number
  results: { readonly length: number; readonly [i: number]: SRResult }
}
interface SpeechRec {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SREvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
type SRCtor = new () => SpeechRec

function getSRCtor(): SRCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SRCtor
    webkitSpeechRecognition?: SRCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
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

const BARS = 28
const ZERO_BARS = Array<number>(BARS).fill(0)

export function AIInterviewRunner({
  run,
  busy,
  onSubmit,
  onCancel,
}: {
  run: StartResponse
  busy: boolean
  onSubmit: (answers: AnswerInput[]) => void
  onCancel: () => void
}) {
  const [index, setIndex] = useState(0)
  const [transcripts, setTranscripts] = useState<Record<number, string>>({})
  const [recording, setRecording] = useState(false)
  const [levels, setLevels] = useState<number[]>(ZERO_BARS)
  const recRef = useRef<SpeechRec | null>(null)
  const [srSupported] = useState(() => !!getSRCtor())

  // Proctoring: leaving the interview (exit fullscreen / tab switch / alt-tab) ends it.
  const [endedReason, setEndedReason] = useState<string | null>(null)
  const endedRef = useRef(false)
  const armedRef = useRef(false)

  // Live camera preview + audio analyser for the voice waveform.
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const camStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const waveRafRef = useRef<number | null>(null)
  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        camStreamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        const ctx = createAudioCtx()
        if (ctx && stream.getAudioTracks().length > 0) {
          audioCtxRef.current = ctx
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 128
          ctx.createMediaStreamSource(stream).connect(analyser)
          analyserRef.current = analyser
        }
      })
      .catch(() => {
        /* camera/mic blocked — interview still proceeds */
      })
    return () => {
      cancelled = true
      if (waveRafRef.current) cancelAnimationFrame(waveRafRef.current)
      audioCtxRef.current?.close().catch(() => {})
      camStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function startWave() {
    const analyser = analyserRef.current
    if (!analyser) return
    audioCtxRef.current?.resume?.()
    const bins = new Uint8Array(analyser.frequencyBinCount)
    const group = Math.max(1, Math.floor(bins.length / BARS))
    const loop = () => {
      analyser.getByteFrequencyData(bins)
      const next: number[] = []
      for (let b = 0; b < BARS; b++) {
        let sum = 0
        for (let j = 0; j < group; j++) sum += bins[b * group + j] ?? 0
        next.push(Math.min(1, sum / group / 150))
      }
      setLevels(next)
      waveRafRef.current = requestAnimationFrame(loop)
    }
    loop()
  }

  function stopWave() {
    if (waveRafRef.current) cancelAnimationFrame(waveRafRef.current)
    waveRafRef.current = null
    setLevels(ZERO_BARS)
  }

  // Enforce a focused, fullscreen session: exiting fullscreen / switching tabs ends it.
  useEffect(() => {
    const armTimer = setTimeout(() => {
      armedRef.current = true
    }, 1200)
    const end = (reason: string) => {
      if (!armedRef.current || endedRef.current) return
      endedRef.current = true
      recRef.current?.stop()
      recRef.current = null
      if (waveRafRef.current) cancelAnimationFrame(waveRafRef.current)
      setRecording(false)
      setEndedReason(reason)
    }
    const onFs = () => {
      if (!document.fullscreenElement) end("You exited full screen.")
    }
    const onVis = () => {
      if (document.hidden) end("You left the interview tab.")
    }
    const onBlur = () => end("You switched away from the interview window.")

    document.addEventListener("fullscreenchange", onFs)
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("blur", onBlur)
    return () => {
      clearTimeout(armTimer)
      document.removeEventListener("fullscreenchange", onFs)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("blur", onBlur)
      // NOTE: fullscreen is intentionally NOT exited here — under React StrictMode the
      // effect mounts→cleans→remounts, which would instantly drop the fullscreen the
      // preflight just entered. We exit explicitly on finish/cancel instead.
    }
  }, [])

  function leaveFullscreen() {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }

  const question = run.questions[index]
  const isLast = index === run.questions.length - 1
  const answeredCount = run.questions.filter((q) =>
    (transcripts[q.id] ?? "").trim()
  ).length
  const answer = (transcripts[question.id] ?? "").trim()
  const answered = answer.length > 0
  const wordCount = answered ? answer.split(/\s+/).length : 0

  // Read each question aloud when it appears; cancel speech on unmount.
  useEffect(() => {
    speak(question.text)
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel()
    }
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  function stopRecording() {
    recRef.current?.stop()
    recRef.current = null
    setRecording(false)
    stopWave()
  }

  function startRecording() {
    const Ctor = getSRCtor()
    if (!Ctor) return
    if (typeof window !== "undefined") window.speechSynthesis?.cancel()
    const qid = question.id
    const rec = new Ctor()
    rec.lang = "en-US"
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let finalChunk = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalChunk += (res[0]?.transcript ?? "") + " "
      }
      if (finalChunk) {
        setTranscripts((t) => ({
          ...t,
          [qid]: `${(t[qid] ?? "").trim()} ${finalChunk.trim()}`.trim(),
        }))
      }
    }
    rec.onend = () => setRecording(false)
    rec.onerror = () => setRecording(false)
    recRef.current = rec
    rec.start()
    setRecording(true)
    startWave()
  }

  function go(next: number) {
    if (recording) stopRecording()
    setIndex(next)
  }

  function finish() {
    if (recording) stopRecording()
    leaveFullscreen()
    onSubmit(
      run.questions.map((q) => ({
        questionId: q.id,
        transcript: (transcripts[q.id] ?? "").trim(),
      }))
    )
  }

  function handleCancel() {
    if (recording) stopRecording()
    leaveFullscreen()
    onCancel()
  }

  return (
    <div>
      {/* Camera */}
      <div className="mb-4 flex justify-center">
        <div className="relative w-64 overflow-hidden rounded-xl border border-border bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video w-full object-cover"
          />
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
            REC
          </span>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-[12px] text-muted-foreground">
        <span>
          Question {index + 1} of {run.questions.length}
        </span>
        <span>{answeredCount} answered</span>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[16px] leading-relaxed font-medium">
            {question.text}
          </p>
          <button
            type="button"
            onClick={() => speak(question.text)}
            title="Replay question"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={VolumeHighIcon} size={15} strokeWidth={1.8} />
          </button>
        </div>

        {/* Record control */}
        <div className="mt-5 flex flex-col items-center gap-3">
          {srSupported && (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={cn(
                "flex size-16 items-center justify-center rounded-full transition-all",
                recording
                  ? "animate-pulse bg-red-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <MicIcon recording={recording} />
            </button>
          )}
          <p className="text-[12px] text-muted-foreground">
            {!srSupported
              ? "Voice answers need Chrome or Edge — type your answer below."
              : recording
                ? "Listening… click the button to stop."
                : answered
                  ? "Answer captured. You can re-record if needed."
                  : "Click the mic and speak your answer."}
          </p>
          {recording && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-9 items-center justify-center gap-0.75">
                {levels.map((v, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-red-500"
                    style={{ height: `${Math.max(12, Math.round(v * 100))}%` }}
                  />
                ))}
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-500">
                <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                Recording…
              </span>
            </div>
          )}
          {/* Confirmation only — the transcript itself is never shown or editable. */}
          {srSupported && !recording && answered && (
            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={14}
                  strokeWidth={2}
                />
                Answer recorded · {wordCount} word{wordCount !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() =>
                  setTranscripts((t) => ({ ...t, [question.id]: "" }))
                }
                className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Re-record
              </button>
            </div>
          )}
        </div>

        {/* Typed answer ONLY when speech recognition is unavailable (fallback). */}
        {!srSupported && (
          <div className="mt-4">
            <label className="text-[12px] text-muted-foreground">
              Your answer
            </label>
            <textarea
              rows={4}
              className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder="Type your answer…"
              value={transcripts[question.id] ?? ""}
              onChange={(e) =>
                setTranscripts((t) => ({ ...t, [question.id]: e.target.value }))
              }
            />
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleCancel}
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button variant="ghost" size="sm" onClick={() => go(index - 1)}>
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={13}
                strokeWidth={2}
                className="mr-1.5"
              />
              Previous
            </Button>
          )}
          {isLast ? (
            <Button size="sm" onClick={finish} disabled={busy}>
              {busy ? "Submitting…" : "Finish interview"}
            </Button>
          ) : (
            <Button size="sm" onClick={() => go(index + 1)}>
              Next
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={13}
                strokeWidth={2}
                className="ml-1.5"
              />
            </Button>
          )}
        </div>
      </div>

      {/* Proctoring: session-ended modal */}
      {endedReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-red-500/10">
              <HugeiconsIcon
                icon={Alert01Icon}
                size={24}
                strokeWidth={1.8}
                className="text-red-500"
              />
            </div>
            <h2 className="text-[16px] font-semibold">Interview ended</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {endedReason} Leaving the interview screen ends the session. The
              answers you recorded have been saved.
            </p>
            <Button className="mt-5 w-full" onClick={finish} disabled={busy}>
              {busy ? "Submitting…" : "Finish & exit"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function MicIcon({ recording }: { recording: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {recording ? (
        <rect
          x="6"
          y="6"
          width="12"
          height="12"
          rx="2"
          fill="currentColor"
          stroke="none"
        />
      ) : (
        <>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </>
      )}
    </svg>
  )
}
