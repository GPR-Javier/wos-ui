"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/custom/empty-state"
import { TableSkeleton } from "@/components/custom/table-skeleton"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Cancel01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  FloppyDiskIcon,
  Search01Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons"
import {
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from "@/hooks/use-assessment"
import {
  type AssessmentPartType,
  type AssessmentQuestion,
  type QuestionCategory,
  type QuestionKind,
  type QuestionPayload,
  PART_TYPE_LABEL,
  QUESTION_KIND_LABEL,
  CATEGORY_LABEL,
  KINDS_FOR_PART,
  BASIC_QA_CATEGORIES,
  PERSONALITY_TRAITS,
} from "@/lib/assessment-api"

const ACTIVE_PART_TYPES: AssessmentPartType[] = [
  "BASIC_QA",
  "PERSONALITY",
  "AI_INTERVIEW",
  "AI_TECHNICAL_INTERVIEW",
]
const LIKERT_DEFAULT = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
]

type QForm = {
  partType: AssessmentPartType
  kind: QuestionKind
  category: QuestionCategory
  text: string
  options: string[]
  correctOption: number | null
  trait: string
  rubric: string
  points: string
  active: boolean
}

const EMPTY_FORM: QForm = {
  partType: "BASIC_QA",
  kind: "MULTIPLE_CHOICE",
  category: "GENERAL",
  text: "",
  options: ["", ""],
  correctOption: 0,
  trait: "",
  rubric: "",
  points: "1",
  active: true,
}

