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
  CheckmarkCircle01Icon,
  Money02Icon,
  EyeIcon,
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
  usePayrollSetups,
  useCreatePayrollSetup,
  useUpdatePayrollSetup,
  useDeletePayrollSetup,
  useJobPositions,
  useSalaryGrades,
} from "@/hooks/use-employee-profile"
import type {
  PayrollSetup,
  CompensationBasis,
  DeductionSchedule,
  DeductionAmountType,
  PayrollSetupLineItem,
  JobPosition,
} from "@/lib/employee-profile-api"
import { currencySymbol } from "@/lib/employee-profile-api"

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPENSATION_BASIS_OPTIONS: { value: CompensationBasis; label: string }[] = [
  { value: "DAILY",        label: "Daily" },
  { value: "WEEKLY",       label: "Weekly" },
  { value: "SEMI_MONTHLY", label: "Semi-Monthly" },
  { value: "MONTHLY",      label: "Monthly" },
  { value: "YEARLY",       label: "Yearly" },
  { value: "CONTRACTUAL",  label: "Contractual" },
]

const CUTOFF_PERIOD_OPTIONS: Record<CompensationBasis, string[]> = {
  DAILY:        ["End of day", "Every day"],
  WEEKLY:       ["Every Friday", "Every Saturday", "Every Sunday", "Every Monday", "Every Thursday"],
  SEMI_MONTHLY: ["15th & Last day of month", "1st & 16th of month", "10th & 25th of month", "5th & 20th of month"],
  MONTHLY:      ["Last day of month", "1st of month", "15th of month", "25th of month", "30th of month"],
  YEARLY:       ["Last day of December", "End of fiscal year"],
  CONTRACTUAL:  ["Upon completion", "Per milestone", "As agreed"],
}

const DEDUCTION_SCHEDULE_OPTIONS: { value: DeductionSchedule; label: string; sub: string }[] = [
  { value: "EVERY_PAYROLL",  label: "Every payroll",    sub: "Every cutoff period" },
  { value: "FIRST_PAYROLL",  label: "1st payroll only", sub: "First cutoff of the month" },
  { value: "SECOND_PAYROLL", label: "2nd payroll only", sub: "Second cutoff of the month" },
  { value: "MONTHLY",        label: "Monthly",          sub: "Once per month" },
  { value: "QUARTERLY",      label: "Quarterly",        sub: "Once every quarter" },
  { value: "ANNUAL",         label: "Annual",           sub: "Once per year" },
]

const DEDUCTION_PRESETS: { value: string; label: string; group: string }[] = [
  { value: "SSS Contribution",        label: "SSS Contribution",            group: "Government" },
  { value: "PhilHealth Contribution", label: "PhilHealth Contribution",     group: "Government" },
  { value: "Pag-IBIG Contribution",   label: "Pag-IBIG / HDMF Contribution",group: "Government" },
  { value: "Withholding Tax",         label: "Withholding Tax (BIR)",       group: "Government" },
  { value: "SSS Loan",                label: "SSS Loan",                    group: "Loans" },
  { value: "Pag-IBIG Loan",           label: "Pag-IBIG Loan",               group: "Loans" },
  { value: "Salary Loan",             label: "Salary Loan",                 group: "Loans" },
  { value: "Cash Advance",            label: "Cash Advance",                group: "Loans" },
  { value: "__custom__",              label: "Custom…",                     group: "" },
]

const PRESET_VALUES = new Set(DEDUCTION_PRESETS.map((p) => p.value).filter((v) => v !== "__custom__"))

// ── Form types ────────────────────────────────────────────────────────────────

type AllowanceDraft = { name: string; amount: string }
type DeductionDraft = {
  preset: string
  name: string
  amount: string
  amountType: DeductionAmountType
  schedule: DeductionSchedule
}

type SetupForm = {
  jobPositionId: string
  salaryGradeId: string
  compensationBasis: CompensationBasis
  cutoffPeriod: string
  overtimeEligible: boolean
  overtimeRate: string
  allowances: AllowanceDraft[]
  deductions: DeductionDraft[]
  effectiveDate: string
  active: boolean
}

