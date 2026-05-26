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
  Archive01Icon,
  CheckmarkCircle01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  useSalaryGrades,
  useCreateSalaryGrade,
  useUpdateSalaryGrade,
  useDeleteSalaryGrade,
} from "@/hooks/use-employee-profile"
import type { SalaryGrade, SalaryTypeValue } from "@/lib/employee-profile-api"

// ── Constants ─────────────────────────────────────────────────────────────────

export const CURRENCIES = [
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
]

const SALARY_TYPES: { value: SalaryTypeValue; label: string; desc: string }[] = [
  { value: "MONTHLY", label: "Monthly", desc: "Corporate / office workers" },
  { value: "WEEKLY", label: "Weekly", desc: "Service industries" },
  { value: "DAILY", label: "Daily", desc: "Construction / labor" },
  { value: "HOURLY", label: "Hourly", desc: "VA / freelance / part-time" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number, currency = "PHP") {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    const sym = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency
    return `${sym}${amount.toLocaleString()}`
  }
}

function getCurrencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code
}

// ── Form types ────────────────────────────────────────────────────────────────

type GradeForm = {
  code: string
  name: string
  currency: string
  salaryType: SalaryTypeValue
  minSalary: string
  baseSalary: string
  maxSalary: string
  effectiveDate: string
}

type FormErrors = Partial<Record<keyof GradeForm, string>>

const EMPTY_FORM: GradeForm = {
  code: "",
  name: "",
  currency: "PHP",
  salaryType: "MONTHLY",
  minSalary: "",
  baseSalary: "",
  maxSalary: "",
  effectiveDate: "",
}