const PART_BADGE: Record<AssessmentPartType, string> = {
  BASIC_QA: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PERSONALITY:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  AI_INTERVIEW:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  AI_TECHNICAL_INTERVIEW:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  HR_INTERVIEW:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  FINAL_INTERVIEW:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

function showsOptions(kind: QuestionKind) {
  return kind === "MULTIPLE_CHOICE" || kind === "LIKERT"
}
function showsRubric(kind: QuestionKind) {
  return kind === "ESSAY" || kind === "SHORT_ANSWER" || kind === "OPEN_SPOKEN"
}

export function QuestionBankSection() {
  const [filterPart, setFilterPart] = useState<AssessmentPartType | "">("")
  const [filterCategory, setFilterCategory] = useState<QuestionCategory | "">(
    ""
  )
  const [search, setSearch] = useState("")

  const { data: questions = [], isLoading } = useQuestions({
    partType: filterPart || undefined,
    category:
      filterPart === "BASIC_QA" && filterCategory ? filterCategory : undefined,
  })
  const createMut = useCreateQuestion()
  const updateMut = useUpdateQuestion()
  const deleteMut = useDeleteQuestion()
  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<QForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return questions.filter((x) => !q || x.text.toLowerCase().includes(q))
  }, [questions, search])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  function openEdit(x: AssessmentQuestion) {
    setEditingId(x.id)
    setForm({
      partType: x.partType,
      kind: x.kind,
      category: x.category,
      text: x.text,
      options: x.options.length ? x.options : ["", ""],
      correctOption: x.correctOption,
      trait: x.trait ?? "",
      rubric: x.rubric ?? "",
      points: String(x.points),
      active: x.active,
    })
    setError(null)
    setShowForm(true)
  }

  function setPartType(partType: AssessmentPartType) {
    const kind = KINDS_FOR_PART[partType][0]
    setForm((f) => ({
      ...f,
      partType,
      kind,
      category: partType === "BASIC_QA" ? "GENERAL" : "NONE",
      options:
        kind === "LIKERT" ? LIKERT_DEFAULT : showsOptions(kind) ? ["", ""] : [],
      correctOption: kind === "MULTIPLE_CHOICE" ? 0 : null,
    }))
  }

  function setKind(kind: QuestionKind) {
    setForm((f) => ({
      ...f,
      kind,
      options:
        kind === "LIKERT"
          ? LIKERT_DEFAULT
          : showsOptions(kind)
            ? f.options.length
              ? f.options
              : ["", ""]
            : [],
      correctOption: kind === "MULTIPLE_CHOICE" ? (f.correctOption ?? 0) : null,
    }))
  }

  function validate(): string | null {
    if (!form.text.trim()) return "Question text is required."
    if (showsOptions(form.kind)) {
      const filled = form.options.filter((o) => o.trim())
      if (filled.length < 2) return "Add at least two options."
      if (form.kind === "MULTIPLE_CHOICE" && form.correctOption == null)
        return "Mark the correct option."
    }
    if (form.kind === "LIKERT" && !form.trait)
      return "Select a personality trait."
    return null
  }

  function handleSubmit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    const payload: QuestionPayload = {
      partType: form.partType,
      kind: form.kind,
      category: form.partType === "BASIC_QA" ? form.category : "NONE",
      text: form.text.trim(),
      options: showsOptions(form.kind)
        ? form.options.map((o) => o.trim()).filter(Boolean)
        : [],
      correctOption:
        form.kind === "MULTIPLE_CHOICE" ? form.correctOption : null,
      trait: form.kind === "LIKERT" ? form.trait : null,
      rubric: showsRubric(form.kind) ? form.rubric.trim() || null : null,
      points: Number(form.points) || 1,
      active: form.active,
    }
    if (editingId) {
      updateMut.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            setShowForm(false)
            showToast("Question updated.", "success")
          },
          onError: () => showToast("Failed to update.", "error"),
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          setShowForm(false)
          showToast("Question created.", "success")
        },
        onError: () => showToast("Failed to create.", "error"),
      })
    }
  }

  function handleDelete(x: AssessmentQuestion) {
    if (!confirm("Delete this question? This cannot be undone.")) return
    deleteMut.mutate(x.id, {
      onSuccess: () => showToast("Question deleted.", "success"),
      onError: () =>
        showToast(
          "Failed to delete — it may be used in a question set.",
          "error"
        ),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Question Bank</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Reusable questions for assessments — Basic Q&amp;A, Personality, and
            AI Interview.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          New Question
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex justify-end">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white shadow-md",
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
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
            placeholder="Search question text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterPart}
          onChange={(e) => {
            setFilterPart(e.target.value as AssessmentPartType | "")
            setFilterCategory("")
          }}
          className="h-8 rounded-lg border bg-background px-2.5 text-[12px] focus:ring-2 focus:ring-ring focus:outline-none"
        >
          <option value="">All parts</option>
          {ACTIVE_PART_TYPES.map((p) => (
            <option key={p} value={p}>
              {PART_TYPE_LABEL[p]}
            </option>
          ))}
        </select>
        {filterPart === "BASIC_QA" && (
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value as QuestionCategory | "")
            }
            className="h-8 rounded-lg border bg-background px-2.5 text-[12px] focus:ring-2 focus:ring-ring focus:outline-none"
          >
            <option value="">All categories</option>
            {BASIC_QA_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <TableSkeleton rows={3} rowClassName="h-14" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            questions.length === 0
              ? "No questions yet. Create your first one."
              : "No questions match your filters."
          }
        />
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border bg-card shadow-sm">
          {filtered.map((x) => (
            <div
              key={x.id}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                !x.active && "opacity-60"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{x.text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold",
                      PART_BADGE[x.partType]
                    )}
                  >
                    {PART_TYPE_LABEL[x.partType]}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                    {QUESTION_KIND_LABEL[x.kind]}
                  </span>
                  {x.category !== "NONE" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                      {CATEGORY_LABEL[x.category]}
                    </span>
                  )}
                  {x.trait && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                      {x.trait.charAt(0) + x.trait.slice(1).toLowerCase()}
                    </span>
                  )}
                  <span className="text-muted-foreground">{x.points} pt</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  title="Edit"
                  onClick={() => openEdit(x)}
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
                  onClick={() => handleDelete(x)}
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
          ))}
        </div>
      )}

      {showForm && (
        <QuestionModal
          editingId={editingId}
          form={form}
          error={error}
          busy={busy}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          setForm={setForm}
          setPartType={setPartType}
          setKind={setKind}
        />
      )}
    </div>
  )
}

