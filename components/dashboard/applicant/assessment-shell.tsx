"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useSlugHref } from "@/lib/slug"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/custom/status-badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons"
import {
  useAssessmentOverview,
  useStartPart,
  useSubmitPart,
} from "@/hooks/use-assessment-runtime"
import {
  assessmentRuntimeApi,
  type PartOverview,
  type StartResponse,
  type SubmitResponse,
  type AnswerInput,
} from "@/lib/assessment-runtime-api"
import { PART_TYPE_LABEL, type AssessmentPartType } from "@/lib/assessment-api"
import { AIInterviewRunner } from "./ai-interview-runner"
import { InterviewPreflight } from "./interview-preflight"
import { InterviewIntro } from "./interview-intro"
import { OfferReviewModal } from "./offer-review-modal"
import { resetSessionPersona } from "@/lib/interview-voice"

type Phase = "landing" | "preflight" | "intro" | "running" | "result"

export function AssessmentShell({ applicationId }: { applicationId: number }) {
  const slugHref = useSlugHref()
  const {
    data: overview,
    isLoading,
    isError,
  } = useAssessmentOverview(applicationId)
  const startMut = useStartPart(applicationId)
  const submitMut = useSubmitPart(applicationId)

  const [phase, setPhase] = useState<Phase>("landing")
  const [run, setRun] = useState<StartResponse | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<SubmitResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingPart, setPendingPart] = useState<AssessmentPartType | null>(
    null
  )
  const [showOffer, setShowOffer] = useState(false)

  // AI interviews go through a readiness gate first; other parts start immediately.
  function beginPart(partType: AssessmentPartType) {
    setError(null)
    if (partType === "AI_INTERVIEW" || partType === "AI_TECHNICAL_INTERVIEW") {
      setPendingPart(partType)
      setPhase("preflight")
    } else {
      startPart(partType)
    }
  }

  function startPart(partType: AssessmentPartType) {
    setError(null)
    startMut.mutate(partType, {
      onSuccess: (data) => {
        setRun(data)
        setAnswers({})
        setResult(null)
        setPhase("running")
      },
      onError: (e: unknown) => {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Couldn't start this part."
        setError(msg)
      },
    })
  }

  // AI interview: show the bot's greeting while the opening question is generated in the background,
  // so clicking "Yes, I'm ready" leads straight into it.
  function enterIntro(partType: AssessmentPartType) {
    setError(null)
    setRun(null)
    setAnswers({})
    setResult(null)
    resetSessionPersona() // re-roll the interviewer voice/name for this interview
    setPhase("intro")
    startMut.mutate(partType, {
      onSuccess: (data) => setRun(data),
      onError: (e: unknown) => {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ??
          "Couldn't prepare your interview. The AI service may be unavailable."
        setError(msg)
      },
    })
  }

  function exitFullscreen() {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }

  function doSubmit(payload: AnswerInput[]) {
    if (!run) return
    submitMut.mutate(
      { partType: run.partType, answers: payload },
      {
        onSuccess: (data) => {
          setResult(data)
          setPhase("result")
        },
        onError: () =>
          setError("Couldn't submit your answers. Please try again."),
      }
    )
  }

  function submitRun() {
    if (!run) return
    doSubmit(
      run.questions.map((q) => ({
        questionId: q.id,
        responseIndex: answers[q.id] ?? -1,
      }))
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }
  if (isError || !overview) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-[15px] font-semibold">Assessment unavailable</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          This job may not have an assessment configured, or the link is
          invalid.
        </p>
        <Link href={slugHref("/dashboard/my-applications")} className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Back to My Applications
          </Button>
        </Link>
      </div>
    )
  }

  const landingActiveType =
    overview.parts.find((p) => p.available && p.runnable && p.passed !== true)
      ?.type ?? null

  // ── Interview readiness gate ────────────────────────────────────────────────
  if (phase === "preflight" && pendingPart) {
    return (
      <div>
        <div className="mx-auto max-w-2xl px-6 pt-6">
          <StepBar parts={overview.parts} activeType={pendingPart} applicationStatus={overview.applicationStatus} />
        </div>
        <InterviewPreflight
          busy={startMut.isPending}
          onCancel={() => {
            setPendingPart(null)
            setPhase("landing")
          }}
          onStart={() => enterIntro(pendingPart)}
        />
      </div>
    )
  }

  // ── Interview intro (bot greeting + readiness) ──────────────────────────────
  if (phase === "intro" && pendingPart) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="flex min-h-full items-center justify-center">
          <InterviewIntro
            ready={!!run}
            error={error}
            onYes={() => setPhase("running")}
            onNo={() => {
              exitFullscreen()
              setRun(null)
              setPendingPart(null)
              setPhase("landing")
            }}
          />
        </div>
      </div>
    )
  }

  // ── Running a part ────────────────────────────────────────────────────────
  if (phase === "running" && run) {
    const answeredCount = run.questions.filter(
      (q) => answers[q.id] != null
    ).length
    const isLikert = run.partType === "PERSONALITY"
    const isAiInterview =
      run.partType === "AI_INTERVIEW" ||
      run.partType === "AI_TECHNICAL_INTERVIEW"
    const inner = (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <StepBar parts={overview.parts} activeType={run.partType} applicationStatus={overview.applicationStatus} />
        <div className={cn("mt-4 mb-5", isAiInterview && "text-center")}>
          <h1 className="text-lg font-semibold">
            {PART_TYPE_LABEL[run.partType]}
          </h1>
          <div
            className={cn(
              "mt-1 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground",
              isAiInterview && "justify-center"
            )}
          >
            <span>Attempt #{run.attemptNo}</span>
            {run.minPassingScore != null && (
              <span>Pass mark: {run.minPassingScore}%</span>
            )}
            {run.timeLimitSeconds != null && (
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={1.8} />
                {Math.round(run.timeLimitSeconds / 60)} min
              </span>
            )}
            {!isAiInterview && (
              <span>
                {answeredCount}/{run.questions.length} answered
              </span>
            )}
          </div>
        </div>

        {isAiInterview ? (
          <AIInterviewRunner
            run={run}
            busy={submitMut.isPending}
            onSubmit={doSubmit}
            onCancel={() => setPhase("landing")}
            onRequestNext={
              run.aiFollowUp
                ? (transcript) =>
                    assessmentRuntimeApi.nextQuestion(
                      applicationId,
                      run.partType,
                      transcript
                    )
                : undefined
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {run.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-[13px] font-medium">
                    <span className="text-muted-foreground">{idx + 1}.</span>{" "}
                    {q.text}
                  </p>
                  {isLikert ? (
                    <div className="mt-3 flex items-stretch justify-between gap-1.5">
                      {q.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setAnswers((a) => ({ ...a, [q.id]: i }))
                          }
                          className={cn(
                            "flex flex-1 flex-col items-center gap-2 rounded-lg border px-1.5 py-3 text-center transition-colors",
                            answers[q.id] === i
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/40"
                          )}
                        >
                          <span
                            className={cn(
                              "size-4 rounded-full border-2 transition-colors",
                              answers[q.id] === i
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/40"
                            )}
                          />
                          <span className="text-[10px] leading-tight text-muted-foreground">
                            {opt}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt, i) => (
                        <label
                          key={i}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition-colors",
                            answers[q.id] === i
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/40"
                          )}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={answers[q.id] === i}
                            onChange={() =>
                              setAnswers((a) => ({ ...a, [q.id]: i }))
                            }
                            className="size-4 accent-primary"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-4 text-[12px] font-medium text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPhase("landing")}
                className="text-[13px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <Button onClick={submitRun} disabled={submitMut.isPending}>
                {submitMut.isPending ? "Submitting…" : "Submit answers"}
              </Button>
            </div>
          </>
        )}
      </div>
    )

    // The AI Interview runs as a focused full-viewport overlay (no dashboard chrome),
    // vertically centered so it isn't top-heavy with empty space below.
    return isAiInterview ? (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="flex min-h-full items-center justify-center">
          {inner}
        </div>
      </div>
    ) : (
      inner
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === "result" && result && run) {
    const isPersonality = !!result.traitScores
    const isPendingReview = result.pendingReview
    return (
      <div className="mx-auto max-w-md px-6 py-10 text-center">
        <StepBar parts={overview.parts} activeType={run.partType} applicationStatus={overview.applicationStatus} />
        <div
          className={cn(
            "mx-auto mt-6 mb-4 flex size-16 items-center justify-center rounded-full",
            result.passed ? "bg-green-500/10" : "bg-red-500/10"
          )}
        >
          <HugeiconsIcon
            icon={result.passed ? CheckmarkCircle01Icon : Cancel01Icon}
            size={32}
            strokeWidth={1.5}
            className={result.passed ? "text-green-500" : "text-red-500"}
          />
        </div>
        <h1 className="text-xl font-bold">
          {isPendingReview
            ? "Interview submitted"
            : isPersonality
              ? "Section complete"
              : result.passed
                ? "Passed!"
                : "Not passed"}
        </h1>

        {isPendingReview ? (
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your responses have been recorded — our team will review them and
            follow up.
          </p>
        ) : isPersonality && result.traitScores ? (
          <>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Thanks — here&apos;s your personality profile.
            </p>
            <div className="mt-5 space-y-2.5 text-left">
              {Object.entries(result.traitScores).map(([trait, value]) => (
                <div key={trait}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-medium">{traitLabel(trait)}</span>
                    <span className="text-muted-foreground">{value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-muted-foreground">
            You scored{" "}
            <span className="font-semibold text-foreground">
              {result.score}%
            </span>{" "}
            ({result.correctCount}/{result.total} correct)
            {result.minPassingScore != null &&
              ` — pass mark ${result.minPassingScore}%`}
            .
          </p>
        )}

        <div className="mt-7 flex flex-col gap-2">
          {result.passed ? (
            <Button onClick={() => setPhase("landing")}>
              Continue
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                strokeWidth={2}
                className="ml-1.5"
              />
            </Button>
          ) : result.canRetake ? (
            <Button
              onClick={() => beginPart(run.partType)}
              disabled={startMut.isPending}
            >
              {startMut.isPending ? "Loading…" : "Retake this part"}
            </Button>
          ) : (
            <p className="text-[13px] font-medium text-destructive">
              No retakes remaining.
            </p>
          )}
          <button
            type="button"
            onClick={() => setPhase("landing")}
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            Back to overview
          </button>
        </div>
      </div>
    )
  }

  // ── Landing ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href={slugHref("/dashboard/my-applications")}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
        My Applications
      </Link>

      <div className="mt-4">
        <h1 className="text-xl font-bold tracking-tight">Assessment</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {overview.jobTitle ? `${overview.jobTitle} · ` : ""}
          {overview.templateName}
        </p>
      </div>

      <div className="mt-5">
        <StepBar parts={overview.parts} activeType={landingActiveType} applicationStatus={overview.applicationStatus} />
      </div>

      {/* Offer call-to-action — the candidate reviews and signs their contract here. */}
      {(overview.applicationStatus === "OFFER" ||
        overview.applicationStatus === "HIRED") && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-green-300 bg-green-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-green-900/40 dark:bg-green-900/20">
          <div className="flex items-center gap-2 text-[13px] font-medium text-green-700 dark:text-green-400">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} strokeWidth={2} />
            {overview.applicationStatus === "OFFER"
              ? "You have an employment offer! Review the contract and sign to accept."
              : "You're hired — view your signed contract anytime."}
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-green-600 hover:bg-green-700"
            onClick={() => setShowOffer(true)}
          >
            {overview.applicationStatus === "OFFER"
              ? "Review & sign offer"
              : "View offer"}
          </Button>
        </div>
      )}

      {overview.applicationStatus === "REJECTED" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          Thank you for your interest. After careful review, we&apos;ve decided
          not to move forward with your application at this time.
        </div>
      )}

      {overview.completed && overview.applicationStatus !== "OFFER" && overview.applicationStatus !== "HIRED" && overview.applicationStatus !== "REJECTED" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-medium text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400">
          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            size={16}
            strokeWidth={2}
          />
          You&apos;ve completed all required parts. We&apos;ll be in touch with
          next steps.
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-[12px] text-muted-foreground">
        <p className="font-semibold text-foreground">Before you begin</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          <li>
            Complete each part in order — you must pass a part to unlock the
            next.
          </li>
          <li>
            If you don&apos;t reach the pass mark, you can retake that part.
          </li>
          <li>Answer honestly; some parts are timed.</li>
        </ul>
      </div>

      {error && (
        <p className="mt-4 text-[12px] font-medium text-destructive">{error}</p>
      )}

      {/* Parts */}
      <div className="mt-5 space-y-3">
        {overview.parts.map((part) => (
          <PartCard
            key={part.type}
            part={part}
            busy={startMut.isPending}
            appClosed={
              overview.applicationStatus === "REJECTED" ||
              overview.applicationStatus === "WITHDRAWN"
            }
            onStart={() => beginPart(part.type)}
          />
        ))}
      </div>

      {showOffer && (
        <OfferReviewModal
          applicationId={applicationId}
          onClose={() => setShowOffer(false)}
        />
      )}
    </div>
  )
}

function traitLabel(t: string) {
  return t.charAt(0) + t.slice(1).toLowerCase()
}

/** Immersive progress stepper across the assessment parts and the hiring tail. */
function StepBar({
  parts,
  activeType,
  applicationStatus,
}: {
  parts: PartOverview[]
  activeType: AssessmentPartType | null
  applicationStatus?: string | null
}) {
  // Hiring tail (Shortlisted → Offer → Hired) from the coarse application status.
  const rank =
    applicationStatus === "HIRED"
      ? 3
      : applicationStatus === "OFFER"
        ? 2
        : applicationStatus === "SHORTLISTED"
          ? 1
          : 0
  // Offer is "current" while pending the candidate; both turn green only once HIRED. Shortlist is an
  // optional side-action (not a sequential gate), so it isn't shown as a step here.
  const tail = [
    {
      key: "OFFER",
      label: "Offer",
      done: rank >= 3,
      current: applicationStatus === "OFFER",
      rejected: applicationStatus === "OFFER_DECLINED",
    },
    { key: "HIRED", label: "Hired", done: rank >= 3, current: false, rejected: false },
  ]
  const lastPartCleared = parts.length > 0 && partCleared(parts[parts.length - 1])
  return (
    <div className="overflow-x-auto py-2">
      <div className="flex w-full items-start">
        {parts.map((p, i) => {
          const isHuman =
            p.type === "HR_INTERVIEW" || p.type === "FINAL_INTERVIEW"
          const skipped = isHuman && p.stageStatus === "SKIPPED"
          const done =
            p.passed === true || (isHuman && p.stageStatus === "PASSED")
          // Current = the part being taken, or the first stage that isn't cleared yet.
          const current =
            p.type === activeType ||
            (!done &&
              !skipped &&
              i === parts.findIndex((x) => !partCleared(x)))
          const connectorActive = i > 0 && partCleared(parts[i - 1])
          return (
            <Fragment key={p.type}>
              {i > 0 && (
                <div
                  className={cn(
                    "mt-4 h-0.5 min-w-3 flex-1",
                    connectorActive ? "bg-green-500" : "bg-border"
                  )}
                />
              )}
              <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-[12px] font-semibold transition-colors",
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : skipped
                        ? "border-dashed border-muted-foreground/40 bg-muted text-muted-foreground"
                        : current
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground"
                  )}
                >
                  {done ? (
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={16}
                      strokeWidth={2.5}
                    />
                  ) : skipped ? (
                    "–"
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-center text-[11px] leading-tight font-medium",
                    current || done
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {STEP_LABEL[p.type]}
                </span>
                {skipped ? (
                  <span className="text-[9px] text-muted-foreground">
                    Skipped
                  </span>
                ) : current && !done ? (
                  <span className="text-[9px] font-medium text-primary">
                    Current
                  </span>
                ) : null}
              </div>
            </Fragment>
          )
        })}

        {/* Hiring tail — Shortlisted → Offer → Hired */}
        {tail.map((t, ti) => {
          const connectorActive = ti === 0 ? lastPartCleared : tail[ti - 1].done
          return (
            <Fragment key={t.key}>
              <div
                className={cn(
                  "mt-4 h-0.5 min-w-3 flex-1",
                  connectorActive ? "bg-green-500" : "bg-border"
                )}
              />
              <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-[12px] font-semibold transition-colors",
                    t.done
                      ? "border-green-500 bg-green-500 text-white"
                      : t.rejected
                        ? "border-red-500 bg-red-500 text-white"
                        : t.current
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground"
                  )}
                >
                  {t.done ? (
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={16}
                      strokeWidth={2.5}
                    />
                  ) : t.rejected ? (
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={16}
                      strokeWidth={2.5}
                    />
                  ) : (
                    parts.length + ti + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-center text-[11px] leading-tight font-medium",
                    t.done || t.current || t.rejected
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {t.label}
                </span>
                {t.current ? (
                  <span className="text-[9px] font-medium text-primary">
                    Current
                  </span>
                ) : t.rejected ? (
                  <span className="text-[9px] font-medium text-destructive">
                    Declined
                  </span>
                ) : null}
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

/** Short labels for the compact step bar (PART_TYPE_LABEL is the full form used elsewhere). */
const STEP_LABEL: Record<AssessmentPartType, string> = {
  BASIC_QA: "Assessment",
  PERSONALITY: "Personality",
  AI_INTERVIEW: "HR AI",
  AI_TECHNICAL_INTERVIEW: "Technical AI",
  HR_INTERVIEW: "Live",
  FINAL_INTERVIEW: "Final",
}

/** A part counts as "cleared" (chain continues) when passed, or a human stage Passed/Skipped. */
function partCleared(p: PartOverview) {
  const isHuman = p.type === "HR_INTERVIEW" || p.type === "FINAL_INTERVIEW"
  return (
    p.passed === true ||
    (isHuman && (p.stageStatus === "PASSED" || p.stageStatus === "SKIPPED"))
  )
}

function PartCard({
  part,
  busy,
  appClosed,
  onStart,
}: {
  part: PartOverview
  busy: boolean
  /** Application is terminally closed (rejected/withdrawn) — no part is still actionable. */
  appClosed: boolean
  onStart: () => void
}) {
  const passed = part.passed === true
  const awaiting = part.awaitingReview
  const locked = !part.available
  const isAi =
    part.type === "AI_INTERVIEW" || part.type === "AI_TECHNICAL_INTERVIEW"
  // passed===false means failed (scored parts → retake) or rejected (AI interviews → terminal).
  const failed = part.attempted && part.passed === false
  const retake = failed && !isAi
  // Human-run stages (Live/Final) carry their status separately (HR-set).
  const isHuman =
    part.type === "HR_INTERVIEW" || part.type === "FINAL_INTERVIEW"
  const stageSkipped = part.stageStatus === "SKIPPED"
  const stagePassed = part.stageStatus === "PASSED"
  const stageRejected = part.stageStatus === "REJECTED"
  // Human stage the reviewer has marked as held and now under review (HR set it to "Under review").
  const stageUnderReview = part.stageStatus === "UNDER_REVIEW"
  // Application is closed and this part was never cleared — it's moot now, so show it as "Not
  // selected" rather than leaving a stale "Under review"/"Coming soon" badge on it.
  const closedOut = appClosed && !passed && !stagePassed && !stageSkipped

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
        locked && "opacity-60"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-semibold">
            {PART_TYPE_LABEL[part.type]}
          </p>
          {passed && (
            <StatusBadge variant="green">
              Passed{part.lastScore != null ? ` · ${part.lastScore}%` : ""}
            </StatusBadge>
          )}
          {closedOut && (
            <StatusBadge variant="red">Not selected</StatusBadge>
          )}
          {awaiting && !closedOut && (
            <StatusBadge variant="amber">Under review</StatusBadge>
          )}
          {failed && isAi && !closedOut && (
            <StatusBadge variant="red">Not selected</StatusBadge>
          )}
          {retake && !closedOut && (
            <StatusBadge variant="red">Retake needed</StatusBadge>
          )}
          {isHuman && stagePassed && (
            <StatusBadge variant="green">Passed</StatusBadge>
          )}
          {isHuman && stageRejected && (
            <StatusBadge variant="red">Not selected</StatusBadge>
          )}
          {isHuman && stageSkipped && (
            <StatusBadge variant="gray" dot={false}>
              Skipped
            </StatusBadge>
          )}
          {isHuman && stageUnderReview && !closedOut && (
            <StatusBadge variant="amber">Under review</StatusBadge>
          )}
          {isHuman &&
            part.meetingLink &&
            !stagePassed &&
            !stageRejected &&
            !stageSkipped &&
            !stageUnderReview &&
            !closedOut && (
              <StatusBadge variant="blue">Scheduled</StatusBadge>
            )}
          {!part.runnable &&
            !passed &&
            !awaiting &&
            !closedOut &&
            !(
              isHuman &&
              (stagePassed ||
                stageRejected ||
                stageSkipped ||
                stageUnderReview ||
                part.meetingLink)
            ) && (
              <StatusBadge variant="gray" dot={false}>
                Coming soon
              </StatusBadge>
            )}
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {part.questionCount} question{part.questionCount !== 1 ? "s" : ""}
          {part.minPassingScore != null && ` · pass ${part.minPassingScore}%`}
          {part.attemptsUsed > 0 &&
            ` · ${part.attemptsUsed} attempt${part.attemptsUsed !== 1 ? "s" : ""}`}
          {part.gated ? " · required" : " · optional"}
        </p>

        {/* Scheduled human interview: meeting link + details for the candidate. */}
        {isHuman && !stageSkipped && (part.meetingLink || part.stageNotes) && (
          <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
            {part.meetingLink && (
              <a
                href={part.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
              >
                <HugeiconsIcon icon={Video01Icon} size={13} strokeWidth={1.8} />
                Join meeting
                {part.scheduledAt
                  ? ` · ${new Date(part.scheduledAt).toLocaleString()}`
                  : ""}
              </a>
            )}
            {part.stageNotes && (
              <p className="mt-1 text-[11px] whitespace-pre-line text-muted-foreground">
                {part.stageNotes}
              </p>
            )}
          </div>
        )}

        {/* AI interview feedback — shown to the candidate once their interview is graded. */}
        {isAi && part.aiSummary && (
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Interview feedback
              </p>
              {part.aiScore != null && (
                <span className="text-[11px] font-semibold text-primary">
                  {part.aiScore}%
                </span>
              )}
            </div>
            <p className="text-[12px] leading-relaxed text-foreground/90">
              {part.aiSummary}
            </p>
            {part.aiStrengths && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-green-700 dark:text-green-400">
                <span className="font-semibold">＋ Strengths · </span>
                {part.aiStrengths}
              </p>
            )}
            {part.aiImprovements && (
              <p className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                <span className="font-semibold">－ To improve · </span>
                {part.aiImprovements}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0">
        {appClosed && !passed && !stagePassed && !stageSkipped ? (
          <span className="text-[12px] font-medium text-muted-foreground">
            Closed
          </span>
        ) : locked ? (
          <span className="text-[12px] text-muted-foreground">Locked</span>
        ) : awaiting ? (
          <span className="text-[12px] font-medium text-amber-600 dark:text-amber-400">
            Awaiting review
          </span>
        ) : failed && isAi ? (
          <span className="text-[12px] font-medium text-destructive">
            Not selected
          </span>
        ) : isHuman ? (
          stagePassed ? (
            <span className="flex items-center gap-1 text-[12px] font-medium text-green-600 dark:text-green-400">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={14}
                strokeWidth={2}
              />
              Done
            </span>
          ) : stageRejected ? (
            <span className="text-[12px] font-medium text-destructive">
              Not selected
            </span>
          ) : stageSkipped ? (
            <span className="text-[12px] text-muted-foreground">Skipped</span>
          ) : stageUnderReview ? (
            <span className="text-[12px] font-medium text-amber-600 dark:text-amber-400">
              Under review
            </span>
          ) : part.meetingLink ? (
            <span className="text-[12px] font-medium text-blue-600 dark:text-blue-400">
              Scheduled
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">
              Available later
            </span>
          )
        ) : !part.runnable ? (
          <span className="text-[12px] text-muted-foreground">
            Available later
          </span>
        ) : passed ? (
          <span className="flex items-center gap-1 text-[12px] font-medium text-green-600 dark:text-green-400">
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={14}
              strokeWidth={2}
            />
            Done
          </span>
        ) : (
          <Button size="sm" onClick={onStart} disabled={busy}>
            {retake ? "Retake" : "Start"}
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
  )
}
