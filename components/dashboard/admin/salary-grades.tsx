"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Search01Icon,
  UserGroupIcon,
  CheckmarkCircle01Icon,
  EyeIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  useSalaryGrades,
  useCreateSalaryGrade,
  useUpdateSalaryGrade,
  useDeleteSalaryGrade,
} from "@/hooks/use-employee-profile"
import type { SalaryGrade } from "@/lib/employee-profile-api"
import { CURRENCY_OPTIONS, currencySymbol } from "@/lib/employee-profile-api"
import type { AxiosError } from "axios"

// ── Form types ────────────────────────────────────────────────────────────────

type GradeForm = {
  name: string
  currency: string
  salaryAmount: string
  effectiveDate: string
  active: boolean
}

type FormErrors = Partial<Record<keyof GradeForm, string>>

const EMPTY_FORM: GradeForm = {
  name: "",
  currency: "PHP",
  salaryAmount: "",
  effectiveDate: "",
  active: true,
}

function gradeToForm(g: SalaryGrade): GradeForm {
  return {
    name: g.name,
    currency: g.currency ?? "PHP",
    salaryAmount: g.salaryAmount != null ? String(g.salaryAmount) : "",
    effectiveDate: g.effectiveDate ?? "",
    active: g.active,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-md",
        type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      )}
    >
      <HugeiconsIcon
        icon={type === "success" ? CheckmarkCircle01Icon : Cancel01Icon}
        size={14}
        strokeWidth={2}
      />
      {msg}
    </div>
  )
}

function FieldWrap({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  )
}

function ActionBtn({
  icon,
  title,
  onClick,
  disabled,
  className,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  title: string
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30",
        className
      )}
    >
      <HugeiconsIcon icon={icon} size={12} strokeWidth={2} />
    </button>
  )
}

// ── Grade Form Modal ──────────────────────────────────────────────────────────