type FormErrors = Partial<Record<keyof Omit<SetupForm, "allowances" | "deductions">, string>>

const EMPTY_FORM: SetupForm = {
  jobPositionId: "",
  salaryGradeId: "",
  compensationBasis: "MONTHLY",
  cutoffPeriod: "",
  overtimeEligible: false,
  overtimeRate: "1.25",
  allowances: [],
  deductions: [],
  effectiveDate: "",
  active: true,
}

function setupToForm(s: PayrollSetup): SetupForm {
  return {
    jobPositionId: String(s.jobPositionId),
    salaryGradeId: String(s.salaryGradeId),
    compensationBasis: s.compensationBasis,
    cutoffPeriod: s.cutoffPeriod,
    overtimeEligible: s.overtimeEligible,
    overtimeRate: String(s.overtimeRate),
    allowances: s.allowances.map((a) => ({ name: a.name, amount: String(a.amount) })),
    deductions: s.deductions.map((d) => ({
      preset: PRESET_VALUES.has(d.name) ? d.name : "__custom__",
      name: d.name,
      amount: String(d.amount),
      amountType: (d.amountType ?? "FIXED") as DeductionAmountType,
      schedule: (d.schedule ?? "EVERY_PAYROLL") as DeductionSchedule,
    })),
    effectiveDate: s.effectiveDate ?? "",
    active: s.active,
  }
}

function allowancesToPayload(items: AllowanceDraft[]): PayrollSetupLineItem[] {
  return items
    .filter((i) => i.name.trim() && i.amount)
    .map((i) => ({ name: i.name.trim(), amount: parseFloat(i.amount) || 0 }))
}

function deductionsToPayload(items: DeductionDraft[]): PayrollSetupLineItem[] {
  return items
    .filter((i) => i.name.trim() && i.amount)
    .map((i) => ({
      name: i.name.trim(),
      amount: parseFloat(i.amount) || 0,
      amountType: i.amountType,
      schedule: i.schedule,
    }))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-md",
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      <HugeiconsIcon icon={type === "success" ? CheckmarkCircle01Icon : Cancel01Icon} size={14} strokeWidth={2} />
      {msg}
    </div>
  )
}

function FieldWrap({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
      {children}
    </p>
  )
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-4">
      {children}
    </div>
  )
}