function gradeToForm(g: SalaryGrade): GradeForm {
  return {
    code: g.code,
    name: g.name ?? "",
    currency: g.currency ?? "PHP",
    salaryType: g.salaryType ?? "MONTHLY",
    minSalary: String(g.minSalary),
    baseSalary: String(g.baseSalary),
    maxSalary: String(g.maxSalary),
    effectiveDate: g.effectiveDate ?? "",
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-md",
        type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
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
  const [filterType, setFilterType] = useState<SalaryTypeValue | "all">("all")
  const [currencySearch, setCurrencySearch] = useState("")
  const [showCurrencySearch, setShowCurrencySearch] = useState(false)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return grades.filter((g) => {
      const matchSearch =
        !q ||
        g.code.toLowerCase().includes(q) ||
        (g.name ?? "").toLowerCase().includes(q)
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? g.active : !g.active)
      const matchType = filterType === "all" || g.salaryType === filterType
      return matchSearch && matchStatus && matchType
    })
  }, [grades, search, filterStatus, filterType])

  const filteredCurrencies = useMemo(
    () =>
      CURRENCIES.filter(
        (c) =>
          !currencySearch ||
          c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
          c.name.toLowerCase().includes(currencySearch.toLowerCase())
      ),
    [currencySearch]
  )

  // Summary counts
  const activeCount = grades.filter((g) => g.active).length
  const inactiveCount = grades.filter((g) => !g.active).length

  // Helpers
  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function setField(k: keyof GradeForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.code.trim()) {
      errs.code = "Grade code is required"
    } else {
      const dup = grades.find(
        (g) => g.code.trim().toUpperCase() === form.code.trim().toUpperCase() && g.id !== editingId
      )
      if (dup) errs.code = "This grade code already exists"
    }
    const min = parseFloat(form.minSalary)
    const base = parseFloat(form.baseSalary)
    const max = parseFloat(form.maxSalary)
    if (!form.minSalary || isNaN(min)) errs.minSalary = "Required"
    if (!form.baseSalary || isNaN(base)) errs.baseSalary = "Required"
    if (!form.maxSalary || isNaN(max)) errs.maxSalary = "Required"
    if (!isNaN(min) && !isNaN(max) && min > max)
      errs.minSalary = "Min cannot exceed max"
    if (!isNaN(base) && !isNaN(min) && !isNaN(max) && (base < min || base > max))
      errs.baseSalary = "Base must be between min and max"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function toPayload(f: GradeForm) {
    return {
      code: f.code.trim(),
      name: f.name.trim() || null,
      currency: f.currency,
      salaryType: f.salaryType,
      minSalary: parseFloat(f.minSalary),
      baseSalary: parseFloat(f.baseSalary),
      maxSalary: parseFloat(f.maxSalary),
      effectiveDate: f.effectiveDate || null,
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
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setCurrencySearch("")
  }

  function handleSubmit() {
    if (!validate()) return
    const payload = toPayload(form)
    if (editingId) {
      updateMut.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => { closeForm(); showToast("Salary grade updated successfully.", "success") },
          onError: () => showToast("Failed to update — code may already exist.", "error"),
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { closeForm(); showToast("Salary grade created successfully.", "success") },
        onError: () => showToast("Failed to create — code may already exist.", "error"),
      })
    }
  }

  function handleArchive(g: SalaryGrade) {
    updateMut.mutate(
      { id: g.id, payload: { active: !g.active } as never },
      {
        onSuccess: () =>
          showToast(g.active ? "Grade archived." : "Grade restored.", "success"),
      }
    )
  }

  function handleDelete(g: SalaryGrade) {
    if (g.employeeCount > 0) {
      showToast(`Cannot delete — ${g.employeeCount} employee(s) are using this grade.`, "error")
      return
    }
    if (!confirm(`Delete grade "${g.code}"? This cannot be undone.`)) return
    deleteMut.mutate(g.id, {
      onSuccess: () => showToast("Grade deleted.", "success"),
      onError: () => showToast("Failed to delete.", "error"),
    })
  }

  // Live salary preview
  const sym = getCurrencySymbol(form.currency)
  const previewMin = parseFloat(form.minSalary)
  const previewBase = parseFloat(form.baseSalary)
  const previewMax = parseFloat(form.maxSalary)
  const hasPreview = !isNaN(previewMin) && !isNaN(previewBase) && !isNaN(previewMax)

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Salary Grades</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Define pay bands per grade with currency and salary type support. Assign grades to job positions — payroll uses the base salary as computed base pay.
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
        {!showForm && (
          <Button size="sm" onClick={openCreate}>
            <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} className="mr-1.5" />
            New Grade
          </Button>
        )}
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="flex justify-end">
          <Toast msg={toast.msg} type={toast.type} />
        </div>
      )}

      {/* ── Add / Edit Form ───────────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[13px] font-semibold">
              {editingId ? "Edit Salary Grade" : "New Salary Grade"}
            </p>
            <Button variant="ghost" size="icon-sm" onClick={closeForm}>
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Row 1: Code + Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldWrap label="Grade Code *" error={errors.code}>
                <Input
                  autoFocus
                  className={cn("h-9 text-[13px] font-mono uppercase", errors.code && "border-destructive")}
                  placeholder="e.g. SG-1, G5, GRADE-A"
                  value={form.code}
                  onChange={(e) => setField("code", e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </FieldWrap>

              <FieldWrap label="Grade Name" error={errors.name}>
                <Input
                  className="h-9 text-[13px]"
                  placeholder="e.g. Entry Level, Senior"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </FieldWrap>

              <FieldWrap label="Effective Date" error={errors.effectiveDate}>
                <Input
                  type="date"
                  className="h-9 text-[13px]"
                  value={form.effectiveDate}
                  onChange={(e) => setField("effectiveDate", e.target.value)}
                />
              </FieldWrap>
            </div>

            {/* Row 2: Currency + Salary Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Currency with search */}
              <FieldWrap label="Currency *" error={errors.currency}>
                <div className="space-y-1">
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setField("currency", v)}
                    onOpenChange={setShowCurrencySearch}
                  >
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue>
                        <span className="font-mono">{form.currency}</span>
                        <span className="ml-2 text-muted-foreground">
                          {getCurrencySymbol(form.currency)} —{" "}
                          {CURRENCIES.find((c) => c.code === form.currency)?.name}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <div className="sticky top-0 z-10 bg-popover px-2 pb-1 pt-2">
                        <Input
                          className="h-7 text-[12px]"
                          placeholder="Search currency…"
                          value={currencySearch}
                          onChange={(e) => setCurrencySearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredCurrencies.map((c) => (
                        <SelectItem key={c.code} value={c.code} className="text-[13px]">
                          <span className="font-mono font-semibold">{c.code}</span>
                          <span className="ml-2 text-muted-foreground">
                            {c.symbol} — {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FieldWrap>

              <FieldWrap label="Salary Type *" error={errors.salaryType}>
                <Select
                  value={form.salaryType}
                  onValueChange={(v) => setField("salaryType", v as SalaryTypeValue)}
                >
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-[13px]">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>
            </div>

            {/* Row 3: Salary Range */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FieldWrap label={`Minimum Salary (${sym}) *`} error={errors.minSalary}>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-muted-foreground">
                    {sym}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    className={cn("h-9 pl-7 text-[13px]", errors.minSalary && "border-destructive")}
                    placeholder="0"
                    value={form.minSalary}
                    onChange={(e) => setField("minSalary", e.target.value)}
                  />
                </div>
              </FieldWrap>

              <FieldWrap label={`Base Salary (${sym}) *`} error={errors.baseSalary}>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-muted-foreground">
                    {sym}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    className={cn("h-9 pl-7 text-[13px] font-semibold", errors.baseSalary && "border-destructive")}
                    placeholder="0"
                    value={form.baseSalary}
                    onChange={(e) => setField("baseSalary", e.target.value)}
                  />
                </div>
              </FieldWrap>

              <FieldWrap label={`Maximum Salary (${sym}) *`} error={errors.maxSalary}>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-muted-foreground">
                    {sym}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    className={cn("h-9 pl-7 text-[13px]", errors.maxSalary && "border-destructive")}
                    placeholder="0"
                    value={form.maxSalary}
                    onChange={(e) => setField("maxSalary", e.target.value)}
                  />
                </div>
              </FieldWrap>
            </div>

            {/* Live preview strip */}
            {hasPreview && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-[12px]">
                <span className="font-medium text-muted-foreground">Preview:</span>
                <span className="text-muted-foreground">{fmtCurrency(previewMin, form.currency)}</span>
                <ArrowRightSmall />
                <span className="font-bold text-foreground">{fmtCurrency(previewBase, form.currency)}</span>
                <ArrowRightSmall />
                <span className="text-muted-foreground">{fmtCurrency(previewMax, form.currency)}</span>
                <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {SALARY_TYPES.find((t) => t.value === form.salaryType)?.label ?? form.salaryType}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">* Required fields</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={closeForm} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={busy}>
                <HugeiconsIcon icon={FloppyDiskIcon} size={13} strokeWidth={2} className="mr-1.5" />
                {busy ? "Saving…" : editingId ? "Update Grade" : "Save Grade"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Search + Filters ──────────────────────────────────────────────── */}
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
              placeholder="Search code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter pills */}
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

          {/* Salary type filter */}
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as SalaryTypeValue | "all")}
          >
            <SelectTrigger className="h-8 w-36 text-[12px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">All types</SelectItem>
              {SALARY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-[12px]">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : grades.length === 0 && !showForm ? (
        <EmptyState onAdd={openCreate} />
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
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Currency</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Min</th>
                  <th className="px-4 py-3 text-right">Base</th>
                  <th className="px-4 py-3 text-right">Max</th>
                  <th className="px-4 py-3 text-center">Employees</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((g) => (
                  <GradeRow
                    key={g.id}
                    grade={g}
                    onEdit={() => openEdit(g)}
                    onArchive={() => handleArchive(g)}
                    onDelete={() => handleDelete(g)}
                    busy={busy}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-2.5 text-right text-[11px] text-muted-foreground">
            {filtered.length} of {grades.length} grade{grades.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GradeRow({
  grade: g,
  onEdit,
  onArchive,
  onDelete,
  busy,
}: {
  grade: SalaryGrade
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  busy: boolean
}) {
  const currency = g.currency ?? "PHP"
  const salaryTypeLabel = SALARY_TYPES.find((t) => t.value === g.salaryType)?.label ?? g.salaryType

  return (
    <tr className={cn("group transition-colors hover:bg-muted/30", !g.active && "opacity-60")}>
      {/* Code */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
          {g.code}
        </span>
      </td>

      {/* Name */}
      <td className="px-4 py-3 text-muted-foreground">
        {g.name ?? <span className="opacity-40">—</span>}
      </td>

      {/* Currency */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold">{currency}</span>
          <span className="text-[11px] text-muted-foreground">
            {getCurrencySymbol(currency)}
          </span>
        </span>
      </td>

      {/* Salary Type */}
      <td className="px-4 py-3">
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">
          {salaryTypeLabel}
        </span>
      </td>

      {/* Min */}
      <td className="px-4 py-3 text-right font-mono text-[12px] text-muted-foreground">
        {fmtCurrency(g.minSalary, currency)}
      </td>

      {/* Base — highlighted */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-[13px] font-semibold text-foreground">
          {fmtCurrency(g.baseSalary, currency)}
        </span>
      </td>

      {/* Max */}
      <td className="px-4 py-3 text-right font-mono text-[12px] text-muted-foreground">
        {fmtCurrency(g.maxSalary, currency)}
      </td>

      {/* Employee count */}
      <td className="px-4 py-3 text-center">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            g.employeeCount > 0
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          <HugeiconsIcon icon={UserGroupIcon} size={10} strokeWidth={2} />
          {g.employeeCount}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            g.active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {g.active ? "Active" : "Archived"}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <ActionBtn
            title="Edit"
            icon={PencilEdit01Icon}
            onClick={onEdit}
            disabled={busy}
          />
          <ActionBtn
            title={g.active ? "Archive" : "Restore"}
            icon={g.active ? Archive01Icon : CheckmarkCircle01Icon}
            onClick={onArchive}
            disabled={busy}
            className={g.active ? "hover:text-amber-600" : "hover:text-green-600"}
          />
          <ActionBtn
            title={g.employeeCount > 0 ? "In use — cannot delete" : "Delete"}
            icon={Delete02Icon}
            onClick={onDelete}
            disabled={busy || g.employeeCount > 0}
            className="hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          />
        </div>
      </td>
    </tr>
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

function ArrowRightSmall() {
  return (
    <HugeiconsIcon
      icon={ArrowDown01Icon}
      size={10}
      strokeWidth={2}
      className="-rotate-90 text-muted-foreground"
    />
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <HugeiconsIcon
          icon={UserGroupIcon}
          size={22}
          strokeWidth={1.5}
          className="text-muted-foreground/60"
        />
      </div>
      <p className="text-[14px] font-semibold">No salary grades yet</p>
      <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
        Create your first pay band to connect positions and employees to a payroll structure.
      </p>
      <Button size="sm" className="mt-5" onClick={onAdd}>
        <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} className="mr-1.5" />
        New Grade
      </Button>
    </div>
  )
}
