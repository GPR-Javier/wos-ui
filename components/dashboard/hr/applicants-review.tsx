"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/custom/status-badge"
import { RichTextEditor } from "@/components/custom/rich-text-editor"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Briefcase01Icon,
  File01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import {
  useReviewList,
  useReviewDetail,
  useSetApplicationStatus,
  useGradeApplication,
  useSaveReview,
  useEnhanceComment,
  useReviewCoverLetter,
  useReviewResume,
  useSaveResumeText,
  useSuggestRejection,
} from "@/hooks/use-review"
import {
  type ApplicationStatus,
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_VARIANT,
} from "@/lib/application-api"

const FILTERS: { label: string; value: ApplicationStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Under review", value: "UNDER_REVIEW" },
  { label: "Assessment", value: "ASSESSMENT" },
  { label: "Shortlisted", value: "SHORTLISTED" },
  { label: "Offer", value: "OFFER" },
  { label: "Hired", value: "HIRED" },
  { label: "Not selected", value: "REJECTED" },
]

const ACTIONS: {
  label: string
  status: ApplicationStatus
  variant: "default" | "outline" | "destructive"
}[] = [
  { label: "Shortlist", status: "SHORTLISTED", variant: "default" },
  { label: "Make offer", status: "OFFER", variant: "default" },
  { label: "Mark hired", status: "HIRED", variant: "outline" },
  { label: "Reject", status: "REJECTED", variant: "destructive" },
]

/** True when rich-text HTML has no real content (e.g. "" or "<p></p>"). */
function htmlIsEmpty(html: string) {
  return !html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
}

function traitLabel(t: string) {
  return t.charAt(0) + t.slice(1).toLowerCase()
}

