"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { StatCard } from "@/components/custom/stat-card"
import { EmptyState } from "@/components/custom/empty-state"
import { TableSkeleton } from "@/components/custom/table-skeleton"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  FloppyDiskIcon,
  GlobeIcon,
  PencilEdit01Icon,
  Search01Icon,
  CheckmarkCircle01Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons"
import {
  useJobs,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
} from "@/hooks/use-hr"
import { RichTextEditor } from "@/components/custom/rich-text-editor"
import { useDepartments, useJobPositions } from "@/hooks/use-employee-profile"
import { useUserRoles } from "@/hooks/use-admin-roles"
import type {
  JobPosting,
  CreateJobPayload,
  WorkType,
  SalaryPeriod,
} from "@/lib/hr-api"
import { currencySymbol, CURRENCY_OPTIONS } from "@/lib/employee-profile-api"
import { useQuestions, useCreateQuestion } from "@/hooks/use-assessment"
import {
  assessmentApi,
  PART_TYPE_LABEL,
  type JobInterviewConfig,
  type AssessmentPartType,
} from "@/lib/assessment-api"
import { cn } from "@/lib/utils"
import { useSlugHref } from "@/lib/slug"

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: JobPosting["status"]; label: string }[] = [
  { value: "new", label: "New" },
  { value: "urgent", label: "Urgent" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
]

const TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
]

const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
]

const SALARY_PERIOD_OPTIONS: { value: SalaryPeriod; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "weekly", label: "Weekly" },
  { value: "semi-monthly", label: "Semi-monthly" },
  { value: "monthly", label: "Monthly" },
  { value: "fixed-price", label: "Fixed price" },
]

const STATUS_VARIANT: Record<string, "green" | "amber" | "blue" | "gray"> = {
  new: "green",
  urgent: "amber",
  open: "blue",
  closed: "gray",
}

// ── Form types ────────────────────────────────────────────────────────────────

type SalaryInputType = "fixed" | "range"

type JobForm = {
  title: string
  department: string
  location: string
  type: string
  workType: WorkType
  description: string
  salaryInputType: SalaryInputType
  salaryPeriod: SalaryPeriod | ""
  salaryCurrency: string
  salaryFrom: string
  salaryTo: string
  status: JobPosting["status"]
  reapplyCooldownDays: string
  /** UserRole id (as string for the <select>) the applicant becomes when hired. */
  hireUserRoleId: string
  /** JobPosition id (as string) this posting recruits for; seeds the offer. */
  jobPositionId: string
  tags: string[]
  /** Which pipeline stages are enabled for this posting. */
  enabledStages: AssessmentPartType[]
  /** Per-stage AI interview config (HR AI + Technical AI). */
  interviewConfigs: InterviewConfigs
}

// The full hiring pipeline, in order — each can be toggled on/off per posting.
const PIPELINE_STAGES: AssessmentPartType[] = [
  "BASIC_QA",
  "PERSONALITY",
  "AI_INTERVIEW",
  "AI_TECHNICAL_INTERVIEW",
  "HR_INTERVIEW",
  "FINAL_INTERVIEW",
]

// The two candidate-run AI interview stages that have a per-job question config.
const AI_INTERVIEW_STAGES = ["AI_INTERVIEW", "AI_TECHNICAL_INTERVIEW"] as const
type AiInterviewStage = (typeof AI_INTERVIEW_STAGES)[number]
interface StageConfig {
  useCustom: boolean
  questionIds: number[]
  aiFollowUp: boolean
  maxQuestions: number
}
type InterviewConfigs = Record<AiInterviewStage, StageConfig>

function emptyStageConfig(): StageConfig {
  return {
    useCustom: false,
    questionIds: [],
    aiFollowUp: false,
    maxQuestions: 6,
  }
}
function emptyInterviewConfigs(): InterviewConfigs {
  return {
    AI_INTERVIEW: emptyStageConfig(),
    AI_TECHNICAL_INTERVIEW: emptyStageConfig(),
  }
}