function GradeModal({
  editingId,
  form,
  errors,
  busy,
  onClose,
  onSubmit,
  setField,
}: {
  editingId: number | null
  form: GradeForm
  errors: FormErrors
  busy: boolean
  onClose: () => void
  onSubmit: () => void
  setField: <K extends keyof GradeForm>(k: K, v: GradeForm[K]) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {editingId ? "Edit Salary Grade" : "New Salary Grade"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FieldWrap label="Grade Name *" error={errors.name}>
                <Input
                  autoFocus
                  className={cn("h-9 text-[13px]", errors.name && "border-destructive")}
                  placeholder="e.g. Entry Level, Junior, Senior"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                />
              </FieldWrap>
            </div>

            <FieldWrap label="Currency">
              <select
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </FieldWrap>

            <FieldWrap label={`Salary Amount (${currencySymbol(form.currency)}) *`} error={errors.salaryAmount}>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-muted-foreground">
                  {currencySymbol(form.currency)}
                </span>
                <Input
                  type="number"
                  min={0}
                  className={cn("h-9 pl-7 text-[13px] font-semibold", errors.salaryAmount && "border-destructive")}
                  placeholder="0"
                  value={form.salaryAmount}
                  onChange={(e) => setField("salaryAmount", e.target.value)}
                />
              </div>
            </FieldWrap>

            <FieldWrap label="Effective Date">
              <Input
                type="date"
                className="h-9 text-[13px]"
                value={form.effectiveDate}
                onChange={(e) => setField("effectiveDate", e.target.value)}
              />
            </FieldWrap>

            {editingId && (
              <FieldWrap label="Status">
                <select
                  value={form.active ? "active" : "inactive"}
                  onChange={(e) => setField("active", e.target.value === "active")}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FieldWrap>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">* Required fields</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSubmit} disabled={busy}>
              <HugeiconsIcon icon={FloppyDiskIcon} size={13} strokeWidth={2} className="mr-1.5" />
              {busy ? "Saving…" : editingId ? "Update Grade" : "Save Grade"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SalaryGradesSection() {
  const { data: grades = [], isLoading } = useSalaryGrades()
  const createMut = useCreateSalaryGrade()
  const updateMut = useUpdateSalaryGrade()
  const deleteMut = useDeleteSalaryGrade()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<GradeForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive" | "all">("active")
  const [viewingItem, setViewingItem] = useState<SalaryGrade | null>(null)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return grades.filter((g) => {
      const matchSearch = !q || g.name.toLowerCase().includes(q)
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? g.active : !g.active)
      return matchSearch && matchStatus
    })
  }, [grades, search, filterStatus])

  const activeCount = grades.filter((g) => g.active).length
  const inactiveCount = grades.filter((g) => !g.active).length

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function setField<K extends keyof GradeForm>(k: K, v: GradeForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = "Grade name is required"
    const amt = parseFloat(form.salaryAmount)
    if (!form.salaryAmount || isNaN(amt) || amt < 0)
      errs.salaryAmount = "Valid salary amount is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function toPayload(f: GradeForm, isEdit: boolean) {
    return {
      name: f.name.trim(),
      currency: f.currency || "PHP",
      salaryAmount: parseFloat(f.salaryAmount),
      effectiveDate: f.effectiveDate || null,
      ...(isEdit && { active: f.active }),
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowForm(true)
  }

  function openEdit(g: SalaryGrade) {
    setEditingId(g.id)
    setForm(gradeToForm(g))
    setErrors({})
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  function serverError(err: unknown, fallback: string): string {
    const axErr = err as AxiosError<{ error?: string; message?: string }>
    return axErr?.response?.data?.error ?? axErr?.response?.data?.message ?? fallback
  }

  function handleSubmit() {
    if (!validate()) return
    const payload = toPayload(form, !!editingId)
    if (editingId) {
      updateMut.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            closeForm()
            showToast("Salary grade updated.", "success")
          },
          onError: (err) => showToast(serverError(err, "Failed to update salary grade."), "error"),
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          closeForm()
          showToast("Salary grade created.", "success")
        },
        onError: (err) => showToast(serverError(err, "Failed to create salary grade."), "error"),
      })
    }
  }

  function handleDelete(g: SalaryGrade) {
    if (g.employeeCount > 0) {
      showToast(`Cannot delete — ${g.employeeCount} employee(s) are using this grade.`, "error")
      return
    }
    if (!confirm(`Delete "${g.name}"? This cannot be undone.`)) return
    deleteMut.mutate(g.id, {
      onSuccess: () => showToast("Grade deleted.", "success"),
      onError: () => showToast("Failed to delete.", "error"),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Salary Grades</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Define salary levels (e.g. Entry, Junior, Senior) with a fixed amount and effective date.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[11px] font-medium text-green-600 dark:text-green-400">
              {activeCount} active
            </span>
            {inactiveCount > 0 && (
              <span className="text-[11px] text-muted-foreground">{inactiveCount} archived</span>
            )}
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} className="mr-1.5" />
          New Grade
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex justify-end">
          <Toast msg={toast.msg} type={toast.type} />
        </div>
      )}

      {/* Filters */}
      {grades.length > 0 && (
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
              placeholder="Search grade name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["active", "inactive", "all"] as const).map((s) => (
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
                {s === "active"
                  ? `Active (${activeCount})`
                  : s === "inactive"
                    ? `Archived (${inactiveCount})`
                    : `All (${grades.length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : grades.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon icon={UserGroupIcon} size={22} strokeWidth={1.5} className="text-muted-foreground/60" />
          </div>
          <p className="text-[14px] font-semibold">No salary grades yet</p>
          <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
            Create your first grade to link salary levels to job positions.
          </p>
          <Button size="sm" className="mt-5" onClick={openCreate}>
            <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} className="mr-1.5" />
            New Grade
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-[13px] text-muted-foreground">
          No grades match your filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">Grade Name</th>
                  <th className="px-4 py-3 text-right">Salary Amount</th>
                  <th className="px-4 py-3 text-center">Effective Date</th>
                  <th className="px-4 py-3 text-center">Employees</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((g) => (
                  <tr
                    key={g.id}
                    className={cn(
                      "group transition-colors hover:bg-muted/30",
                      !g.active && "opacity-60"
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold">
                      {g.salaryAmount != null
                        ? `${currencySymbol(g.currency)}${g.salaryAmount.toLocaleString("en-PH")}`
                        : <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] text-muted-foreground">
                      {g.effectiveDate ?? <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        g.employeeCount > 0
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <HugeiconsIcon icon={UserGroupIcon} size={10} strokeWidth={2} />
                        {g.employeeCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                        g.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {g.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <ActionBtn
                          title="View"
                          icon={EyeIcon}
                          onClick={() => setViewingItem(g)}
                        />
                        <ActionBtn
                          title="Edit"
                          icon={PencilEdit01Icon}
                          onClick={() => openEdit(g)}
                          disabled={busy}
                        />
                        <ActionBtn
                          title={g.employeeCount > 0 ? "In use — cannot delete" : "Delete"}
                          icon={Delete02Icon}
                          onClick={() => handleDelete(g)}
                          disabled={busy || g.employeeCount > 0}
                          className="hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-2.5 text-right text-[11px] text-muted-foreground">
            {filtered.length} of {grades.length} grade{grades.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showForm && (
        <GradeModal
          editingId={editingId}
          form={form}
          errors={errors}
          busy={busy}
          onClose={closeForm}
          onSubmit={handleSubmit}
          setField={setField}
        />
      )}

      {/* View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingItem(null)} />
          <div className="relative w-full max-w-sm animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Salary Grade Details</h2>
              <button type="button" onClick={() => setViewingItem(null)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{viewingItem.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Salary Amount</span>
                <span className="font-medium font-mono">
                  {currencySymbol(viewingItem.currency)}{viewingItem.salaryAmount.toLocaleString("en-PH")}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-medium">{viewingItem.currency ?? "PHP"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Effective Date</span>
                <span className="font-medium">{viewingItem.effectiveDate ?? "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Employees</span>
                <span className="font-medium">{viewingItem.employeeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                  viewingItem.active
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {viewingItem.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