export function ApplicantsReviewSection() {
  const [filter, setFilter] = useState<ApplicationStatus | "">("UNDER_REVIEW")
  const [minBasic, setMinBasic] = useState(0)
  const [minInterview, setMinInterview] = useState(0)
  const [minCover, setMinCover] = useState(0)
  const [minResume, setMinResume] = useState(0)
  const [minOverall, setMinOverall] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { data: applications = [], isLoading } = useReviewList(
    filter || undefined
  )

  // Threshold filters: a metric passes if its slider is 0, or the score exists and meets it.
  const meets = (score: number | null, min: number) =>
    min === 0 || (score != null && score >= min)
  const visible = applications.filter(
    (a) =>
      meets(a.basicScore, minBasic) &&
      meets(a.interviewScore, minInterview) &&
      meets(a.coverLetterScore, minCover) &&
      meets(a.resumeScore, minResume) &&
      meets(a.overall, minOverall)
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Applicants</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Review candidates&apos; assessment results and move them through the
          pipeline.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Min score filters
            </p>
            {(minBasic || minInterview || minCover || minResume || minOverall) >
              0 && (
              <button
                type="button"
                onClick={() => {
                  setMinBasic(0)
                  setMinInterview(0)
                  setMinCover(0)
                  setMinResume(0)
                  setMinOverall(0)
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
          <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            <ThresholdSlider
              label="Q&A"
              value={minBasic}
              onChange={setMinBasic}
            />
            <ThresholdSlider
              label="Interview"
              value={minInterview}
              onChange={setMinInterview}
            />
            <ThresholdSlider
              label="Cover letter"
              value={minCover}
              onChange={setMinCover}
            />
            <ThresholdSlider
              label="Résumé"
              value={minResume}
              onChange={setMinResume}
            />
            <ThresholdSlider
              label="Overall"
              value={minOverall}
              onChange={setMinOverall}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-[13px] text-muted-foreground">
          {applications.length === 0
            ? "No applicants in this view."
            : "No applicants meet the score threshold."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-border bg-muted/40 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5">Applicant</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-center">Q&amp;A</th>
                <th className="px-3 py-2.5 text-center">Interview</th>
                <th className="px-3 py-2.5 text-center">Cover&nbsp;letter</th>
                <th className="px-3 py-2.5 text-center">Résumé</th>
                <th className="px-3 py-2.5 text-center">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visible.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                        {(a.applicantName ?? a.applicantEmail)
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {a.applicantName ?? a.applicantEmail}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {a.applicantEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <span className="line-clamp-1">{a.jobTitle ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge variant={APPLICATION_STATUS_VARIANT[a.status]}>
                      {APPLICATION_STATUS_LABEL[a.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ScoreCell value={a.basicScore} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ScoreCell
                      value={a.interviewScore}
                      pending={a.interviewSubmitted}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ScoreCell value={a.coverLetterScore} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ScoreCell value={a.resumeScore} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ScoreCell value={a.overall} strong />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId != null && (
        <ReviewDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function ReviewDetailModal({
  id,
  onClose,
}: {
  id: number
  onClose: () => void
}) {
  const { data: detail, isLoading } = useReviewDetail(id)
  const statusMut = useSetApplicationStatus()
  const gradeMut = useGradeApplication()
  const [gradeError, setGradeError] = useState<string | null>(null)
  const reviewMut = useSaveReview()
  const enhanceMut = useEnhanceComment()
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  // Per-question human review: comment text + whether the reviewer opened the toggle, keyed by index.
  const [comments, setComments] = useState<Record<number, string>>({})
  const [openReview, setOpenReview] = useState<Record<number, boolean>>({})
  // Seed once per applicant (won't clobber edits on refetch of the same id).
  useEffect(() => {
    const c: Record<number, string> = {}
    const o: Record<number, boolean> = {}
    detail?.interviewAnswers?.forEach((a, i) => {
      c[i] = a.reviewerComment ?? ""
      o[i] = !!a.reviewerComment
    })
    setComments(c)
    setOpenReview(o)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id])
  const coverMut = useReviewCoverLetter()
  const [coverError, setCoverError] = useState<string | null>(null)
  const resumeMut = useReviewResume()
  const [resumeError, setResumeError] = useState<string | null>(null)
  const saveResumeMut = useSaveResumeText()
  const [showResumeEditor, setShowResumeEditor] = useState(false)
  // Uncontrolled textarea; keyed by applicant id so it resets per candidate.
  const resumeRef = useRef<HTMLTextAreaElement>(null)
  // Reject flow captures a reason the candidate will see.
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const suggestRejectionMut = useSuggestRejection()
  const [suggestError, setSuggestError] = useState<string | null>(null)

  function handleSuggestReason() {
    setSuggestError(null)
    const draft = htmlIsEmpty(rejectReason) ? undefined : rejectReason
    suggestRejectionMut.mutate(
      { id, text: draft },
      {
        onSuccess: (reason) => {
          if (reason) setRejectReason(reason)
        },
        onError: () =>
          setSuggestError("AI is unavailable right now. Please try again."),
      }
    )
  }

  function handleReject() {
    if (!detail) return
    statusMut.mutate(
      {
        id: detail.id,
        status: "REJECTED",
        note: htmlIsEmpty(rejectReason) ? undefined : rejectReason,
      },
      {
        onSuccess: () => {
          setRejecting(false)
          setRejectReason("")
        },
      }
    )
  }

  function handleSaveResumeText() {
    setResumeError(null)
    const text = resumeRef.current?.value.trim() ?? ""
    if (!text) return
    saveResumeMut.mutate(
      { id, text },
      { onError: () => setResumeError("Couldn't save the resume text.") }
    )
  }

  function handleGrade() {
    setGradeError(null)
    gradeMut.mutate(id, {
      onError: (e: unknown) => {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "AI grading failed — is Ollama running?"
        setGradeError(msg)
      },
    })
  }

  // Per-question comments aligned by index to the interview's questions (blank = not reviewed).
  function commentsPayload(): string[] {
    const n = detail?.interviewAnswers?.length ?? 0
    return Array.from({ length: n }, (_, i) => (comments[i] ?? "").trim())
  }

  const hasAnyComment = commentsPayload().some((c) => c.length > 0)

  function handleSaveReview() {
    reviewMut.mutate({ id, payload: { reviewerComments: commentsPayload() } })
  }

  // Persist the reviewer's notes first, then re-run AI grading so each question folds in its note.
  function handleRegradeWithNotes() {
    setGradeError(null)
    reviewMut.mutate(
      { id, payload: { reviewerComments: commentsPayload() } },
      { onSuccess: () => handleGrade() }
    )
  }

  function toggleReview(i: number) {
    setOpenReview((o) => ({ ...o, [i]: !o[i] }))
  }

  // AI-polish a single question's comment in place. enhancingIndex tracks which one is in flight.
  function handleEnhanceComment(i: number, question: string) {
    const text = (comments[i] ?? "").trim()
    if (!text) return
    setEnhanceError(null)
    setEnhancingIndex(i)
    enhanceMut.mutate(
      { id, text, question },
      {
        onSuccess: (enhanced) => {
          if (enhanced) setComments((c) => ({ ...c, [i]: enhanced }))
        },
        onError: () =>
          setEnhanceError("AI is unavailable right now. Please try again."),
        onSettled: () => setEnhancingIndex(null),
      }
    )
  }

  function handleReviewCover() {
    setCoverError(null)
    coverMut.mutate(id, {
      onError: (e: unknown) => {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "AI review failed — is Ollama running?"
        setCoverError(msg)
      },
    })
  }

  function handleReviewResume() {
    setResumeError(null)
    resumeMut.mutate(id, {
      onError: (e: unknown) => {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "AI review failed — is Ollama running?"
        setResumeError(msg)
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl animate-in overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
        </button>

        {isLoading || !detail ? (
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-[14px] font-bold text-primary">
                {(detail.applicantName ?? detail.applicantEmail)
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[16px] font-semibold">
                    {detail.applicantName ?? detail.applicantEmail}
                  </h2>
                  <StatusBadge
                    variant={APPLICATION_STATUS_VARIANT[detail.status]}
                  >
                    {APPLICATION_STATUS_LABEL[detail.status]}
                  </StatusBadge>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {detail.applicantEmail}
                </p>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon
                  icon={Briefcase01Icon}
                  size={13}
                  strokeWidth={1.8}
                />
                {detail.jobTitle ?? "—"}
                {detail.department ? ` · ${detail.department}` : ""}
              </span>
              {detail.applicantPhone && <span>{detail.applicantPhone}</span>}
              {detail.resumeFileName && (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={File01Icon}
                    size={13}
                    strokeWidth={1.8}
                  />
                  {detail.resumeFileName}
                </span>
              )}
            </div>

            {detail.status === "REJECTED" && detail.rejectionReason && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-[11px] font-semibold tracking-wider text-destructive uppercase">
                  Rejection email
                </p>
                <div
                  className="rte-content mt-1.5 text-[13px] text-foreground"
                  dangerouslySetInnerHTML={{ __html: detail.rejectionReason }}
                />
              </div>
            )}

            {detail.message && (
              <div className="mt-4 rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Cover Letter
                  </p>
                  <div className="flex items-center gap-2">
                    {detail.coverLetterScore != null && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        AI score {detail.coverLetterScore}%
                      </span>
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleReviewCover}
                      disabled={coverMut.isPending}
                    >
                      {coverMut.isPending
                        ? "Reviewing…"
                        : detail.coverLetterFeedback
                          ? "Re-review"
                          : "AI review"}
                    </Button>
                  </div>
                </div>
                {coverError && (
                  <p className="mb-2 text-[11px] font-medium text-destructive">
                    {coverError}
                  </p>
                )}
                <p className="max-h-40 overflow-y-auto text-[12px] whitespace-pre-line text-muted-foreground">
                  {detail.message}
                </p>
                {(detail.coverLetterFeedback ||
                  detail.coverLetterImprovements) && (
                  <div className="mt-2 space-y-1.5">
                    {detail.coverLetterFeedback && (
                      <FeedbackNote
                        tone="pos"
                        label="Strengths"
                        text={detail.coverLetterFeedback}
                      />
                    )}
                    {detail.coverLetterImprovements && (
                      <FeedbackNote
                        tone="neg"
                        label="To improve"
                        text={detail.coverLetterImprovements}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Resume */}
            {detail.resumeFileName && (
              <div className="mt-4 rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Résumé
                  </p>
                  <div className="flex items-center gap-2">
                    {detail.resumeScore != null && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        AI score {detail.resumeScore}%
                      </span>
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleReviewResume}
                      disabled={resumeMut.isPending || !detail.hasResumeText}
                      title={
                        detail.hasResumeText
                          ? undefined
                          : "No readable resume text — applicant must re-apply"
                      }
                    >
                      {resumeMut.isPending
                        ? "Reviewing…"
                        : detail.resumeFeedback
                          ? "Re-review"
                          : "AI review"}
                    </Button>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <HugeiconsIcon
                    icon={File01Icon}
                    size={13}
                    strokeWidth={1.8}
                  />
                  {detail.resumeFileName}
                </p>
                {!detail.hasResumeText && !showResumeEditor && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    No readable text in this PDF (image/design export) — paste
                    the résumé text to enable AI review.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowResumeEditor((v) => !v)}
                  className="mt-1 text-[11px] font-medium text-primary hover:underline"
                >
                  {showResumeEditor
                    ? "Hide text"
                    : detail.hasResumeText
                      ? "Edit extracted text"
                      : "Paste résumé text"}
                </button>
                {showResumeEditor && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      key={detail.id}
                      ref={resumeRef}
                      rows={6}
                      defaultValue={detail.resumeText ?? ""}
                      placeholder="Paste the résumé text here…"
                      className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-[12px] focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleSaveResumeText}
                      disabled={saveResumeMut.isPending}
                    >
                      {saveResumeMut.isPending ? "Saving…" : "Save text"}
                    </Button>
                  </div>
                )}
                {resumeError && (
                  <p className="mt-2 text-[11px] font-medium text-destructive">
                    {resumeError}
                  </p>
                )}
                {(detail.resumeFeedback || detail.resumeImprovements) && (
                  <div className="mt-2 space-y-1.5">
                    {detail.resumeFeedback && (
                      <FeedbackNote
                        tone="pos"
                        label="Strengths"
                        text={detail.resumeFeedback}
                      />
                    )}
                    {detail.resumeImprovements && (
                      <FeedbackNote
                        tone="neg"
                        label="To improve"
                        text={detail.resumeImprovements}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {detail.hasAssessment ? (
              <div className="mt-5 space-y-4">
                {detail.basicScore != null && (
                  <ResultCard title="Basic Q&A">
                    <span className="text-[13px]">
                      Score{" "}
                      <span className="font-semibold">
                        {detail.basicScore}%
                      </span>
                      {detail.basicPassed != null && (
                        <span
                          className={cn(
                            "ml-2 font-medium",
                            detail.basicPassed
                              ? "text-green-600 dark:text-green-400"
                              : "text-destructive"
                          )}
                        >
                          {detail.basicPassed ? "Passed" : "Failed"}
                        </span>
                      )}
                    </span>
                  </ResultCard>
                )}

                {detail.traitScores &&
                  Object.keys(detail.traitScores).length > 0 && (
                    <ResultCard title="Personality (Big Five)">
                      <div className="space-y-2">
                        {Object.entries(detail.traitScores).map(
                          ([trait, value]) => (
                            <div key={trait}>
                              <div className="mb-1 flex items-center justify-between text-[12px]">
                                <span>{traitLabel(trait)}</span>
                                <span className="text-muted-foreground">
                                  {value}%
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${value}%` }}
                                />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </ResultCard>
                  )}

                {detail.interviewAnswers &&
                  detail.interviewAnswers.length > 0 && (
                    <div className="rounded-xl border border-border p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                          AI Interview
                        </p>
                        <div className="flex items-center gap-2">
                          {detail.aiGraded && detail.aiScore != null && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              AI score {detail.aiScore}%
                            </span>
                          )}
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={handleGrade}
                            disabled={gradeMut.isPending || reviewMut.isPending}
                          >
                            {gradeMut.isPending
                              ? "Grading…"
                              : detail.aiGraded
                                ? "Re-grade"
                                : "Grade with AI"}
                          </Button>
                        </div>
                      </div>
                      {gradeError && (
                        <p className="mb-2 text-[11px] font-medium text-destructive">
                          {gradeError}
                        </p>
                      )}
                      <div className="space-y-3">
                        {detail.interviewAnswers.map((qa, i) => (
                          <div key={i}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[12px] font-medium">
                                {qa.question}
                              </p>
                              {qa.aiScore != null && (
                                <span className="shrink-0 text-[11px] font-semibold text-primary">
                                  {qa.aiScore}%
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[12px] text-muted-foreground italic">
                              &ldquo;{qa.answer}&rdquo;
                            </p>
                            {(qa.aiFeedback || qa.aiImprovements) && (
                              <div className="mt-2 space-y-1.5">
                                {qa.aiFeedback && (
                                  <FeedbackNote
                                    tone="pos"
                                    label="Strengths"
                                    text={qa.aiFeedback}
                                  />
                                )}
                                {qa.aiImprovements && (
                                  <FeedbackNote
                                    tone="neg"
                                    label="To improve"
                                    text={qa.aiImprovements}
                                  />
                                )}
                              </div>
                            )}

                            {/* Optional per-question human review (toggle reveals the comment). */}
                            <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground select-none">
                              <input
                                type="checkbox"
                                checked={openReview[i] ?? false}
                                onChange={() => toggleReview(i)}
                                className="size-3.5 accent-violet-600"
                              />
                              Human review
                            </label>
                            {openReview[i] && (
                              <div className="mt-1.5">
                                <textarea
                                  rows={2}
                                  value={comments[i] ?? ""}
                                  onChange={(e) =>
                                    setComments((c) => ({
                                      ...c,
                                      [i]: e.target.value,
                                    }))
                                  }
                                  placeholder="Your comment on this answer — what the AI missed, follow-ups for the human interview, etc."
                                  className="w-full resize-y rounded-lg border border-violet-500/40 bg-violet-500/5 px-3 py-2 text-[12px] focus:ring-2 focus:ring-ring focus:outline-none"
                                />
                                <div className="mt-1 flex justify-end">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    className="gap-1.5"
                                    disabled={
                                      enhancingIndex === i ||
                                      !(comments[i] ?? "").trim()
                                    }
                                    onClick={() =>
                                      handleEnhanceComment(i, qa.question)
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={SparklesIcon}
                                      size={12}
                                      strokeWidth={1.8}
                                    />
                                    {enhancingIndex === i
                                      ? "Enhancing…"
                                      : "Enhance"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {enhanceError && (
                        <p className="mt-2 text-[11px] font-medium text-destructive">
                          {enhanceError}
                        </p>
                      )}

                      {/* Review actions — comments are per-question above; this saves them together. */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        <span className="text-[10px] text-muted-foreground">
                          {detail.reviewedBy
                            ? `Reviewed by ${detail.reviewedBy}${
                                detail.reviewedAt
                                  ? ` · ${new Date(detail.reviewedAt).toLocaleDateString()}`
                                  : ""
                              }`
                            : "Optional — tick “Human review” on any question to add a comment."}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={handleSaveReview}
                            disabled={reviewMut.isPending || gradeMut.isPending}
                          >
                            {reviewMut.isPending && !gradeMut.isPending
                              ? "Saving…"
                              : "Save review"}
                          </Button>
                          <Button
                            size="xs"
                            onClick={handleRegradeWithNotes}
                            disabled={
                              reviewMut.isPending ||
                              gradeMut.isPending ||
                              !hasAnyComment
                            }
                            title={
                              hasAnyComment
                                ? undefined
                                : "Add a comment on a question first"
                            }
                          >
                            {gradeMut.isPending
                              ? "Re-grading…"
                              : "Re-grade with notes"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed py-8 text-center text-[13px] text-muted-foreground">
                This applicant hasn&apos;t taken the assessment yet.
              </div>
            )}

            {/* Status actions */}
            <div className="mt-6 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {ACTIONS.map((act) => (
                  <Button
                    key={act.status}
                    variant={
                      act.variant === "default"
                        ? "default"
                        : act.variant === "destructive"
                          ? "destructive"
                          : "outline"
                    }
                    size="sm"
                    disabled={
                      detail.status === act.status || statusMut.isPending
                    }
                    onClick={() => {
                      if (act.status === "REJECTED") {
                        setRejectReason(detail.rejectionReason ?? "")
                        setRejecting(true)
                      } else {
                        statusMut.mutate({ id: detail.id, status: act.status })
                      }
                    }}
                  >
                    {act.label}
                  </Button>
                ))}
              </div>

              {/* Reject reason capture */}
              {rejecting && (
                <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Label className="text-[12px] font-medium text-foreground">
                        Reason for rejection
                      </Label>
                      <p className="mt-0.5 mb-2 text-[11px] text-muted-foreground">
                        Shared with the candidate. They may reapply
                        {detail.status === "REJECTED"
                          ? " "
                          : " after any cooldown "}
                        once rejected.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      disabled={suggestRejectionMut.isPending}
                      onClick={handleSuggestReason}
                    >
                      <HugeiconsIcon
                        icon={SparklesIcon}
                        size={13}
                        strokeWidth={1.8}
                      />
                      {suggestRejectionMut.isPending
                        ? "Thinking…"
                        : htmlIsEmpty(rejectReason)
                          ? "Suggest"
                          : "Enhance"}
                    </Button>
                  </div>
                  {/* Rich-text editor — content is HTML so the note is email-ready. */}
                  <div
                    className={cn(
                      "rounded-lg bg-background",
                      suggestRejectionMut.isPending &&
                        "pointer-events-none opacity-60"
                    )}
                    aria-busy={suggestRejectionMut.isPending}
                  >
                    <RichTextEditor
                      value={rejectReason}
                      onChange={setRejectReason}
                      placeholder="Write the rejection email, or use Suggest to draft one…"
                    />
                  </div>
                  {suggestError && (
                    <p className="mt-1.5 text-[11px] text-destructive">
                      {suggestError}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={statusMut.isPending}
                      onClick={() => {
                        setRejecting(false)
                        setRejectReason("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={statusMut.isPending || suggestRejectionMut.isPending}
                      onClick={handleReject}
                    >
                      {statusMut.isPending ? "Rejecting…" : "Confirm rejection"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ThresholdSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-primary"
      />
      <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums">
        {value}%
      </span>
    </div>
  )
}

function ScoreCell({
  value,
  strong,
  pending,
}: {
  value: number | null
  strong?: boolean
  pending?: boolean
}) {
  if (value == null) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {pending ? "Pending" : "—"}
      </span>
    )
  }
  const color =
    value >= 70
      ? "text-green-600 dark:text-green-400"
      : value >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"
  return (
    <span
      className={cn(
        "tabular-nums",
        color,
        strong ? "text-[13px] font-bold" : "font-semibold"
      )}
    >
      {value}%
    </span>
  )
}

function FeedbackNote({
  tone,
  label,
  text,
}: {
  tone: "pos" | "neg"
  label: string
  text: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-[11px] leading-relaxed",
        tone === "pos"
          ? "border-green-500/30 bg-green-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      )}
    >
      <span
        className={cn(
          "font-semibold",
          tone === "pos"
            ? "text-green-700 dark:text-green-400"
            : "text-amber-700 dark:text-amber-400"
        )}
      >
        {tone === "pos" ? "＋ " : "－ "}
        {label}
      </span>
      <span className="mt-0.5 block text-foreground/85 italic">
        &ldquo;{text}&rdquo;
      </span>
    </div>
  )
}

function ResultCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}
