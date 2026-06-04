"use client"

import { Fragment, useEffect, useRef, useState } from "react"
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
  CheckmarkCircle01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons"
import {
  useReviewList,
  useReviewDetail,
  useSetApplicationStatus,
  useGradeApplication,
  useSaveReview,
  useEnhanceComment,
  useDecideInterview,
  useEditInterviewSummary,
  useUpsertStage,
  useReviewPipeline,
  useReviewCoverLetter,
  useReviewResume,
  useSaveResumeText,
  useSuggestRejection,
} from "@/hooks/use-review"
import type {
  ReviewInterviewBlock as ReviewInterviewBlockType,
  ReviewHumanStage,
  StageStatus,
} from "@/lib/review-api"
import type { AssessmentPartType } from "@/lib/assessment-api"
import type { PipelineStageStatus } from "@/lib/pipeline-api"
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
  const [minCover, setMinCover] = useState(0)
  const [minResume, setMinResume] = useState(0)
  const [minOverall, setMinOverall] = useState(0)
  // Per-stage interview status filters ("" = any).
  const [fHrAi, setFHrAi] = useState<StageStatus | "">("")
  const [fTechAi, setFTechAi] = useState<StageStatus | "">("")
  const [fLive, setFLive] = useState<StageStatus | "">("")
  const [fFinal, setFFinal] = useState<StageStatus | "">("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { data: applications = [], isLoading } = useReviewList(
    filter || undefined
  )

  // Threshold filters: a metric passes if its slider is 0, or the score exists and meets it.
  const meets = (score: number | null, min: number) =>
    min === 0 || (score != null && score >= min)
  // Stage filter: passes if "any" is selected, else the stage's status must match.
  const stageOk = (s: StageStatus | null, want: StageStatus | "") =>
    want === "" || s === want
  const hasStageFilter = !!(fHrAi || fTechAi || fLive || fFinal)
  const visible = applications.filter(
    (a) =>
      meets(a.basicScore, minBasic) &&
      meets(a.coverLetterScore, minCover) &&
      meets(a.resumeScore, minResume) &&
      meets(a.overall, minOverall) &&
      stageOk(a.hrAiStatus, fHrAi) &&
      stageOk(a.technicalAiStatus, fTechAi) &&
      stageOk(a.liveStatus, fLive) &&
      stageOk(a.finalStatus, fFinal)
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
              Filters
            </p>
            {(minBasic ||
              minCover ||
              minResume ||
              minOverall ||
              hasStageFilter) && (
              <button
                type="button"
                onClick={() => {
                  setMinBasic(0)
                  setMinCover(0)
                  setMinResume(0)
                  setMinOverall(0)
                  setFHrAi("")
                  setFTechAi("")
                  setFLive("")
                  setFFinal("")
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
          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Interview stage status
            </p>
            <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              <StageStatusFilter
                label="HR AI"
                value={fHrAi}
                onChange={setFHrAi}
              />
              <StageStatusFilter
                label="Technical AI"
                value={fTechAi}
                onChange={setFTechAi}
              />
              <StageStatusFilter
                label="Live"
                value={fLive}
                onChange={setFLive}
              />
              <StageStatusFilter
                label="Final"
                value={fFinal}
                onChange={setFFinal}
              />
            </div>
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
                <th className="px-3 py-2.5 text-center">HR&nbsp;AI</th>
                <th className="px-3 py-2.5 text-center">Tech&nbsp;AI</th>
                <th className="px-3 py-2.5 text-center">Live</th>
                <th className="px-3 py-2.5 text-center">Final</th>
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
                    <StageStatusCell
                      status={a.hrAiStatus}
                      score={a.hrAiScore}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StageStatusCell
                      status={a.technicalAiStatus}
                      score={a.technicalAiScore}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StageStatusCell status={a.liveStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StageStatusCell status={a.finalStatus} />
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
  const { data: pipeline } = useReviewPipeline(id)
  const [activeTab, setActiveTab] = useState("BASIC")
  // Reset to Basic immediately when switching applicants (before the new pipeline loads).
  useEffect(() => setActiveTab("BASIC"), [id])
  // Tabs: Basic Information + each enabled interview/human stage (from the job's pipeline).
  const tabs: ReviewTab[] = [
    {
      key: "BASIC",
      label: "Basic Information",
      // Completed once the candidate has taken the assessment (Q&A + personality).
      status: detail?.hasAssessment ? "PASSED" : null,
    },
    ...(pipeline?.stages ?? [])
      .filter((s) => INTERVIEW_TAB_KEYS.includes(s.key))
      .map((s) => ({ key: s.key, label: s.label, status: s.status })),
  ]
  // Once the pipeline loads, open on the stage that needs attention: the first stage
  // awaiting the reviewer's decision (UNDER_REVIEW), else the first not-yet-cleared stage.
  // Guarded so it only auto-selects once per applicant — manual tab clicks aren't overridden.
  const autoSelectedFor = useRef<number | null>(null)
  useEffect(() => {
    if (!pipeline || autoSelectedFor.current === id) return
    autoSelectedFor.current = id
    const stageTabs = tabs.filter((t) => t.key !== "BASIC")
    const target =
      stageTabs.find((t) => t.status === "UNDER_REVIEW") ??
      stageTabs.find(
        (t) =>
          t.status !== "PASSED" &&
          t.status !== "SKIPPED" &&
          t.status !== "REJECTED"
      )
    if (target) setActiveTab(target.key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline, id])
  const statusMut = useSetApplicationStatus()
  const decideMut = useDecideInterview()
  const upsertMut = useUpsertStage()
  // Footer actions are contextual to the active stage tab.
  const stageKeys = tabs.filter((t) => t.key !== "BASIC").map((t) => t.key)
  const lastStageKey = stageKeys[stageKeys.length - 1]
  const isStageTab = activeTab !== "BASIC"
  const isLastStage = activeTab === lastStageKey
  const isAiStage =
    activeTab === "AI_INTERVIEW" || activeTab === "AI_TECHNICAL_INTERVIEW"
  const isHumanStage =
    activeTab === "HR_INTERVIEW" || activeTab === "FINAL_INTERVIEW"
  const stageBusy = decideMut.isPending || upsertMut.isPending
  // A stage already passed/skipped/rejected is decided — hide its Pass & Skip actions.
  const activeStatus = tabs.find((t) => t.key === activeTab)?.status ?? null
  const stageDecided =
    activeStatus === "PASSED" ||
    activeStatus === "SKIPPED" ||
    activeStatus === "REJECTED"

  function advanceTab() {
    const next = stageKeys[stageKeys.indexOf(activeTab) + 1]
    if (next) setActiveTab(next)
  }
  // "Pass": mark the active stage passed (which unlocks the next), then move to it.
  function passAndContinue() {
    if (isAiStage) {
      decideMut.mutate(
        { id, partType: activeTab as AssessmentPartType, decision: "PASSED" },
        { onSuccess: advanceTab }
      )
    } else if (isHumanStage) {
      upsertMut.mutate(
        { id, stageType: activeTab as AssessmentPartType, payload: { status: "PASSED" } },
        { onSuccess: advanceTab }
      )
    }
  }
  // "Skip": optional human stages can be bypassed; mark SKIPPED and move on.
  function skipStage() {
    upsertMut.mutate(
      { id, stageType: activeTab as AssessmentPartType, payload: { status: "SKIPPED" } },
      { onSuccess: advanceTab }
    )
  }
  function openReject() {
    setRejectReason(detail?.rejectionReason ?? "")
    setRejecting(true)
  }
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
      <div className="relative flex max-h-[90vh] w-full max-w-3xl animate-in flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
        </button>

        {isLoading || !detail ? (
          <div className="m-6 h-64 animate-pulse rounded-xl bg-muted" />
        ) : (
          <>
            {/* Pinned header: identity + meta + tab bar */}
            <div className="shrink-0 border-b border-border px-6 pt-6 pb-4">
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

            {/* Tab / step bar */}
            <div className="mt-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
              <ReviewTabBar
                tabs={tabs}
                active={activeTab}
                onSelect={setActiveTab}
              />
            </div>
            </div>

            {/* Scrollable tab content (min-h-0 lets the flex child shrink so it actually scrolls) */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {activeTab === "BASIC" && (
              <>
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

              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed py-8 text-center text-[13px] text-muted-foreground">
                This applicant hasn&apos;t taken the assessment yet.
              </div>
            )}
              </>
            )}

            {/* AI interview stage tab */}
            {(activeTab === "AI_INTERVIEW" ||
              activeTab === "AI_TECHNICAL_INTERVIEW") &&
              (() => {
                const block = detail.interviews?.find(
                  (b) => b.partType === activeTab
                )
                return (
                  <div className="mt-4">
                    {block ? (
                      <InterviewReviewBlock applicationId={id} block={block} />
                    ) : (
                      <div className="rounded-xl border border-dashed py-8 text-center text-[13px] text-muted-foreground">
                        The candidate hasn&apos;t taken this interview yet.
                      </div>
                    )}
                  </div>
                )
              })()}

            {/* Human interview stage tab */}
            {(activeTab === "HR_INTERVIEW" ||
              activeTab === "FINAL_INTERVIEW") && (
              <div className="mt-4">
                <HumanStagePanel
                  applicationId={id}
                  stageType={activeTab as AssessmentPartType}
                  stage={
                    detail.humanStages?.find(
                      (s) => s.stageType === activeTab
                    ) ?? null
                  }
                />
              </div>
            )}

            </div>

            {/* Pinned footer: status actions */}
            <div className="shrink-0 border-t border-border px-6 py-4">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!isStageTab ? (
                  // Basic Information: shortlist early or reject.
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={statusMut.isPending}
                      onClick={openReject}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        detail.status === "SHORTLISTED" || statusMut.isPending
                      }
                      onClick={() =>
                        statusMut.mutate({ id, status: "SHORTLISTED" })
                      }
                    >
                      Shortlist
                    </Button>
                  </>
                ) : isLastStage ? (
                  // Final stage: the hire pipeline.
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={statusMut.isPending}
                      onClick={openReject}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        detail.status === "SHORTLISTED" || statusMut.isPending
                      }
                      onClick={() =>
                        statusMut.mutate({ id, status: "SHORTLISTED" })
                      }
                    >
                      Shortlist
                    </Button>
                    <Button
                      size="sm"
                      disabled={detail.status === "OFFER" || statusMut.isPending}
                      onClick={() => statusMut.mutate({ id, status: "OFFER" })}
                    >
                      Make offer
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={detail.status === "HIRED" || statusMut.isPending}
                      onClick={() => statusMut.mutate({ id, status: "HIRED" })}
                    >
                      Mark hired
                    </Button>
                  </>
                ) : (
                  // Earlier stage: pass to proceed, or reject.
                  (() => {
                    const block = detail.interviews?.find(
                      (b) => b.partType === activeTab
                    )
                    const notSubmitted = isAiStage && !block?.submitted
                    const notGraded =
                      isAiStage && !!block?.submitted && !block?.aiGraded
                    const cantPass = notSubmitted || notGraded
                    const passTitle = notSubmitted
                      ? "Candidate hasn't taken this interview yet"
                      : notGraded
                        ? "Grade the interview with AI before passing"
                        : undefined
                    return (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={statusMut.isPending}
                          onClick={openReject}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            detail.status === "SHORTLISTED" ||
                            statusMut.isPending
                          }
                          onClick={() =>
                            statusMut.mutate({ id, status: "SHORTLISTED" })
                          }
                        >
                          Shortlist
                        </Button>
                        {isHumanStage && !stageDecided && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={stageBusy}
                            title="Skip this optional interview"
                            onClick={skipStage}
                          >
                            Skip
                          </Button>
                        )}
                        {!stageDecided && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={stageBusy || cantPass}
                            title={passTitle}
                            onClick={passAndContinue}
                          >
                            {stageBusy ? "Saving…" : "Pass & continue"}
                          </Button>
                        )}
                      </>
                    )
                  })()
                )}
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

interface ReviewTab {
  key: string
  label: string
  status: PipelineStageStatus | null
}

/** Clickable step/tab bar for the reviewer modal — Basic Information + each enabled stage. */
function ReviewTabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: ReviewTab[]
  active: string
  onSelect: (k: string) => void
}) {
  return (
    // p-2 gives the selected node's ring room so overflow-x-auto doesn't clip it.
    <div className="overflow-x-auto p-2">
      <div className="flex min-w-max items-start">
        {tabs.map((t, i) => {
          const selected = t.key === active
          const done = t.status === "PASSED"
          const rejected = t.status === "REJECTED"
          const review = t.status === "UNDER_REVIEW"
          const skipped = t.status === "SKIPPED"
          return (
            <Fragment key={t.key}>
              {i > 0 && (
                <div className="mt-3.5 h-0.5 w-5 shrink-0 bg-border sm:w-8" />
              )}
              <button
                type="button"
                onClick={() => onSelect(t.key)}
                className="flex w-16 shrink-0 cursor-pointer flex-col items-center gap-1 sm:w-20"
              >
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-colors",
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : rejected
                        ? "border-red-500 bg-red-500 text-white"
                        : review
                          ? "border-amber-500 bg-amber-500 text-white"
                          : skipped
                            ? "border-dashed border-muted-foreground/40 bg-muted text-muted-foreground"
                            : selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground",
                    selected && "ring-2 ring-primary ring-offset-1 ring-offset-card"
                  )}
                >
                  {done ? (
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={13}
                      strokeWidth={2.5}
                    />
                  ) : rejected ? (
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={13}
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
                    "text-center text-[9px] leading-tight font-medium",
                    selected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {t.label}
                </span>
                {review && (
                  <span className="text-[8px] font-medium text-amber-600 dark:text-amber-400">
                    Under review
                  </span>
                )}
                {skipped && (
                  <span className="text-[8px] font-medium text-muted-foreground">
                    Skipped
                  </span>
                )}
              </button>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

const INTERVIEW_TAB_KEYS = [
  "AI_INTERVIEW",
  "AI_TECHNICAL_INTERVIEW",
  "HR_INTERVIEW",
  "FINAL_INTERVIEW",
]

const STAGE_STATUS_CLS: Record<StageStatus, string> = {
  PASSED: "bg-green-500/10 text-green-600 dark:text-green-400",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PENDING: "bg-muted text-muted-foreground",
  SKIPPED: "bg-muted text-muted-foreground",
}

/**
 * Per-stage status pill for the applicants table (null = not reached / not applicable).
 * "Under review" while awaiting a human; once the AI has graded it shows "Reviewed · score%".
 */
function StageStatusCell({
  status,
  score,
}: {
  status: StageStatus | null
  score?: number | null
}) {
  if (!status)
    return <span className="text-[11px] text-muted-foreground">—</span>
  const pct = score != null ? ` · ${score}%` : ""
  const label =
    status === "PASSED"
      ? `Passed${pct}`
      : status === "REJECTED"
        ? `Rejected${pct}`
        : status === "UNDER_REVIEW"
          ? score != null
            ? `Reviewed${pct}`
            : "Under review"
          : status === "SKIPPED"
            ? "Skipped"
            : "Pending"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        STAGE_STATUS_CLS[status]
      )}
    >
      {label}
    </span>
  )
}

function StageStatusFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: StageStatus | ""
  onChange: (v: StageStatus | "") => void
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StageStatus | "")}
        className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-[11px] focus:ring-2 focus:ring-ring focus:outline-none"
      >
        <option value="">Any</option>
        <option value="PASSED">Passed</option>
        <option value="UNDER_REVIEW">Under review</option>
        <option value="REJECTED">Rejected</option>
        <option value="PENDING">Pending</option>
        <option value="SKIPPED">Skipped</option>
      </select>
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

// ── AI interview review (one block per AI interview stage) ───────────────────

function InterviewReviewBlock({
  applicationId: id,
  block,
}: {
  applicationId: number
  block: ReviewInterviewBlockType
}) {
  const partType = block.partType
  const answers = block.answers ?? []
  const gradeMut = useGradeApplication()
  const reviewMut = useSaveReview()
  const enhanceMut = useEnhanceComment()
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})
  const [openReview, setOpenReview] = useState<Record<number, boolean>>({})
  // Manual edit of the overall evaluation (summary / strengths / improvements).
  const editSummaryMut = useEditInterviewSummary()
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState({
    summary: "",
    strengths: "",
    improvements: "",
  })

  function startEditSummary() {
    setSummaryDraft({
      summary: block.aiSummary ?? "",
      strengths: block.aiStrengths ?? "",
      improvements: block.aiImprovements ?? "",
    })
    setEditingSummary(true)
  }
  function saveSummary() {
    editSummaryMut.mutate(
      { id, partType, payload: summaryDraft },
      { onSuccess: () => setEditingSummary(false) }
    )
  }

  // Seed comments from the server when switching applicant/stage (not while typing).
  useEffect(() => {
    const c: Record<number, string> = {}
    const o: Record<number, boolean> = {}
    answers.forEach((a, i) => {
      c[i] = a.reviewerComment ?? ""
      o[i] = !!a.reviewerComment
    })
    setComments(c)
    setOpenReview(o)
    setEditingSummary(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, partType])

  function commentsPayload(): string[] {
    return Array.from({ length: answers.length }, (_, i) =>
      (comments[i] ?? "").trim()
    )
  }
  const hasAnyComment = commentsPayload().some((c) => c.length > 0)

  function handleGrade() {
    setGradeError(null)
    gradeMut.mutate(
      { id, partType },
      {
        onError: (e: unknown) =>
          setGradeError(
            (e as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? "AI grading failed — is Ollama running?"
          ),
      }
    )
  }
  function handleSaveReview() {
    reviewMut.mutate({
      id,
      partType,
      payload: { reviewerComments: commentsPayload() },
    })
  }
  function handleRegradeWithNotes() {
    setGradeError(null)
    reviewMut.mutate(
      { id, partType, payload: { reviewerComments: commentsPayload() } },
      { onSuccess: () => handleGrade() }
    )
  }
  function handleEnhance(i: number, question: string) {
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
  const busy = gradeMut.isPending || reviewMut.isPending

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {block.label}
        </p>
        <div className="flex items-center gap-2">
          {block.aiGraded && block.aiScore != null && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              AI score {block.aiScore}%
            </span>
          )}
          <DecisionBadge decision={block.reviewDecision} />
          {block.submitted && (
            <Button
              size="xs"
              variant="outline"
              onClick={handleGrade}
              disabled={busy}
            >
              {gradeMut.isPending
                ? "Grading…"
                : block.aiGraded
                  ? "Re-grade"
                  : "Grade with AI"}
            </Button>
          )}
        </div>
      </div>

      {!block.submitted ? (
        <p className="text-[12px] text-muted-foreground">
          Not submitted yet.
        </p>
      ) : (
        <>
          {gradeError && (
            <p className="mb-2 text-[11px] font-medium text-destructive">
              {gradeError}
            </p>
          )}

          {/* Final overall evaluation (whole interview + closing Q&A) — set when AI-graded, editable. */}
          {(block.aiSummary || editingSummary) && (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                  Overall evaluation
                </p>
                <div className="flex items-center gap-2">
                  {block.aiScore != null && (
                    <span className="text-[11px] font-semibold text-primary">
                      {block.aiScore}%
                    </span>
                  )}
                  {!editingSummary && (
                    <button
                      type="button"
                      onClick={startEditSummary}
                      className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {editingSummary ? (
                <div className="space-y-2">
                  <SummaryField
                    label="Summary"
                    value={summaryDraft.summary}
                    rows={3}
                    onChange={(v) =>
                      setSummaryDraft((d) => ({ ...d, summary: v }))
                    }
                  />
                  <SummaryField
                    label="Strengths"
                    value={summaryDraft.strengths}
                    rows={2}
                    onChange={(v) =>
                      setSummaryDraft((d) => ({ ...d, strengths: v }))
                    }
                  />
                  <SummaryField
                    label="To improve"
                    value={summaryDraft.improvements}
                    rows={2}
                    onChange={(v) =>
                      setSummaryDraft((d) => ({ ...d, improvements: v }))
                    }
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setEditingSummary(false)}
                      disabled={editSummaryMut.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      onClick={saveSummary}
                      disabled={editSummaryMut.isPending}
                    >
                      {editSummaryMut.isPending ? "Saving…" : "Save evaluation"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[12px] leading-relaxed text-foreground/90">
                    {block.aiSummary}
                  </p>
                  {(block.aiStrengths || block.aiImprovements) && (
                    <div className="mt-2 space-y-1.5">
                      {block.aiStrengths && (
                        <FeedbackNote
                          tone="pos"
                          label="Strengths"
                          text={block.aiStrengths}
                        />
                      )}
                      {block.aiImprovements && (
                        <FeedbackNote
                          tone="neg"
                          label="To improve"
                          text={block.aiImprovements}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            {answers.map((qa, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-medium">{qa.question}</p>
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

                <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={openReview[i] ?? false}
                    onChange={() =>
                      setOpenReview((o) => ({ ...o, [i]: !o[i] }))
                    }
                    className="size-3.5 accent-violet-600"
                  />
                  Additional review
                </label>
                {openReview[i] && (
                  <div className="mt-1.5">
                    <textarea
                      rows={2}
                      value={comments[i] ?? ""}
                      onChange={(e) =>
                        setComments((c) => ({ ...c, [i]: e.target.value }))
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
                          enhancingIndex === i || !(comments[i] ?? "").trim()
                        }
                        onClick={() => handleEnhance(i, qa.question)}
                      >
                        <HugeiconsIcon
                          icon={SparklesIcon}
                          size={12}
                          strokeWidth={1.8}
                        />
                        {enhancingIndex === i ? "Enhancing…" : "Enhance"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {block.candidateQa && block.candidateQa.length > 0 && (
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Candidate&apos;s questions at the end
              </p>
              <div className="space-y-2.5">
                {block.candidateQa.map((qa, i) => (
                  <div key={i} className="text-[12px]">
                    <p className="font-medium text-foreground">
                      <span className="text-muted-foreground">Q:</span>{" "}
                      {qa.question}
                    </p>
                    <p className="mt-0.5 text-muted-foreground italic">
                      <span className="not-italic">A:</span> {qa.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {enhanceError && (
            <p className="mt-2 text-[11px] font-medium text-destructive">
              {enhanceError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <span className="text-[10px] text-muted-foreground">
              {block.reviewedBy
                ? `Reviewed by ${block.reviewedBy}${
                    block.reviewedAt
                      ? ` · ${new Date(block.reviewedAt).toLocaleDateString()}`
                      : ""
                  }`
                : "Optional — tick “Additional review” on any question to comment."}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                onClick={handleSaveReview}
                disabled={busy}
              >
                {reviewMut.isPending && !gradeMut.isPending
                  ? "Saving…"
                  : "Save review"}
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={handleRegradeWithNotes}
                disabled={busy || !hasAnyComment}
                title={hasAnyComment ? undefined : "Add a comment first"}
              >
                {gradeMut.isPending ? "Re-grading…" : "Re-grade with notes"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DecisionBadge({ decision }: { decision: "PENDING" | "PASSED" | "REJECTED" }) {
  if (decision === "PASSED") {
    return (
      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400">
        Passed
      </span>
    )
  }
  if (decision === "REJECTED") {
    return (
      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
        Rejected
      </span>
    )
  }
  return null
}

// ── Human-run interview stages (Human + Final) ───────────────────────────────

const HUMAN_STAGE_LABEL: Record<string, string> = {
  HR_INTERVIEW: "Live Interview",
  FINAL_INTERVIEW: "Final Interview",
}
const STAGE_STATUS_OPTIONS: StageStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "PASSED",
  "REJECTED",
  "SKIPPED",
]

function HumanStagePanel({
  applicationId: id,
  stageType,
  stage,
}: {
  applicationId: number
  stageType: AssessmentPartType
  stage: ReviewHumanStage | null
}) {
  const mut = useUpsertStage()
  const [link, setLink] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<StageStatus>("PENDING")
  useEffect(() => {
    setLink(stage?.meetingLink ?? "")
    setNotes(stage?.notes ?? "")
    setStatus(stage?.status ?? "PENDING")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, stageType])

  function save() {
    mut.mutate({
      id,
      stageType,
      payload: { status, meetingLink: link, notes },
    })
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold">
          {HUMAN_STAGE_LABEL[stageType] ?? stageType}
        </span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StageStatus)}
          className="h-7 rounded-md border border-input bg-background px-2 text-[11px] focus:ring-2 focus:ring-ring focus:outline-none"
        >
          {STAGE_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <HugeiconsIcon
          icon={Video01Icon}
          size={14}
          strokeWidth={1.8}
          className="shrink-0 text-muted-foreground"
        />
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Meeting link (Zoom / Meet / …)"
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] focus:ring-2 focus:ring-ring focus:outline-none"
        />
      </div>
      <textarea
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Details shown to the candidate — meeting time, what to prepare, etc."
        className="mt-2 w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-[12px] focus:ring-2 focus:ring-ring focus:outline-none"
      />
      <p className="mt-1 text-[10px] text-muted-foreground">
        The meeting link and these details are visible to the candidate.
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          {stage?.decidedBy
            ? `${stage.decidedBy}${
                stage.decidedAt
                  ? ` · ${new Date(stage.decidedAt).toLocaleDateString()}`
                  : ""
              }`
            : ""}
        </span>
        <Button size="xs" variant="outline" onClick={save} disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : "Save stage"}
        </Button>
      </div>
    </div>
  )
}

/** Labeled textarea used when manually editing an interview's overall evaluation. */
function SummaryField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string
  value: string
  rows: number
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full resize-y rounded-lg border border-input bg-background px-2.5 py-1.5 text-[12px] focus:ring-2 focus:ring-ring focus:outline-none"
      />
    </div>
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