// ── Modal ───────────────────────────────────────────────────────────────────

function QuestionModal({
  editingId,
  form,
  error,
  busy,
  onClose,
  onSubmit,
  setForm,
  setPartType,
  setKind,
}: {
  editingId: number | null
  form: QForm
  error: string | null
  busy: boolean
  onClose: () => void
  onSubmit: () => void
  setForm: (f: QForm | ((p: QForm) => QForm)) => void
  setPartType: (p: AssessmentPartType) => void
  setKind: (k: QuestionKind) => void
}) {
  const lockOptionEdit = form.kind === "LIKERT" // scale labels are fixed text but editable count

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg animate-in overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {editingId ? "Edit Question" : "New Question"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Part type + kind */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Part</label>
              <select
                value={form.partType}
                onChange={(e) =>
                  setPartType(e.target.value as AssessmentPartType)
                }
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {ACTIVE_PART_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {PART_TYPE_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Type</label>
              <select
                value={form.kind}
                onChange={(e) => setKind(e.target.value as QuestionKind)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {KINDS_FOR_PART[form.partType].map((k) => (
                  <option key={k} value={k}>
                    {QUESTION_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category (basic only) + Trait (likert only) */}
          {form.partType === "BASIC_QA" && (
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as QuestionCategory,
                  }))
                }
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {BASIC_QA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {form.kind === "LIKERT" && (
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                Trait (Big Five)
              </label>
              <select
                value={form.trait}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trait: e.target.value }))
                }
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="">Select a trait…</option>
                {PERSONALITY_TRAITS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Question text */}
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">
              Question *
            </label>
            <textarea
              autoFocus
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder="Type the question…"
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            />
          </div>

          {/* Options (MCQ / Likert) */}
          {showsOptions(form.kind) && (
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                {form.kind === "MULTIPLE_CHOICE"
                  ? "Options (mark the correct one)"
                  : "Scale options"}
              </label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {form.kind === "MULTIPLE_CHOICE" && (
                      <input
                        type="radio"
                        name="correct"
                        checked={form.correctOption === i}
                        onChange={() =>
                          setForm((f) => ({ ...f, correctOption: i }))
                        }
                        className="size-4 accent-primary"
                      />
                    )}
                    <Input
                      className="h-8 flex-1 text-[13px]"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          options: f.options.map((o, j) =>
                            j === i ? e.target.value : o
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => {
                          const options = f.options.filter((_, j) => j !== i)
                          let correctOption = f.correctOption
                          if (correctOption != null) {
                            if (i === correctOption) correctOption = 0
                            else if (i < correctOption) correctOption -= 1
                          }
                          return { ...f, options, correctOption }
                        })
                      }
                      disabled={form.options.length <= 2}
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:text-red-500 disabled:opacity-30"
                    >
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        size={12}
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                ))}
              </div>
              {!lockOptionEdit && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, options: [...f.options, ""] }))
                  }
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  + Add option
                </button>
              )}
            </div>
          )}

          {/* Rubric (essay / spoken) */}
          {showsRubric(form.kind) && (
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                Grading rubric / expected answer (used by AI grading)
              </label>
              <textarea
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
                placeholder="What a strong answer covers…"
                value={form.rubric}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rubric: e.target.value }))
                }
              />
            </div>
          )}

          {/* Points + active */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                Points
              </label>
              <Input
                type="number"
                min={1}
                className="h-9 text-[13px]"
                value={form.points}
                onChange={(e) =>
                  setForm((f) => ({ ...f, points: e.target.value }))
                }
              />
            </div>
            {editingId && (
              <div className="space-y-1.5">
                <label className="text-[12px] text-muted-foreground">
                  Status
                </label>
                <select
                  value={form.active ? "active" : "inactive"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      active: e.target.value === "active",
                    }))
                  }
                  className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <p className="text-[12px] font-medium text-destructive">{error}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={busy}>
            <HugeiconsIcon
              icon={FloppyDiskIcon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            {busy ? "Saving…" : editingId ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}