function stageConfigFromApi(c: {
  useCustom: boolean
  questionIds: number[]
  aiFollowUpEnabled?: boolean
  maxQuestions?: number
}): StageConfig {
  return {
    useCustom: c.useCustom,
    questionIds: c.questionIds ?? [],
    aiFollowUp: c.aiFollowUpEnabled ?? false,
    maxQuestions: c.maxQuestions ?? 6,
  }
}

function stageConfigToApi(s: StageConfig): JobInterviewConfig {
  return {
    useCustom: s.useCustom,
    questionIds: s.questionIds,
    aiFollowUpEnabled: s.aiFollowUp,
    maxQuestions: s.maxQuestions,
  }
}

const STAGE_META: Record<AiInterviewStage, { label: string; hint: string }> = {
  AI_INTERVIEW: {
    label: "HR AI Interview",
    hint: "Initial behavioural screen — broad, light questions.",
  },
  AI_TECHNICAL_INTERVIEW: {
    label: "Technical AI Interview",
    hint: "Role-specific technical depth — probing follow-ups.",
  },
}

/** Per-stage AI interview config: follow-up toggle, question count, and fixed/custom questions. */
function InterviewStageConfigSection({
  stage,
  jobId,
  value,
  onChange,
}: {
  stage: AiInterviewStage
  jobId: number | null
  value: StageConfig
  onChange: (cfg: StageConfig) => void
}) {
  const { data: questions = [] } = useQuestions({
    partType: stage as AssessmentPartType,
  })
  const createQuestionMut = useCreateQuestion()
  const [newQ, setNewQ] = useState("")
  const [newRubric, setNewRubric] = useState("")
  const [suggesting, setSuggesting] = useState(false)
  const meta = STAGE_META[stage]

  function suggestRubric() {
    const q = newQ.trim()
    if (!q) return
    setSuggesting(true)
    assessmentApi
      .suggestRubric(q, jobId ?? undefined)
      .then((rubric) => setNewRubric(rubric))
      .catch(() => {})
      .finally(() => setSuggesting(false))
  }

  function addQuestion() {
    const text = newQ.trim()
    if (!text) return
    createQuestionMut.mutate(
      {
        partType: stage as AssessmentPartType,
        kind: "OPEN_SPOKEN",
        category: "NONE",
        text,
        rubric: newRubric.trim() || null,
        points: 1,
        active: true,
      },
      {
        onSuccess: (created) => {
          onChange({
            ...value,
            useCustom: true,
            questionIds: [...value.questionIds, created.id],
          })
          setNewQ("")
          setNewRubric("")
        },
      }
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <p className="text-[12px] font-semibold text-foreground">
          {meta.label}
        </p>
        <p className="text-[11px] text-muted-foreground">{meta.hint}</p>
      </div>

      {/* Conversational AI follow-up */}
      <label className="flex cursor-pointer items-start gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={value.aiFollowUp}
          onChange={(e) => onChange({ ...value, aiFollowUp: e.target.checked })}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>
          <span className="font-medium text-foreground">
            Enable AI follow-up interview
          </span>
          <span className="block text-[11px] text-muted-foreground">
            Conversational: the AI opens from the applicant&apos;s resume and
            asks live follow-ups. No question bank is used.
          </span>
        </span>
      </label>
      {value.aiFollowUp && (
        <div className="flex items-center gap-2 pl-6 text-[12px]">
          <span className="text-muted-foreground">Number of questions</span>
          <Input
            type="number"
            min={1}
            max={20}
            className="h-8 w-20 text-[13px]"
            value={value.maxQuestions}
            onChange={(e) =>
              onChange({
                ...value,
                maxQuestions: Math.max(
                  1,
                  Math.min(20, Number(e.target.value) || 1)
                ),
              })
            }
          />
        </div>
      )}

      {/* Fixed questions (when follow-up is off) */}
      {!value.aiFollowUp && (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] text-muted-foreground">
              Fixed questions
            </Label>
            <label className="flex cursor-pointer items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={value.useCustom}
                onChange={(e) =>
                  onChange({ ...value, useCustom: e.target.checked })
                }
                className="size-4 accent-primary"
              />
              Use custom questions
            </label>
          </div>
          {!value.useCustom ? (
            <p className="text-[11px] text-muted-foreground">
              Using the global default questions for this stage. Toggle on to
              choose a custom set for this posting.
            </p>
          ) : (
            <>
              {questions.length > 0 && (
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {questions.map((q) => {
                    const checked = value.questionIds.includes(q.id)
                    return (
                      <label
                        key={q.id}
                        className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            onChange({
                              ...value,
                              questionIds: e.target.checked
                                ? [...value.questionIds, q.id]
                                : value.questionIds.filter((x) => x !== q.id),
                            })
                          }
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                        />
                        <span>{q.text}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              <div className="space-y-1.5 rounded-lg border border-dashed border-border p-2">
                <Input
                  className="h-8 text-[13px]"
                  placeholder="Add a custom question…"
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 flex-1 text-[13px]"
                    placeholder="Optional rubric — or click Suggest"
                    value={newRubric}
                    onChange={(e) => setNewRubric(e.target.value)}
                  />
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={suggestRubric}
                    disabled={!newQ.trim() || suggesting}
                    title="Ask AI to draft a rubric for this question"
                  >
                    {suggesting ? "Suggesting…" : "Suggest"}
                  </Button>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={addQuestion}
                  disabled={!newQ.trim() || createQuestionMut.isPending}
                >
                  <HugeiconsIcon
                    icon={Add01Icon}
                    size={12}
                    strokeWidth={2}
                    className="mr-1"
                  />
                  {createQuestionMut.isPending ? "Adding…" : "Add question"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {value.questionIds.length} selected — these replace the global
                questions for this posting.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}

type JobErrors = Partial<Record<"title" | "department" | "location", string>>

const EMPTY_FORM: JobForm = {
  title: "",
  department: "",
  location: "",
  type: "Full-time",
  workType: "onsite",
  description: "",
  salaryInputType: "range",
  salaryPeriod: "monthly",
  salaryCurrency: "PHP",
  salaryFrom: "",
  salaryTo: "",
  status: "open",
  reapplyCooldownDays: "",
  hireUserRoleId: "",
  jobPositionId: "",
  tags: [],
  enabledStages: [...PIPELINE_STAGES],
  interviewConfigs: emptyInterviewConfigs(),
}

function postingToForm(j: JobPosting): JobForm {
  return {
    title: j.title,
    department: j.department,
    location: j.location ?? "",
    type: j.type,
    workType: j.workType ?? "onsite",
    description: j.description ?? "",
    salaryInputType: (j.salaryTo != null
      ? "range"
      : "fixed") as SalaryInputType,
    salaryPeriod: (j.salaryPeriod as SalaryPeriod) ?? "monthly",
    salaryCurrency: j.salaryCurrency ?? "PHP",
    salaryFrom: j.salaryFrom != null ? String(j.salaryFrom) : "",
    salaryTo: j.salaryTo != null ? String(j.salaryTo) : "",
    status: j.status,
    reapplyCooldownDays:
      j.reapplyCooldownDays != null ? String(j.reapplyCooldownDays) : "",
    hireUserRoleId: j.hireUserRoleId != null ? String(j.hireUserRoleId) : "",
    jobPositionId: j.jobPositionId != null ? String(j.jobPositionId) : "",
    tags: j.tags,
    enabledStages:
      j.enabledStages && j.enabledStages.length > 0
        ? j.enabledStages
        : [...PIPELINE_STAGES],
    interviewConfigs: emptyInterviewConfigs(),
  }
}

function formToPayload(f: JobForm): CreateJobPayload {
  return {
    title: f.title.trim(),
    department: f.department.trim(),
    location: f.workType === "remote" ? null : f.location.trim() || null,
    type: f.type,
    workType: f.workType,
    description: f.description || null,
    salaryCurrency: f.salaryCurrency || null,
    salaryFrom: f.salaryFrom ? parseFloat(f.salaryFrom) : null,
    salaryTo:
      f.salaryInputType === "range" && f.salaryTo
        ? parseFloat(f.salaryTo)
        : null,
    salaryPeriod: f.salaryPeriod || null,
    status: f.status,
    reapplyCooldownDays: f.reapplyCooldownDays.trim()
      ? Math.max(0, parseInt(f.reapplyCooldownDays, 10) || 0)
      : null,
    hireUserRoleId: f.hireUserRoleId ? Number(f.hireUserRoleId) : null,
    jobPositionId: f.jobPositionId ? Number(f.jobPositionId) : null,
    tags: f.tags,
    enabledStages: f.enabledStages,
  }
}

// ── Tag Input ─────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  suggestions,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
}) {
  const [input, setInput] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  )
  const canAddNew = input.trim() !== "" && !tags.includes(input.trim())
  const showDropdown = open && (filtered.length > 0 || canAddNew)

  function add(tag: string) {
    const t = tag.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput("")
    setOpen(false)
    inputRef.current?.focus()
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      add(input)
    }
    if (e.key === "Backspace" && !input && tags.length > 0)
      onChange(tags.slice(0, -1))
    if (e.key === "Escape") setOpen(false)
  }

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex min-h-9 cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[12px] font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                remove(tag)
              }}
              className="text-primary/50 transition-colors hover:text-primary"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Type to add tags…" : ""}
          className="min-w-20 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                add(s)
              }}
              className="flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted"
            >
              {s}
            </button>
          ))}
          {canAddNew && !filtered.includes(input.trim()) && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                add(input)
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-[13px] text-primary transition-colors hover:bg-muted",
                filtered.length > 0 && "border-t border-border/60"
              )}
            >
              <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
              Add &ldquo;{input.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Job Modal ─────────────────────────────────────────────────────────────────

function JobModal({
  editingId,
  form,
  errors,
  busy,
  submitError,
  tagSuggestions,
  onClose,
  onSubmit,
  setForm,
}: {
  editingId: number | null
  form: JobForm
  errors: JobErrors
  busy: boolean
  submitError: string | null
  tagSuggestions: string[]
  onClose: () => void
  onSubmit: () => void
  setForm: (v: JobForm) => void
}) {
  const { data: departments = [] } = useDepartments()
  const { data: userRoles = [] } = useUserRoles()
  const { data: jobPositions = [] } = useJobPositions()
  // Only non-applicant roles can be a hire target.
  const hireRoleOptions = userRoles.filter(
    (r) => r.roleType === "EMPLOYEE" || r.roleType === "ADMIN"
  )
  const activePositions = jobPositions.filter((p) => p.active)
  const activeDepts = departments.filter((d) => d.active)

  const showLocation = form.workType === "onsite" || form.workType === "hybrid"
  const hasErrors = Object.keys(errors).length > 0

  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (hasErrors) bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [errors]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg animate-in rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-[15px] font-semibold">
            {editingId ? "Edit Job Posting" : "New Job Posting"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          ref={bodyRef}
          className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">
              Job Title *
            </Label>
            <Input
              autoFocus
              className={cn(
                "h-9 text-[13px]",
                errors.title && "border-destructive"
              )}
              placeholder="e.g. Senior Software Engineer"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {errors.title && (
              <p className="text-[11px] font-medium text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          {/* Department + Employment type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Department *
              </Label>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                className={cn(
                  "h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none",
                  errors.department && "border-destructive"
                )}
              >
                <option value="">Select department…</option>
                {activeDepts.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="text-[11px] font-medium text-destructive">
                  {errors.department}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Employment Type
              </Label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Work type toggle */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">
              Work Type
            </Label>
            <div className="flex gap-2">
              {WORK_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      workType: opt.value,
                      location: opt.value === "remote" ? "" : form.location,
                    })
                  }
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-[13px] font-medium transition-all",
                    form.workType === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      form.workType === opt.value
                        ? "bg-primary"
                        : "bg-muted-foreground/40"
                    )}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location — only for onsite / hybrid */}
          {showLocation && (
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={11}
                  strokeWidth={1.8}
                  className="mr-1 inline"
                />
                Location {form.workType === "onsite" ? "*" : ""}
              </Label>
              <Input
                className={cn(
                  "h-9 text-[13px]",
                  errors.location && "border-destructive"
                )}
                placeholder="e.g. Manila, PH · BGC · Makati"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              {errors.location && (
                <p className="text-[11px] font-medium text-destructive">
                  {errors.location}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">
              Job Description
            </Label>
            <RichTextEditor
              value={form.description}
              onChange={(html) => setForm({ ...form, description: html })}
              placeholder="Describe responsibilities, requirements, benefits…"
            />
          </div>

          {/* Salary (advertised range) */}
          <div className="space-y-2">
            <Label className="text-[12px] text-muted-foreground">Salary</Label>

            {/* Pay period pills */}
            <div className="flex flex-wrap gap-1.5">
              {SALARY_PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, salaryPeriod: opt.value })}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all",
                    form.salaryPeriod === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {/* Fixed / Range toggle */}
              <div className="flex items-center gap-1.5">
                {(["fixed", "range"] as SalaryInputType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, salaryInputType: t, salaryTo: "" })
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-all",
                      form.salaryInputType === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {t === "fixed" ? "Fixed amount" : "Range"}
                  </button>
                ))}
              </div>

              {/* Inputs */}
              <div
                className={cn(
                  "grid items-end gap-2",
                  form.salaryInputType === "range"
                    ? "grid-cols-[110px_1fr_1fr]"
                    : "grid-cols-[110px_1fr]"
                )}
              >
                {/* Currency */}
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Currency</p>
                  <select
                    value={form.salaryCurrency}
                    onChange={(e) =>
                      setForm({ ...form, salaryCurrency: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-2 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* From / Amount */}
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    {form.salaryInputType === "range" ? "From" : "Amount"}
                  </p>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-muted-foreground">
                      {currencySymbol(form.salaryCurrency)}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="h-9 pl-6 text-[13px]"
                      placeholder="0"
                      value={form.salaryFrom}
                      onChange={(e) =>
                        setForm({ ...form, salaryFrom: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* To — only for range */}
                {form.salaryInputType === "range" && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">To</p>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-muted-foreground">
                        {currencySymbol(form.salaryCurrency)}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        className="h-9 pl-6 text-[13px]"
                        placeholder="0"
                        value={form.salaryTo}
                        onChange={(e) =>
                          setForm({ ...form, salaryTo: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Status</Label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as JobPosting["status"],
                })
              }
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reapply cooldown */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">
              Reapply cooldown (days)
            </Label>
            <Input
              type="number"
              min={0}
              className="h-9 text-[13px]"
              placeholder="0 — rejected candidates can reapply immediately"
              value={form.reapplyCooldownDays}
              onChange={(e) =>
                setForm({ ...form, reapplyCooldownDays: e.target.value })
              }
            />
            <p className="text-[11px] text-muted-foreground">
              How long a rejected candidate must wait before applying again.
              Leave blank or 0 for no waiting period. Doesn&apos;t affect
              withdrawn applicants.
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Tags</Label>
            <TagInput
              tags={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
              suggestions={tagSuggestions}
            />
            <p className="text-[11px] text-muted-foreground">
              Type and press Enter, or pick from existing tags
            </p>
          </div>

          {/* Role on hire — applicant is converted into this role when hired */}
          <div className="space-y-1.5 border-t border-border pt-4">
            <Label className="text-[12px] text-muted-foreground">
              Role on hire *
            </Label>
            <select
              value={form.hireUserRoleId}
              onChange={(e) =>
                setForm({ ...form, hireUserRoleId: e.target.value })
              }
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="">Select role…</option>
              {hireRoleOptions.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                  {r.roleType === "ADMIN" ? " (Admin)" : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              When an applicant accepts an offer, their account is converted to
              this role. Required before you can extend an offer.
            </p>
          </div>

          {/* Job position — seeds the offer's position, department & salary grades */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">
              Job position
            </Label>
            <select
              value={form.jobPositionId}
              onChange={(e) =>
                setForm({ ...form, jobPositionId: e.target.value })
              }
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="">Select position…</option>
              {activePositions.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.title}
                  {p.department ? ` · ${p.department}` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              The position the new hire is assigned to. Seeds the offer&apos;s
              position, department and salary grade.
            </p>
          </div>

          {/* Hiring pipeline stages — toggle which are part of this posting's process */}
          <div className="space-y-2 border-t border-border pt-4">
            <Label className="text-[12px] text-muted-foreground">
              Hiring pipeline stages
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Choose which stages this posting runs. Disabled stages are skipped
              for every applicant and hidden from their status.
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {PIPELINE_STAGES.map((stage) => {
                const on = form.enabledStages.includes(stage)
                return (
                  <label
                    key={stage}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[12px]"
                  >
                    <span
                      className={
                        on
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {PART_TYPE_LABEL[stage]}
                    </span>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          enabledStages: e.target.checked
                            ? [...form.enabledStages, stage]
                            : form.enabledStages.filter((s) => s !== stage),
                        })
                      }
                      className="size-4 accent-primary"
                    />
                  </label>
                )
              })}
            </div>
          </div>

          {/* Interview question config — only for enabled AI interview stages */}
          {AI_INTERVIEW_STAGES.some((s) => form.enabledStages.includes(s)) && (
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="text-[12px] text-muted-foreground">
                Interview questions
              </Label>

              {AI_INTERVIEW_STAGES.filter((s) =>
                form.enabledStages.includes(s)
              ).map((stage) => (
                <InterviewStageConfigSection
                  key={stage}
                  stage={stage}
                  jobId={editingId}
                  value={form.interviewConfigs[stage]}
                  onChange={(cfg) =>
                    setForm({
                      ...form,
                      interviewConfigs: {
                        ...form.interviewConfigs,
                        [stage]: cfg,
                      },
                    })
                  }
                />
              ))}

              <p className="rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  Live Interview
                </span>{" "}
                and{" "}
                <span className="font-medium text-foreground">
                  Final Interview
                </span>{" "}
                are conducted by the hiring team — scheduled with a meeting link
                and marked pass/fail from the applicant&apos;s review screen, so
                they have no question bank here.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-6 py-4">
          {/* Inline error feedback */}
          {(hasErrors || submitError) && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] font-medium text-destructive">
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={12}
                strokeWidth={2.5}
                className="shrink-0"
              />
              {submitError ?? "Please fill in all required fields."}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              * Required fields
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={onSubmit} disabled={busy}>
                <HugeiconsIcon
                  icon={FloppyDiskIcon}
                  size={13}
                  strokeWidth={2}
                  className="mr-1.5"
                />
                {busy ? "Saving…" : editingId ? "Update" : "Post Job"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Recruitment Section ───────────────────────────────────────────────────────

export function RecruitmentSection() {
  const slugHref = useSlugHref()
  const jobsQ = useJobs({ size: 100 })
  const createMut = useCreateJob()
  const updateMut = useUpdateJob()
  const deleteMut = useDeleteJob()

  const jobs = jobsQ.data?.content ?? []

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<JobForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<JobErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<
    JobPosting["status"] | "all"
  >("all")
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return jobs.filter((j) => {
      const matchSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        (j.location ?? "").toLowerCase().includes(q)
      const matchStatus = filterStatus === "all" || j.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [jobs, search, filterStatus])

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function validate(): boolean {
    const errs: JobErrors = {}
    if (!form.title.trim()) errs.title = "Job title is required"
    if (!form.department.trim()) errs.department = "Department is required"
    if (form.workType === "onsite" && !form.location.trim())
      errs.location = "Location is required for on-site roles"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitError(null)
    setShowForm(true)
  }

  function openEdit(job: JobPosting) {
    setEditingId(job.id)
    setForm(postingToForm(job))
    setErrors({})
    setSubmitError(null)
    setShowForm(true)
    // Load per-job interview configs for both AI stages and merge into the form.
    Promise.all([
      assessmentApi.getJobInterview(job.id, "AI_INTERVIEW"),
      assessmentApi.getJobInterview(job.id, "AI_TECHNICAL_INTERVIEW"),
    ])
      .then(([hr, tech]) =>
        setForm((f) => ({
          ...f,
          interviewConfigs: {
            AI_INTERVIEW: stageConfigFromApi(hr),
            AI_TECHNICAL_INTERVIEW: stageConfigFromApi(tech),
          },
        }))
      )
      .catch(() => {})
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitError(null)
  }

  function handleSubmit() {
    if (!validate()) return
    setSubmitError(null)
    const payload = formToPayload(form)
    // Persist both AI interview stage configs; awaited so the toast reflects the real outcome.
    const saveInterviews = (jobId: number) =>
      Promise.all([
        assessmentApi.saveJobInterview(
          jobId,
          stageConfigToApi(form.interviewConfigs.AI_INTERVIEW),
          "AI_INTERVIEW"
        ),
        assessmentApi.saveJobInterview(
          jobId,
          stageConfigToApi(form.interviewConfigs.AI_TECHNICAL_INTERVIEW),
          "AI_TECHNICAL_INTERVIEW"
        ),
      ])
    if (editingId) {
      updateMut.mutate(
        { id: editingId, payload },
        {
          onSuccess: async () => {
            try {
              await saveInterviews(editingId)
              showToast("Job posting updated.", "success")
            } catch {
              showToast(
                "Posting saved, but interview settings didn't save.",
                "error"
              )
            }
            closeForm()
          },
          onError: () => setSubmitError("Failed to save. Please try again."),
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: async (created) => {
          try {
            await saveInterviews(created.id)
            showToast("Job posting created.", "success")
          } catch {
            showToast(
              "Posting created, but interview settings didn't save.",
              "error"
            )
          }
          closeForm()
        },
        onError: () =>
          setSubmitError("Failed to create posting. Please try again."),
      })
    }
  }

  function handleDelete(job: JobPosting) {
    if (!confirm(`Delete "${job.title}"? This cannot be undone.`)) return
    deleteMut.mutate(job.id, {
      onSuccess: () => showToast("Job posting deleted.", "success"),
      onError: () => showToast("Failed to delete posting.", "error"),
    })
  }

  const openCount = jobs.filter((j) => j.status !== "closed").length
  const totalApplicants = jobs.reduce((s, j) => s + j.applicantsCount, 0)
  const allTags = useMemo(
    () => [...new Set(jobs.flatMap((j) => j.tags))].sort(),
    [jobs]
  )

  const workTypeLabel: Record<WorkType, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
  }

  return (
    <div className="space-y-4">
      {/* Career page link */}
      <Link
        href={slugHref("/careers")}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HugeiconsIcon icon={GlobeIcon} size={15} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[13px] font-semibold">Career Page</p>
            <p className="text-[11px] text-muted-foreground">
              Public listing where candidates can view and apply to open
              positions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
          View page
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          title="Open positions"
          value={String(openCount)}
          accent="blue"
        />
        <StatCard
          title="Total applicants"
          value={String(totalApplicants)}
          delta="12 this week"
          deltaUp={true}
          accent="green"
        />
        <StatCard
          title="Interviews"
          value="8"
          meta="Scheduled this week"
          accent="amber"
        />
        <StatCard
          title="Offers sent"
          value="2"
          meta="1 accepted"
          accent="purple"
        />
      </div>

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold">Job Postings</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Manage open roles — posted listings appear on the public career
            page.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          New Job Posting
        </Button>
      </div>

      {/* Toast — fixed/floating above the form modal (z-50) so it's always visible */}
      {toast && (
        <div className="fixed right-4 bottom-4 z-60 animate-in fade-in slide-in-from-bottom-2">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-lg",
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            )}
          >
            <HugeiconsIcon
              icon={
                toast.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon
              }
              size={14}
              strokeWidth={2}
            />
            {toast.msg}
          </div>
        </div>
      )}

      {/* Filters */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1" style={{ minWidth: 200 }}>
            <HugeiconsIcon
              icon={Search01Icon}
              size={13}
              strokeWidth={2}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-8 pl-8 text-[13px]"
              placeholder="Search title, department, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "new", "urgent", "open", "closed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                  filterStatus === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {s === "all"
                  ? `All (${jobs.length})`
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {jobsQ.isLoading ? (
        <TableSkeleton rows={3} rowClassName="h-20" />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No job postings yet"
          description="Create your first posting — it will appear on the public career page."
          action={
            <Button size="sm" onClick={openCreate}>
              <HugeiconsIcon
                icon={Add01Icon}
                size={13}
                strokeWidth={2}
                className="mr-1.5"
              />
              New Job Posting
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No postings match your filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="divide-y divide-border/60">
            {filtered.map((job) => (
              <div
                key={job.id}
                className={cn(
                  "group flex items-center justify-between p-4 transition-colors hover:bg-muted/30",
                  job.status === "closed" && "opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold">{job.title}</p>
                    <StatusBadge variant={STATUS_VARIANT[job.status] ?? "gray"}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </StatusBadge>
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {workTypeLabel[job.workType ?? "onsite"]}
                    </span>
                    {job.tags.map((t) => (
                      <StatusBadge key={t} variant="blue" dot={false}>
                        {t}
                      </StatusBadge>
                    ))}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {job.department}
                    {job.location ? ` · ${job.location}` : ""}
                    {` · ${job.type}`}
                    {job.salaryFrom != null &&
                      (() => {
                        const sym = currencySymbol(job.salaryCurrency)
                        const amount =
                          job.salaryFrom != null
                            ? `${sym}${job.salaryFrom.toLocaleString("en-PH")}${job.salaryTo != null ? ` – ${sym}${job.salaryTo.toLocaleString("en-PH")}` : ""}`
                            : null
                        const period = job.salaryPeriod
                          ? SALARY_PERIOD_OPTIONS.find(
                              (o) => o.value === job.salaryPeriod
                            )?.label
                          : null
                        return amount ? (
                          <span className="font-medium text-foreground">
                            {` · ${amount}${period ? ` / ${period}` : ""}`}
                          </span>
                        ) : null
                      })()}
                  </p>
                </div>

                <div className="ml-4 flex shrink-0 items-center gap-4">
                  <div className="hidden text-right sm:block">
                    <p className="text-[13px] font-semibold">
                      {job.applicantsCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      applicants
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => openEdit(job)}
                      disabled={busy}
                      className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    >
                      <HugeiconsIcon
                        icon={PencilEdit01Icon}
                        size={12}
                        strokeWidth={2}
                      />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => handleDelete(job)}
                      disabled={busy}
                      className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20"
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        size={12}
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t px-4 py-2.5 text-right text-[11px] text-muted-foreground">
            {filtered.length} of {jobs.length} posting
            {jobs.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {showForm && (
        <JobModal
          editingId={editingId}
          form={form}
          errors={errors}
          busy={busy}
          submitError={submitError}
          tagSuggestions={allTags}
          onClose={closeForm}
          onSubmit={handleSubmit}
          setForm={setForm}
        />
      )}
    </div>
  )
}