function AllowancesEditor({ items, onChange, symbol }: { items: AllowanceDraft[]; onChange: (v: AllowanceDraft[]) => void; symbol: string }) {
  function add() { onChange([...items, { name: "", amount: "" }]) }
  function remove(idx: number) { onChange(items.filter((_, i) => i !== idx)) }
  function update(idx: number, field: keyof AllowanceDraft, value: string) {
    onChange(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed py-4 text-center text-[12px] italic text-muted-foreground">
          No allowances added
        </p>
      ) : (
        items.map((item, idx) => (
          <div key={idx} className="flex min-w-0 items-center gap-2">
            <Input
              className="h-8 min-w-0 flex-1 text-[13px]"
              placeholder="e.g. Transportation, Meal, Rice…"
              value={item.name}
              onChange={(e) => update(idx, "name", e.target.value)}
            />
            <div className="relative w-32 shrink-0">
              <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[12px] text-muted-foreground">{symbol}</span>
              <Input
                type="number" min={0}
                className="h-8 pl-6 text-[13px]"
                placeholder="0"
                value={item.amount}
                onChange={(e) => update(idx, "amount", e.target.value)}
              />
            </div>
            <button type="button" onClick={() => remove(idx)}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
              <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={2} />
            </button>
          </div>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 text-[12px]">
        <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} className="mr-1" />
        Add Allowance
      </Button>
    </div>
  )
}

function DeductionsEditor({ items, onChange, symbol }: { items: DeductionDraft[]; onChange: (v: DeductionDraft[]) => void; symbol: string }) {
  function add() {
    onChange([...items, { preset: "", name: "", amount: "", amountType: "FIXED", schedule: "EVERY_PAYROLL" }])
  }
  function remove(idx: number) { onChange(items.filter((_, i) => i !== idx)) }

  function updatePreset(idx: number, preset: string) {
    onChange(items.map((item, i) =>
      i === idx ? { ...item, preset, name: preset === "__custom__" ? "" : preset } : item
    ))
  }

  function update(idx: number, field: keyof DeductionDraft, value: string) {
    onChange(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  function toggleAmountType(idx: number) {
    onChange(items.map((item, i) =>
      i === idx
        ? { ...item, amountType: item.amountType === "FIXED" ? "PERCENTAGE" : "FIXED", amount: "" }
        : item
    ))
  }

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed py-4 text-center text-[12px] italic text-muted-foreground">
          No deductions added
        </p>
      ) : (
        items.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Select value={item.preset} onValueChange={(v) => updatePreset(idx, v)}>
                <SelectTrigger className={cn(
                  "h-8 min-w-0 text-[13px]",
                  item.preset === "__custom__" ? "w-36 shrink-0" : "flex-1"
                )}>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {["Government", "Loans"].map((group) => (
                    <div key={group}>
                      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {group}
                      </div>
                      {DEDUCTION_PRESETS.filter((p) => p.group === group).map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-[13px] pl-4">
                          {p.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                  <div className="my-1 border-t" />
                  <SelectItem value="__custom__" className="text-[13px] italic text-muted-foreground">
                    Custom…
                  </SelectItem>
                </SelectContent>
              </Select>

              {item.preset === "__custom__" && (
                <Input
                  className="h-8 min-w-0 flex-1 text-[13px]"
                  placeholder="Deduction name…"
                  value={item.name}
                  onChange={(e) => update(idx, "name", e.target.value)}
                  autoFocus
                />
              )}

              <div className="flex h-8 w-36 shrink-0 overflow-hidden rounded-lg border">
                <button
                  type="button"
                  title={item.amountType === "FIXED" ? "Switch to % of salary" : "Switch to fixed amount"}
                  onClick={() => toggleAmountType(idx)}
                  className="flex w-9 shrink-0 items-center justify-center border-r bg-muted/60 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.amountType === "FIXED" ? symbol : "%"}
                </button>
                <Input
                  type="number"
                  min={0}
                  max={item.amountType === "PERCENTAGE" ? 100 : undefined}
                  step={item.amountType === "PERCENTAGE" ? 0.01 : undefined}
                  className="h-full flex-1 rounded-none border-0 px-2 text-[13px] shadow-none focus-visible:ring-0"
                  placeholder={item.amountType === "PERCENTAGE" ? "0.00" : "0"}
                  value={item.amount}
                  onChange={(e) => update(idx, "amount", e.target.value)}
                />
              </div>

              <button type="button" onClick={() => remove(idx)}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={2} />
              </button>
            </div>

            {item.preset && (
              <div className="flex items-center gap-2 rounded-md bg-background/60 px-2.5 py-1.5">
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground">When deducted</span>
                <div className="h-3 w-px bg-border/60" />
                <Select value={item.schedule} onValueChange={(v) => update(idx, "schedule", v)}>
                  <SelectTrigger className="h-6 flex-1 border-0 bg-transparent p-0 text-[12px] shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_SCHEDULE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-[12px]">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-medium">{o.label}</span>
                          <span className="text-[10px] text-muted-foreground">{o.sub}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 text-[12px]">
        <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} className="mr-1" />
        Add Deduction
      </Button>
    </div>
  )
}

function scheduleLabel(s: DeductionSchedule | null | undefined) {
  if (!s || s === "EVERY_PAYROLL") return null
  return DEDUCTION_SCHEDULE_OPTIONS.find((o) => o.value === s)?.label ?? s
}

// ── Payroll Setup Modal ───────────────────────────────────────────────────────

function SetupModal({
  editingId,
  form,
  errors,
  busy,
  positions,
  grades,
  onClose,
  onSubmit,
  setField,
}: {
  editingId: number | null
  form: SetupForm
  errors: FormErrors
  busy: boolean
  positions: JobPosition[]
  grades: { id: number; name: string; currency?: string; salaryAmount?: number; active: boolean }[]
  onClose: () => void
  onSubmit: () => void
  setField: <K extends keyof SetupForm>(k: K, v: SetupForm[K]) => void
}) {
  const cutoffOptions = CUTOFF_PERIOD_OPTIONS[form.compensationBasis] ?? []
  const selectedGrade = grades.find((g) => String(g.id) === form.salaryGradeId)
  const selectedGradeCurrency = selectedGrade?.currency
  const symbol = currencySymbol(selectedGradeCurrency)
  const selectedPosition = positions.find((p) => String(p.id) === form.jobPositionId)
  const positionHasGrade = !!(selectedPosition && (
    selectedPosition.salaryGradeId
    ?? selectedPosition.salaryGrades?.find((g) => g.isDefault)?.id
    ?? selectedPosition.salaryGrades?.[0]?.id
  ))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative flex w-full max-w-3xl animate-in flex-col rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in" style={{ maxHeight: "90vh" }}>
        {/* Header — fixed */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-[15px] font-semibold">
            {editingId ? "Edit Payroll Setup" : "New Payroll Setup"}
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
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Position & Grade */}
          <FormCard>
            <SectionLabel>Position & Grade</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrap label="Job Position *" error={errors.jobPositionId}>
                <Select value={form.jobPositionId} onValueChange={(v) => setField("jobPositionId", v)}>
                  <SelectTrigger className={cn("h-9 text-[13px]", errors.jobPositionId && "border-destructive")}>
                    <SelectValue placeholder="Select position…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {positions.filter((p) => p.active || String(p.id) === form.jobPositionId).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} className="text-[13px]">
                        {p.title}{p.department ? ` · ${p.department}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>

              <FieldWrap label="Salary Grade *" error={errors.salaryGradeId}>
                {positionHasGrade ? (
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-[13px] cursor-not-allowed">
                    <span className="flex-1 truncate text-foreground">
                      {selectedGrade
                        ? `${selectedGrade.name}${selectedGrade.salaryAmount != null ? ` — ${currencySymbol(selectedGrade.currency)}${selectedGrade.salaryAmount.toLocaleString("en-PH")}` : ""}`
                        : "—"}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      from position
                    </span>
                  </div>
                ) : (
                  <Select value={form.salaryGradeId} onValueChange={(v) => setField("salaryGradeId", v)}>
                    <SelectTrigger className={cn("h-9 text-[13px]", errors.salaryGradeId && "border-destructive")}>
                      <SelectValue placeholder="Select grade…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {grades.filter((g) => g.active || String(g.id) === form.salaryGradeId).map((g) => (
                        <SelectItem key={g.id} value={String(g.id)} className="text-[13px]">
                          {g.name}
                          {g.salaryAmount != null && (
                            <span className="ml-2 text-muted-foreground">
                              — {currencySymbol(g.currency)}{g.salaryAmount.toLocaleString("en-PH")}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldWrap>
            </div>
          </FormCard>

          {/* Compensation */}
          <FormCard>
            <SectionLabel>Compensation</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrap label="Compensation Basis *" error={errors.compensationBasis}>
                <Select value={form.compensationBasis} onValueChange={(v) => setField("compensationBasis", v as CompensationBasis)}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPENSATION_BASIS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>

              <FieldWrap label="Cutoff Period *" error={errors.cutoffPeriod}>
                <Select value={form.cutoffPeriod} onValueChange={(v) => setField("cutoffPeriod", v)}>
                  <SelectTrigger className={cn("h-9 text-[13px]", errors.cutoffPeriod && "border-destructive")}>
                    <SelectValue placeholder="Select cutoff period…" />
                  </SelectTrigger>
                  <SelectContent>
                    {cutoffOptions.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-[13px]">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>
            </div>
          </FormCard>

          {/* Overtime */}
          <FormCard>
            <SectionLabel>Overtime</SectionLabel>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2.5">
                <button
                  type="button" role="switch" aria-checked={form.overtimeEligible}
                  onClick={() => setField("overtimeEligible", !form.overtimeEligible)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors",
                    form.overtimeEligible ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                    form.overtimeEligible ? "translate-x-4" : "translate-x-0"
                  )} />
                </button>
                <span className="text-[13px] text-foreground">Overtime Eligible</span>
              </label>

              {form.overtimeEligible && (
                <FieldWrap label="Rate multiplier" error={errors.overtimeRate}>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={1} step={0.05}
                      className={cn("h-9 w-28 text-[13px]", errors.overtimeRate && "border-destructive")}
                      placeholder="1.25"
                      value={form.overtimeRate}
                      onChange={(e) => setField("overtimeRate", e.target.value)}
                    />
                    <span className="text-[12px] text-muted-foreground">× hourly rate</span>
                  </div>
                </FieldWrap>
              )}
            </div>
          </FormCard>

          {/* Allowances */}
          <FormCard>
            <SectionLabel>Allowances</SectionLabel>
            <AllowancesEditor
              items={form.allowances}
              onChange={(v) => setField("allowances", v)}
              symbol={symbol}
            />
          </FormCard>

          {/* Deductions */}
          <FormCard>
            <SectionLabel>Deductions</SectionLabel>
            <DeductionsEditor
              items={form.deductions}
              onChange={(v) => setField("deductions", v)}
              symbol={symbol}
            />
          </FormCard>

          {/* Effectivity + Status */}
          <FormCard>
            <SectionLabel>Effectivity</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrap label="Effective Date">
                <Input
                  type="date" className="h-9 text-[13px]"
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
          </FormCard>
        </div>

        {/* Footer — fixed */}
        <div className="flex shrink-0 items-center justify-between border-t px-6 py-4">
          <p className="text-[11px] text-muted-foreground">* Required fields</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button size="sm" onClick={onSubmit} disabled={busy}>
              <HugeiconsIcon icon={FloppyDiskIcon} size={13} strokeWidth={2} className="mr-1.5" />
              {busy ? "Saving…" : editingId ? "Update Setup" : "Save Setup"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PayrollSetupSection() {
  const { data: setups = [], isLoading } = usePayrollSetups()
  const { data: positions = [] } = useJobPositions()
  const { data: grades = [] } = useSalaryGrades()
  const createMut = useCreatePayrollSetup()
  const updateMut = useUpdatePayrollSetup()
  const deleteMut = useDeletePayrollSetup()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<SetupForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive" | "all">("active")
  const [viewingItem, setViewingItem] = useState<PayrollSetup | null>(null)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return setups.filter((s) => {
      const matchSearch = !q || s.jobPositionTitle.toLowerCase().includes(q) || s.salaryGradeName.toLowerCase().includes(q)
      const matchStatus = filterStatus === "all" || (filterStatus === "active" ? s.active : !s.active)
      return matchSearch && matchStatus
    })
  }, [setups, search, filterStatus])

  const activeCount = setups.filter((s) => s.active).length
  const inactiveCount = setups.filter((s) => !s.active).length

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function setField<K extends keyof SetupForm>(k: K, v: SetupForm[K]) {
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (k === "compensationBasis") next.cutoffPeriod = ""
      if (k === "jobPositionId") {
        const pos = positions.find((p) => String(p.id) === String(v))
        const gradeId = pos?.salaryGradeId
          ?? pos?.salaryGrades?.find((g) => g.isDefault)?.id
          ?? pos?.salaryGrades?.[0]?.id
        if (gradeId) next.salaryGradeId = String(gradeId)
      }
      return next
    })
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.jobPositionId) errs.jobPositionId = "Job position is required"
    if (!form.salaryGradeId) errs.salaryGradeId = "Salary grade is required"
    if (!form.cutoffPeriod.trim()) errs.cutoffPeriod = "Cutoff period is required"
    if (form.overtimeEligible && (!form.overtimeRate || isNaN(parseFloat(form.overtimeRate))))
      errs.overtimeRate = "Valid OT rate is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function toPayload(f: SetupForm, isEdit: boolean) {
    return {
      jobPositionId: parseInt(f.jobPositionId),
      salaryGradeId: parseInt(f.salaryGradeId),
      compensationBasis: f.compensationBasis,
      cutoffPeriod: f.cutoffPeriod.trim(),
      overtimeEligible: f.overtimeEligible,
      overtimeRate: parseFloat(f.overtimeRate) || 0,
      allowances: allowancesToPayload(f.allowances),
      deductions: deductionsToPayload(f.deductions),
      effectiveDate: f.effectiveDate || null,
      ...(isEdit && { active: f.active }),
    }
  }

  function openCreate() { setEditingId(null); setForm(EMPTY_FORM); setErrors({}); setShowForm(true) }
  function openEdit(s: PayrollSetup) {
    setEditingId(s.id); setForm(setupToForm(s)); setErrors({}); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setErrors({}) }

  function handleSubmit() {
    if (!validate()) return
    const payload = toPayload(form, !!editingId)
    if (editingId) {
      updateMut.mutate({ id: editingId, payload }, {
        onSuccess: () => { closeForm(); showToast("Payroll setup updated.", "success") },
        onError: () => showToast("Failed to update payroll setup.", "error"),
      })
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { closeForm(); showToast("Payroll setup created.", "success") },
        onError: () => showToast("Failed to create payroll setup.", "error"),
      })
    }
  }

  function handleDelete(s: PayrollSetup) {
    if (!confirm(`Delete payroll setup for "${s.jobPositionTitle}"? This cannot be undone.`)) return
    deleteMut.mutate(s.id, {
      onSuccess: () => showToast("Payroll setup deleted.", "success"),
      onError: () => showToast("Failed to delete.", "error"),
    })
  }

  const basisLabel = (b: CompensationBasis) =>
    COMPENSATION_BASIS_OPTIONS.find((o) => o.value === b)?.label ?? b

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Payroll Setup</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Link job positions to salary grades and define compensation rules, cutoff periods, overtime, allowances, and deductions.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[11px] font-medium text-green-600 dark:text-green-400">{activeCount} active</span>
            {inactiveCount > 0 && <span className="text-[11px] text-muted-foreground">{inactiveCount} archived</span>}
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} className="mr-1.5" />
          New Setup
        </Button>
      </div>

      {/* Toast */}
      {toast && <div className="flex justify-end"><Toast msg={toast.msg} type={toast.type} /></div>}

      {/* Filters */}
      {setups.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1" style={{ minWidth: 200 }}>
            <HugeiconsIcon icon={Search01Icon} size={13} strokeWidth={2} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 text-[13px]" placeholder="Search position or grade…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5">
            {(["active", "inactive", "all"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setFilterStatus(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                  filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}>
                {s === "active" ? `Active (${activeCount})` : s === "inactive" ? `Archived (${inactiveCount})` : `All (${setups.length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : setups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon icon={Money02Icon} size={22} strokeWidth={1.5} className="text-muted-foreground/60" />
          </div>
          <p className="text-[14px] font-semibold">No payroll setups yet</p>
          <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">Create a setup to define how each job position is compensated.</p>
          <Button size="sm" className="mt-5" onClick={openCreate}>
            <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} className="mr-1.5" />New Setup
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-[13px] text-muted-foreground">No setups match your filters.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">Job Position</th>
                  <th className="px-4 py-3 text-left">Salary Grade</th>
                  <th className="px-4 py-3 text-left">Basis</th>
                  <th className="px-4 py-3 text-left">Cutoff Period</th>
                  <th className="px-4 py-3 text-center">OT</th>
                  <th className="px-4 py-3 text-center">Allow.</th>
                  <th className="px-4 py-3 text-center">Deduct.</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((s) => (
                  <tr key={s.id} className={cn("group transition-colors hover:bg-muted/30", !s.active && "opacity-60")}>
                    <td className="px-4 py-3 font-medium">{s.jobPositionTitle}</td>
                    <td className="px-4 py-3">
                      <div className="text-[13px]">{s.salaryGradeName}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {s.salaryAmount != null
                          ? `${currencySymbol(grades.find((g) => g.id === s.salaryGradeId)?.currency)}${s.salaryAmount.toLocaleString("en-PH")}`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{basisLabel(s.compensationBasis)}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{s.cutoffPeriod}</td>
                    <td className="px-4 py-3 text-center">
                      {s.overtimeEligible ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {s.overtimeRate}×
                        </span>
                      ) : <span className="text-[11px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.allowances.length > 0 ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {s.allowances.length}
                        </span>
                      ) : <span className="text-[12px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.deductions.length > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {s.deductions.length}
                          </span>
                          {s.deductions.some((d) => d.schedule && d.schedule !== "EVERY_PAYROLL") && (
                            <span className="text-[10px] text-muted-foreground">mixed</span>
                          )}
                        </div>
                      ) : <span className="text-[12px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                        s.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" title="View" onClick={() => setViewingItem(s)}
                          className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                        </button>
                        <button type="button" title="Edit" onClick={() => openEdit(s)} disabled={busy}
                          className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30">
                          <HugeiconsIcon icon={PencilEdit01Icon} size={12} strokeWidth={2} />
                        </button>
                        <button type="button" title="Delete" onClick={() => handleDelete(s)} disabled={busy}
                          className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 disabled:opacity-30">
                          <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-2.5 text-right text-[11px] text-muted-foreground">
            {filtered.length} of {setups.length} setup{setups.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showForm && (
        <SetupModal
          editingId={editingId}
          form={form}
          errors={errors}
          busy={busy}
          positions={positions}
          grades={grades}
          onClose={closeForm}
          onSubmit={handleSubmit}
          setField={setField}
        />
      )}

      {/* View Modal */}
      {viewingItem && (() => {
        const gradeCurrency = grades.find((g) => g.id === viewingItem.salaryGradeId)?.currency
        const sym = currencySymbol(gradeCurrency)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingItem(null)} />
            <div className="relative flex w-full max-w-lg animate-in flex-col rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in" style={{ maxHeight: "85vh" }}>
              <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                <h2 className="text-[15px] font-semibold">Payroll Setup Details</h2>
                <button type="button" onClick={() => setViewingItem(null)}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-[13px]">
                {/* Position & Grade */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Position & Grade</p>
                  <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Job Position</span>
                      <span className="font-medium">{viewingItem.jobPositionTitle}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Salary Grade</span>
                      <span className="font-medium">
                        {viewingItem.salaryGradeName}
                        {viewingItem.salaryAmount != null && (
                          <span className="ml-1.5 text-muted-foreground font-mono">
                            — {sym}{viewingItem.salaryAmount.toLocaleString("en-PH")}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Compensation */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Compensation</p>
                  <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Basis</span>
                      <span className="font-medium">{basisLabel(viewingItem.compensationBasis)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Cutoff Period</span>
                      <span className="font-medium">{viewingItem.cutoffPeriod}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Overtime</span>
                      <span className="font-medium">
                        {viewingItem.overtimeEligible ? `Eligible · ${viewingItem.overtimeRate}× rate` : "Not eligible"}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Allowances */}
                {viewingItem.allowances.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Allowances</p>
                    <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                      {viewingItem.allowances.map((a, i) => (
                        <div key={i} className="flex justify-between px-3 py-2">
                          <span className="text-muted-foreground">{a.name}</span>
                          <span className="font-medium font-mono">{sym}{a.amount.toLocaleString("en-PH")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Deductions */}
                {viewingItem.deductions.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Deductions</p>
                    <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                      {viewingItem.deductions.map((d, i) => (
                        <div key={i} className="flex justify-between px-3 py-2">
                          <div>
                            <span className="text-muted-foreground">{d.name}</span>
                            {scheduleLabel(d.schedule) && (
                              <span className="ml-1.5 text-[11px] text-muted-foreground/70">· {scheduleLabel(d.schedule)}</span>
                            )}
                          </div>
                          <span className="font-medium font-mono">
                            {d.amountType === "PERCENTAGE" ? `${d.amount}%` : `${sym}${d.amount.toLocaleString("en-PH")}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Meta */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Effectivity</p>
                  <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                    {viewingItem.effectiveDate && (
                      <div className="flex justify-between px-3 py-2">
                        <span className="text-muted-foreground">Effective Date</span>
                        <span className="font-medium">{viewingItem.effectiveDate}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-3 py-2">
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
            </div>
          </div>
        )
      })()}
    </div>
  )
}
