"use client"

import { useState } from "react"
import type { Employee } from "@/lib/types"
import { attendanceRecords } from "@/lib/mock-data"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PencilEdit01Icon,
  Tick02Icon,
  Cancel01Icon,
  Add01Icon,
  Delete02Icon,
  Calendar01Icon,
  BriefcaseIcon,
  Target01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  Alert01Icon,
  Award01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import {
  useEmployeeAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useEmployeeKpis,
  useCreateKpi,
  useUpdateKpi,
  useDeleteKpi,
  useEmployeeMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  useJobPositions,
  useUserPositions,
  useAssignPosition,
  useRemovePosition,
  useSetPrimaryPosition,
} from "@/hooks/use-employee-profile"
import {
  ASSIGNMENT_TYPE_LABEL,
  ASSIGNMENT_TYPE_COLOR,
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUS_VARIANT,
  KPI_STATUS_LABEL,
  KPI_STATUS_VARIANT,
  MILESTONE_TYPE_LABEL,
  MILESTONE_TYPES,
  MILESTONE_TYPE_STYLE,
  type AssignmentType,
  type AssignmentStatus,
  type KpiStatus,
  type MilestoneType,
  type EmployeeAssignment,
  type EmployeeKpi,
  type EmployeeCareerMilestone,
} from "@/lib/employee-profile-api"

interface Props {
  employee: Employee
  employeeId: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ASSIGNMENT_TYPES: AssignmentType[] = [
  "PROJECT", "TEAM", "SERVICE_AREA", "BRANCH", "WORKSTATION", "OPERATIONAL_ROLE",
]
const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["ACTIVE", "UPCOMING", "ON_HOLD", "COMPLETED"]
const KPI_STATUSES: KpiStatus[] = ["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"]

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

const MOCK_ATTENDANCE = [
  { present: 18, late: 1, absent: 0, leave: 1, ot: 4.5, workDays: 20 },
  { present: 16, late: 2, absent: 1, leave: 1, ot: 3.25, workDays: 20 },
  { present: 17, late: 2, absent: 0, leave: 2, ot: 6.75, workDays: 21 },
  { present: 13, late: 1, absent: 1, leave: 2, ot: 2.5, workDays: 17 },
]

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function daysUntil(deadline: string): number {
  const now = new Date()
  const d = new Date(deadline + "T00:00:00")
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}

function calcTenure(startDate: string): { years: number; months: number; totalMonths: number } {
  const start = new Date(startDate + "T00:00:00")
  const now = new Date()
  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  if (now.getDate() < start.getDate()) months--
  if (months < 0) { years--; months += 12 }
  return { years, months, totalMonths: years * 12 + months }
}

function fmtHireDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-[13px]">{value || "—"}</span>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <Input
        type={type}
        className="h-8 text-[13px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-muted-foreground">{icon}</span>
          )}
          <h3 className="text-[13px] font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Work Record ───────────────────────────────────────────────────────────────

type MilestoneForm = {
  type: MilestoneType
  title: string
  date: string
  notes: string
}

const BLANK_MILESTONE: MilestoneForm = {
  type: "PROMOTION",
  title: "",
  date: new Date().toISOString().split("T")[0]!,
  notes: "",
}

function MilestoneFormRow({
  f,
  setF,
  onSave,
  onCancel,
  busy,
}: {
  f: MilestoneForm
  setF: (v: MilestoneForm) => void
  onSave: () => void
  onCancel: () => void
  busy: boolean
}) {
  const { data: positions = [], isLoading: posLoading } = useJobPositions()
  const isPromotion = f.type === "PROMOTION"

  // Group positions by department for the optgroup display
  const grouped = positions.reduce<Record<string, typeof positions>>((acc, p) => {
    const dept = p.department ?? "General"
    if (!acc[dept]) acc[dept] = []
    acc[dept]!.push(p)
    return acc
  }, {})

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Type */}
        <div>
          <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Type</label>
          <select
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value as MilestoneType, title: "" })}
            className="h-8 w-full rounded-lg border bg-background px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MILESTONE_TYPES.map((t) => (
              <option key={t} value={t}>{MILESTONE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>

        {/* Title — dropdown when Promotion, free text otherwise */}
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {isPromotion ? "Promoted To" : "Title"}
            </label>
            {isPromotion && (
              <span className="text-[10px] text-muted-foreground">
                {posLoading ? "Loading…" : `${positions.length} role${positions.length !== 1 ? "s" : ""} available`}
              </span>
            )}
          </div>

          {isPromotion ? (
            positions.length === 0 && !posLoading ? (
              <div className="flex h-8 items-center gap-2 rounded-lg border border-dashed bg-background px-2">
                <span className="text-[12px] text-muted-foreground">No positions configured.</span>
                <span className="text-[11px] text-muted-foreground/60">Add from Configuration → Positions.</span>
              </div>
            ) : (
              <select
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                disabled={posLoading}
                className="h-8 w-full rounded-lg border bg-background px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">— Select position —</option>
                {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dept, deptPositions]) => (
                  <optgroup key={dept} label={dept}>
                    {deptPositions.map((p) => (
                      <option key={p.id} value={p.title}>
                        {p.title}{p.level ? ` (${p.level})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )
          ) : (
            <Input
              className="h-8 text-[13px]"
              placeholder={
                f.type === "HIRED" ? "e.g. Joined as Junior Developer…"
                : f.type === "REGULAR" ? "e.g. Regularized as Frontend Engineer…"
                : f.type === "TRANSFER" ? "e.g. Transferred to Design Team…"
                : f.type === "AWARD" ? "e.g. Employee of the Month…"
                : f.type === "TRAINING" ? "e.g. Completed AWS Certification…"
                : "Milestone title…"
              }
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          )}
        </div>

        {/* Date */}
        <div>
          <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Date</label>
          <Input type="date" className="h-8 text-[13px]" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Notes (optional)</label>
        <Input
          className="h-8 text-[13px]"
          placeholder="Additional context…"
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button size="xs" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button size="xs" onClick={onSave} disabled={busy || !f.title.trim()}>Save</Button>
      </div>
    </div>
  )
}

function WorkRecordCard({
  startDate,
  employeeId,
}: {
  startDate: string
  employeeId: number
}) {
  const { years, months, totalMonths } = calcTenure(startDate)

  const tenureLabel =
    totalMonths === 0
      ? "Just started"
      : years === 0
        ? `${months} month${months !== 1 ? "s" : ""}`
        : months === 0
          ? `${years} year${years !== 1 ? "s" : ""}`
          : `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`

  const seniorityLabel =
    totalMonths < 3 ? "Onboarding"
    : totalMonths < 6 ? "Probationary"
    : totalMonths < 12 ? "Junior"
    : totalMonths < 36 ? "Regular"
    : totalMonths < 60 ? "Senior"
    : "Veteran"

  const seniorityColor =
    totalMonths < 3
      ? "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
      : totalMonths < 6
        ? "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700"
        : totalMonths < 12
          ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
          : totalMonths < 36
            ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
            : totalMonths < 60
              ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
              : "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"

  // Milestones
  const { data: milestones = [], isLoading: mlLoading } = useEmployeeMilestones(employeeId)
  const createMut = useCreateMilestone(employeeId)
  const updateMut = useUpdateMilestone(employeeId)
  const deleteMut = useDeleteMilestone(employeeId)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<MilestoneForm>(BLANK_MILESTONE)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<MilestoneForm>(BLANK_MILESTONE)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  function handleCreate() {
    if (!form.title.trim()) return
    createMut.mutate(
      { type: form.type, title: form.title.trim(), date: form.date, notes: form.notes.trim() || null },
      { onSuccess: () => { setAdding(false); setForm(BLANK_MILESTONE) } }
    )
  }

  function startEdit(m: EmployeeCareerMilestone) {
    setEditingId(m.id)
    setEditForm({ type: m.type, title: m.title, date: m.date, notes: m.notes ?? "" })
  }

  function handleUpdate() {
    if (!editingId || !editForm.title.trim()) return
    updateMut.mutate(
      { milestoneId: editingId, payload: { type: editForm.type, title: editForm.title.trim(), date: editForm.date, notes: editForm.notes.trim() || null } },
      { onSuccess: () => setEditingId(null) }
    )
  }

  // Sort chronologically oldest → newest (pin HIRED first)
  const sorted = [...milestones].sort((a, b) => {
    if (a.type === "HIRED") return -1
    if (b.type === "HIRED") return 1
    return a.date < b.date ? -1 : 1
  })

  // Build combined timeline: synthetic "Hired" entry from startDate if no HIRED milestone exists
  const hasHiredMilestone = milestones.some((m) => m.type === "HIRED")
  const syntheticHired: EmployeeCareerMilestone = {
    id: -1,
    employeeId,
    type: "HIRED",
    title: "Hired",
    date: startDate,
    notes: null,
  }
  const timeline = hasHiredMilestone ? sorted : [syntheticHired, ...sorted]

  return (
    <div className="rounded-xl border bg-card p-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <HugeiconsIcon icon={Award01Icon} size={20} strokeWidth={1.6} className="text-primary" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold">Work Record</h3>
            <p className="text-[11px] text-muted-foreground">Company tenure &amp; career milestones</p>
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold", seniorityColor)}>
          {seniorityLabel}
        </span>
      </div>

      {/* Tenure stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Date Hired</p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground">{fmtDate(startDate)}</p>
          <p className="text-[11px] text-muted-foreground">{fmtHireDate(startDate).split(",")[0]}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Years</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-foreground">{years}</p>
          <p className="text-[11px] text-muted-foreground">year{years !== 1 ? "s" : ""} in company</p>
        </div>
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Months</p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-foreground">{months}</p>
          <p className="text-[11px] text-muted-foreground">month{months !== 1 ? "s" : ""} this year</p>
        </div>
      </div>

      {/* Total tenure */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border bg-primary/5 px-4 py-3">
        <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} className="shrink-0 text-primary" />
        <p className="text-[13px] font-medium text-foreground">
          Total tenure:{" "}
          <span className="font-bold text-primary">{tenureLabel}</span>
          <span className="ml-2 text-[12px] font-normal text-muted-foreground">
            ({totalMonths} month{totalMonths !== 1 ? "s" : ""} total)
          </span>
        </p>
      </div>

      {/* Career Milestones — dynamic vertical timeline */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Career Milestones</p>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} /> Add Milestone
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-3">
            <MilestoneFormRow
              f={form}
              setF={setForm}
              onSave={handleCreate}
              onCancel={() => { setAdding(false); setForm(BLANK_MILESTONE) }}
              busy={busy}
            />
          </div>
        )}

        {mlLoading ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : timeline.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">
            No milestones yet. Click &ldquo;Add Milestone&rdquo; to record career events.
          </p>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-3.75 top-4 bottom-4 w-px bg-border" />

            <div className="space-y-0">
              {timeline.map((m, i) => {
                const style = MILESTONE_TYPE_STYLE[m.type]
                const isLast = i === timeline.length - 1
                const isSynthetic = m.id === -1

                if (editingId === m.id) {
                  return (
                    <div key={m.id} className="relative pl-10 pb-4">
                      <div className={cn("absolute left-0 top-1 size-7.5 rounded-full border-2 border-background ring-2 flex items-center justify-center", style.dot, style.ring)}>
                        <svg viewBox="0 0 10 10" className="size-3 text-white">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <MilestoneFormRow
                        f={editForm}
                        setF={setEditForm}
                        onSave={handleUpdate}
                        onCancel={() => setEditingId(null)}
                        busy={busy}
                      />
                    </div>
                  )
                }

                return (
                  <div key={m.id} className={cn("group relative flex items-start gap-4 pl-10", !isLast && "pb-5")}>
                    {/* Dot */}
                    <div
                      className={cn(
                        "absolute left-0 top-1 flex size-7.5 shrink-0 items-center justify-center rounded-full border-2 border-background ring-2",
                        style.dot,
                        style.ring
                      )}
                    >
                      <HugeiconsIcon icon={Award01Icon} size={12} strokeWidth={2.2} className="text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-2 rounded-xl border bg-card px-3 py-2.5 transition-colors group-hover:bg-muted/30">
                      <div className="min-w-0">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", style.label)}>
                            {MILESTONE_TYPE_LABEL[m.type]}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {fmtDate(m.date)}
                          </span>
                        </div>
                        <p className="text-[13px] font-medium text-foreground">{m.title}</p>
                        {m.notes && (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">{m.notes}</p>
                        )}
                      </div>

                      {/* Actions — hide for synthetic hired dot */}
                      {!isSynthetic && (
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => startEdit(m)}
                            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <HugeiconsIcon icon={PencilEdit01Icon} size={12} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => deleteMut.mutate(m.id)}
                            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Employment Stage ──────────────────────────────────────────────────────────

const STAGES = [
  { key: "trainee", label: "Trainee", color: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700" },
  { key: "probationary", label: "Probationary", color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
  { key: "regular", label: "Regular", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" },
  { key: "senior", label: "Senior", color: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700" },
  { key: "resigned", label: "Resigned", color: "bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  { key: "terminated", label: "Terminated", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
]

function EmploymentStageCard() {
  const [stage, setStage] = useState("probationary")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("probationary")
  const currentStage = STAGES.find((s) => s.key === stage)!

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold">Employment Stage</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Current standing of this employee</p>
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setStage(draft); setEditing(false) }}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={2} /> Save
            </button>
            <button
              onClick={() => { setDraft(stage); setEditing(false) }}
              className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} /> Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(stage); setEditing(true) }}
            className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => setDraft(s.key)}
              className={cn(
                "rounded-lg border px-4 py-2 text-[12px] font-medium transition-all",
                draft === s.key ? `${s.color} ring-2 ring-primary/30` : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex flex-1 items-center gap-0">
            {STAGES.slice(0, 4).map((s, i) => {
              const stageIdx = STAGES.findIndex((x) => x.key === stage)
              const thisIdx = STAGES.findIndex((x) => x.key === s.key)
              const isPast = thisIdx < stageIdx
              const isCurrent = s.key === stage
              const isLast = i === 3
              return (
                <div key={s.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      "flex size-8 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all",
                      isCurrent ? `${s.color} border-current` : isPast ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
                    )}>
                      {isPast ? (
                        <svg viewBox="0 0 10 10" className="size-3">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : i + 1}
                    </div>
                    <span className={cn("text-[10px] font-medium", isCurrent ? "text-foreground" : isPast ? "text-primary" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={cn("mx-1 mb-4 h-0.5 flex-1", thisIdx < stageIdx ? "bg-primary" : "bg-border")} />
                  )}
                </div>
              )
            })}
          </div>
          <span className={cn("shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold", currentStage.color)}>
            {currentStage.label}
          </span>
        </div>
      )}

      {(stage === "resigned" || stage === "terminated") && !editing && (
        <div className={cn("mt-3 rounded-lg border px-4 py-2.5 text-[12px] font-medium", currentStage.color)}>
          This employee is marked as <strong>{currentStage.label}</strong>.
        </div>
      )}
    </div>
  )
}

// ── Work Assignments Section ──────────────────────────────────────────────────

type AssignmentForm = {
  type: AssignmentType
  name: string
  description: string
  startDate: string
  deadline: string
  status: AssignmentStatus
}

const BLANK_ASSIGNMENT: AssignmentForm = {
  type: "PROJECT",
  name: "",
  description: "",
  startDate: new Date().toISOString().split("T")[0]!,
  deadline: "",
  status: "ACTIVE",
}

function WorkAssignmentsSection({ employeeId }: { employeeId: number }) {
  const { data: assignments = [], isLoading } = useEmployeeAssignments(employeeId)
  const createMut = useCreateAssignment(employeeId)
  const updateMut = useUpdateAssignment(employeeId)
  const deleteMut = useDeleteAssignment(employeeId)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<AssignmentForm>(BLANK_ASSIGNMENT)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<AssignmentForm>(BLANK_ASSIGNMENT)

  function handleCreate() {
    if (!form.name.trim()) return
    createMut.mutate(
      {
        type: form.type,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate,
        deadline: form.deadline || null,
        status: form.status,
      },
      { onSuccess: () => { setAdding(false); setForm(BLANK_ASSIGNMENT) } }
    )
  }

  function startEdit(a: EmployeeAssignment) {
    setEditingId(a.id)
    setEditForm({
      type: a.type,
      name: a.name,
      description: a.description ?? "",
      startDate: a.startDate,
      deadline: a.deadline ?? "",
      status: a.status,
    })
  }

  function handleUpdate() {
    if (!editingId || !editForm.name.trim()) return
    updateMut.mutate(
      {
        assignmentId: editingId,
        payload: {
          type: editForm.type,
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
          startDate: editForm.startDate,
          deadline: editForm.deadline || null,
          status: editForm.status,
        },
      },
      { onSuccess: () => setEditingId(null) }
    )
  }

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  // Separate active/upcoming from completed
  const active = assignments.filter((a) => a.status !== "COMPLETED")
  const completed = assignments.filter((a) => a.status === "COMPLETED")

  function AssignmentFormRow({
    f,
    setF,
    onSave,
    onCancel,
  }: {
    f: AssignmentForm
    setF: (v: AssignmentForm) => void
    onSave: () => void
    onCancel: () => void
  }) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Type</label>
            <select
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value as AssignmentType })}
              className="h-8 w-full rounded-lg border bg-background px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ASSIGNMENT_TYPES.map((t) => (
                <option key={t} value={t}>{ASSIGNMENT_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Name</label>
            <Input
              className="h-8 text-[13px]"
              placeholder="Assignment name…"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Start Date</label>
            <Input type="date" className="h-8 text-[13px]" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Deadline (optional)</label>
            <Input type="date" className="h-8 text-[13px]" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Status</label>
            <select
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value as AssignmentStatus })}
              className="h-8 w-full rounded-lg border bg-background px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ASSIGNMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{ASSIGNMENT_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Description (optional)</label>
          <Input
            className="h-8 text-[13px]"
            placeholder="Brief description…"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button size="xs" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button size="xs" onClick={onSave} disabled={busy || !f.name.trim()}>Save</Button>
        </div>
      </div>
    )
  }

  return (
    <SectionCard
      title="Work Assignments"
      icon={<HugeiconsIcon icon={BriefcaseIcon} size={15} strokeWidth={1.8} />}
      action={
        !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} /> Add
          </button>
        )
      }
    >
      <div className="space-y-2">
        {adding && (
          <AssignmentFormRow
            f={form}
            setF={setForm}
            onSave={handleCreate}
            onCancel={() => { setAdding(false); setForm(BLANK_ASSIGNMENT) }}
          />
        )}

        {isLoading ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : assignments.length === 0 && !adding ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">
            No assignments yet. Click &ldquo;Add&rdquo; to create one.
          </p>
        ) : (
          <>
            {active.map((a) => (
              <div key={a.id}>
                {editingId === a.id ? (
                  <AssignmentFormRow
                    f={editForm}
                    setF={setEditForm}
                    onSave={handleUpdate}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                    <div className="mt-0.5">
                      <StatusBadge variant={ASSIGNMENT_TYPE_COLOR[a.type]} dot={false} className="text-[10px]">
                        {ASSIGNMENT_TYPE_LABEL[a.type]}
                      </StatusBadge>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{a.name}</p>
                      {a.description && (
                        <p className="text-[11px] text-muted-foreground">{a.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Started {fmtDate(a.startDate)}</span>
                        {a.deadline && (
                          <span className={cn(
                            "flex items-center gap-0.5",
                            daysUntil(a.deadline) <= 7 && daysUntil(a.deadline) >= 0 ? "text-amber-500 font-medium" : ""
                          )}>
                            <HugeiconsIcon icon={Calendar01Icon} size={11} strokeWidth={2} />
                            Due {fmtDate(a.deadline)}
                            {daysUntil(a.deadline) <= 7 && daysUntil(a.deadline) >= 0 && (
                              <span className="ml-0.5">({daysUntil(a.deadline)}d left)</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge variant={ASSIGNMENT_STATUS_VARIANT[a.status]}>
                        {ASSIGNMENT_STATUS_LABEL[a.status]}
                      </StatusBadge>
                      <button
                        onClick={() => startEdit(a)}
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon icon={PencilEdit01Icon} size={12} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(a.id)}
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {completed.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer select-none py-1 text-[12px] text-muted-foreground hover:text-foreground">
                  {completed.length} completed assignment{completed.length !== 1 ? "s" : ""}
                </summary>
                <div className="mt-2 space-y-1.5">
                  {completed.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 opacity-60">
                      <StatusBadge variant="gray" dot={false} className="text-[10px]">
                        {ASSIGNMENT_TYPE_LABEL[a.type]}
                      </StatusBadge>
                      <p className="flex-1 text-[13px] line-through">{a.name}</p>
                      <StatusBadge variant="gray">Completed</StatusBadge>
                      <button onClick={() => deleteMut.mutate(a.id)} className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-red-500">
                        <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </SectionCard>
  )
}

// ── KPI Section ───────────────────────────────────────────────────────────────

type KpiForm = {
  name: string
  target: string
  current: string
  unit: string
  status: KpiStatus
  period: string
}

const BLANK_KPI: KpiForm = {
  name: "",
  target: "",
  current: "0",
  unit: "",
  status: "ON_TRACK",
  period: "",
}

function KpiSection({ employeeId }: { employeeId: number }) {
  const { data: kpis = [], isLoading } = useEmployeeKpis(employeeId)
  const createMut = useCreateKpi(employeeId)
  const updateMut = useUpdateKpi(employeeId)
  const deleteMut = useDeleteKpi(employeeId)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<KpiForm>(BLANK_KPI)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<KpiForm>(BLANK_KPI)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  function handleCreate() {
    if (!form.name.trim() || !form.target) return
    createMut.mutate(
      {
        name: form.name.trim(),
        target: Number(form.target),
        current: Number(form.current),
        unit: form.unit.trim() || undefined,
        status: form.status,
        period: form.period.trim() || new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
      },
      { onSuccess: () => { setAdding(false); setForm(BLANK_KPI) } }
    )
  }

  function startEdit(k: EmployeeKpi) {
    setEditingId(k.id)
    setEditForm({
      name: k.name,
      target: String(k.target),
      current: String(k.current),
      unit: k.unit ?? "",
      status: k.status,
      period: k.period,
    })
  }

  function handleUpdate() {
    if (!editingId || !editForm.name.trim() || !editForm.target) return
    updateMut.mutate(
      {
        kpiId: editingId,
        payload: {
          name: editForm.name.trim(),
          target: Number(editForm.target),
          current: Number(editForm.current),
          unit: editForm.unit.trim() || undefined,
          status: editForm.status,
          period: editForm.period,
        },
      },
      { onSuccess: () => setEditingId(null) }
    )
  }

  function KpiFormRow({
    f,
    setF,
    onSave,
    onCancel,
  }: {
    f: KpiForm
    setF: (v: KpiForm) => void
    onSave: () => void
    onCancel: () => void
  }) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">KPI Name</label>
            <Input className="h-8 text-[13px]" placeholder="e.g. Sales Target, Tasks Completed…" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Target</label>
            <Input type="number" className="h-8 text-[13px]" placeholder="100" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Current</label>
            <Input type="number" className="h-8 text-[13px]" placeholder="0" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Unit (optional)</label>
            <Input className="h-8 text-[13px]" placeholder="%, calls, units…" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Period</label>
            <Input className="h-8 text-[13px]" placeholder="Q2 2025, May 2025…" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Status</label>
            <select
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value as KpiStatus })}
              className="h-8 w-full rounded-lg border bg-background px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {KPI_STATUSES.map((s) => (
                <option key={s} value={s}>{KPI_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="xs" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button size="xs" onClick={onSave} disabled={busy || !f.name.trim() || !f.target}>Save</Button>
        </div>
      </div>
    )
  }

  return (
    <SectionCard
      title="KPI / Performance"
      icon={<HugeiconsIcon icon={Target01Icon} size={15} strokeWidth={1.8} />}
      action={
        !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} /> Add KPI
          </button>
        )
      }
    >
      <div className="space-y-2">
        {adding && (
          <KpiFormRow
            f={form}
            setF={setForm}
            onSave={handleCreate}
            onCancel={() => { setAdding(false); setForm(BLANK_KPI) }}
          />
        )}

        {isLoading ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : kpis.length === 0 && !adding ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">
            No KPIs defined yet. Click &ldquo;Add KPI&rdquo; to track performance.
          </p>
        ) : (
          kpis.map((k) => {
            const pct = k.target > 0 ? Math.min(100, Math.round((k.current / k.target) * 100)) : 0
            const progressColor =
              k.status === "COMPLETED" ? "bg-blue-500"
              : k.status === "ON_TRACK" ? "bg-green-500"
              : k.status === "AT_RISK" ? "bg-amber-500"
              : "bg-red-500"

            return (
              <div key={k.id}>
                {editingId === k.id ? (
                  <KpiFormRow
                    f={editForm}
                    setF={setEditForm}
                    onSave={handleUpdate}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="rounded-lg border border-border bg-background px-3 py-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{k.name}</p>
                        <p className="text-[11px] text-muted-foreground">{k.period}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge variant={KPI_STATUS_VARIANT[k.status]}>
                          {KPI_STATUS_LABEL[k.status]}
                        </StatusBadge>
                        <button onClick={() => startEdit(k)} className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                          <HugeiconsIcon icon={PencilEdit01Icon} size={12} strokeWidth={2} />
                        </button>
                        <button onClick={() => deleteMut.mutate(k.id)} className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                          <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full transition-all", progressColor)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="shrink-0 text-[12px] font-semibold tabular-nums">
                        {k.current}{k.unit ? k.unit : ""} / {k.target}{k.unit ? k.unit : ""}
                        <span className="ml-1 font-normal text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </SectionCard>
  )
}

// ── Attendance Summary Widget ─────────────────────────────────────────────────

function AttendanceSummaryWidget() {
  const latestIdx = MOCK_ATTENDANCE.length - 1
  const latest = MOCK_ATTENDANCE[latestIdx]!
  const nowMonth = new Date().getMonth()
  const monthLabel = MONTH_SHORT[Math.min(nowMonth, latestIdx)] ?? MONTH_SHORT[latestIdx]!
  const attendPct = latest.workDays > 0 ? Math.round(((latest.present + latest.late) / latest.workDays) * 100) : 0
  const maxPresent = Math.max(...MOCK_ATTENDANCE.map((s) => s.present), 1)

  return (
    <SectionCard title="Attendance Summary" icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} strokeWidth={1.8} />}>
      <div className="space-y-4">
        {/* Mini KPI row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Rate", value: `${attendPct}%`, accent: attendPct >= 90 ? "text-green-600" : attendPct >= 75 ? "text-amber-500" : "text-red-500" },
            { label: "Present", value: `${latest.present}/${latest.workDays}`, accent: "" },
            { label: "Late / Absent", value: `${latest.late}/${latest.absent}`, accent: "" },
            { label: "OT Hours", value: `${latest.ot}h`, accent: "" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-background p-3">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{s.label}</p>
              <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", s.accent || "text-foreground")}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{monthLabel}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div>
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Present days — last {MOCK_ATTENDANCE.length} months</p>
          <div className="flex items-end gap-2">
            {MOCK_ATTENDANCE.map((s, i) => {
              const isLast = i === latestIdx
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative w-full overflow-hidden rounded-t-md bg-muted" style={{ height: 44 }}>
                    <div
                      className={cn("absolute bottom-0 w-full rounded-t-md", isLast ? "bg-primary" : "bg-primary/30")}
                      style={{ height: `${(s.present / maxPresent) * 100}%` }}
                    />
                  </div>
                  <span className={cn("text-[10px] tabular-nums", isLast ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {MONTH_SHORT[i]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent records */}
        <div>
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Recent records</p>
          <div className="divide-y rounded-lg border">
            {attendanceRecords.slice(0, 4).map((rec, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-[12px] font-medium tabular-nums">{rec.date}</span>
                  <span className="text-[11px] text-muted-foreground">{rec.day}</span>
                </div>
                <StatusBadge variant={
                  rec.status === "present" ? "green"
                  : rec.status === "late" ? "amber"
                  : rec.status === "leave" ? "blue"
                  : rec.status === "absent" ? "red"
                  : "gray"
                }>
                  {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ── Dashboard Widgets Sidebar ─────────────────────────────────────────────────

function DashboardWidgets({ employeeId }: { employeeId: number }) {
  const { data: assignments = [] } = useEmployeeAssignments(employeeId)
  const { data: kpis = [] } = useEmployeeKpis(employeeId)

  const currentAssignment = assignments.find((a) => a.status === "ACTIVE")
  const upcomingDeadlines = assignments
    .filter((a) => a.deadline && a.status !== "COMPLETED")
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
    .slice(0, 4)

  const kpiAtRisk = kpis.filter((k) => k.status === "AT_RISK" || k.status === "BEHIND")

  return (
    <div className="space-y-4">
      {/* Current Assignment */}
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Current Assignment</p>
        {currentAssignment ? (
          <div>
            <div className="mb-1.5 flex items-start gap-2">
              <StatusBadge variant={ASSIGNMENT_TYPE_COLOR[currentAssignment.type]} dot={false} className="text-[10px] shrink-0">
                {ASSIGNMENT_TYPE_LABEL[currentAssignment.type]}
              </StatusBadge>
              <StatusBadge variant="green" className="text-[10px] shrink-0">Active</StatusBadge>
            </div>
            <p className="text-[14px] font-semibold">{currentAssignment.name}</p>
            {currentAssignment.description && (
              <p className="mt-0.5 text-[12px] text-muted-foreground">{currentAssignment.description}</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Started {fmtDate(currentAssignment.startDate)}
              {currentAssignment.deadline && ` · Due ${fmtDate(currentAssignment.deadline)}`}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">No active assignment.</p>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Upcoming Deadlines</p>
        {upcomingDeadlines.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No upcoming deadlines.</p>
        ) : (
          <div className="space-y-2">
            {upcomingDeadlines.map((a) => {
              const days = daysUntil(a.deadline!)
              const urgent = days <= 7
              return (
                <div key={a.id} className="flex items-center gap-2.5">
                  <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold tabular-nums", urgent ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400" : "border-border bg-muted text-muted-foreground")}>
                    {days}d
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtDate(a.deadline!)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* KPI Alerts */}
      {kpiAtRisk.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <div className="mb-2 flex items-center gap-1.5">
            <HugeiconsIcon icon={Alert01Icon} size={13} strokeWidth={2} className="text-amber-600 dark:text-amber-400" />
            <p className="text-[11px] font-semibold tracking-widest text-amber-700 dark:text-amber-400 uppercase">KPI Alerts</p>
          </div>
          <div className="space-y-1.5">
            {kpiAtRisk.map((k) => {
              const pct = k.target > 0 ? Math.round((k.current / k.target) * 100) : 0
              return (
                <div key={k.id} className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-amber-800 dark:text-amber-300">{k.name}</p>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 tabular-nums">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending Requests placeholder */}
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Pending Requests</p>
        <div className="space-y-1.5">
          {[
            { label: "Leave Request", status: "Pending", color: "amber" },
            { label: "OT Request", status: "Approved", color: "green" },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <p className="text-[12px]">{r.label}</p>
              <StatusBadge variant={r.color as "amber" | "green"}>{r.status}</StatusBadge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function OverviewTab({ employee, employeeId }: Props) {
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingContact, setEditingContact] = useState(false)

  const { data: jobPositions = [] } = useJobPositions()
  const { data: userPositions = [] } = useUserPositions(employeeId)
  const assignMut = useAssignPosition(employeeId)
  const removeMut = useRemovePosition(employeeId)
  const setPrimaryMut = useSetPrimaryPosition(employeeId)

  const primaryPosition = userPositions.find((up) => up.primary && up.active)
  const primaryGrade = primaryPosition?.position.salaryGrades.find((g) => g.isDefault)
    ?? primaryPosition?.position.salaryGrades[0]

  const [personal, setPersonal] = useState({
    name: employee.name,
    email: employee.email,
    employeeId: employee.employeeId,
    department: employee.department,
    position: employee.position,
    team: "",
    startDate: employee.startDate,
  })
  const [personalDraft, setPersonalDraft] = useState(personal)

  // For adding a new position assignment
  const [addingPosition, setAddingPosition] = useState(false)
  const [newPositionId, setNewPositionId] = useState("")
  const [newPositionPrimary, setNewPositionPrimary] = useState(false)

  const positionsByDept = jobPositions.reduce<Record<string, typeof jobPositions>>((acc, p) => {
    const dept = p.department ?? "General"
    if (!acc[dept]) acc[dept] = []
    acc[dept]!.push(p)
    return acc
  }, {})

  function handleAssignPosition() {
    if (!newPositionId) return
    assignMut.mutate(
      { jobPositionId: Number(newPositionId), primary: newPositionPrimary },
      { onSuccess: () => { setAddingPosition(false); setNewPositionId(""); setNewPositionPrimary(false) } }
    )
  }

  const [contact, setContact] = useState({
    phone: "+63 917 123 4567",
    address: "Makati City, Metro Manila",
    emergencyContact: "—",
    relationship: "—",
  })
  const [contactDraft, setContactDraft] = useState(contact)

  const [editingDocs, setEditingDocs] = useState(false)

  return (
    <div className="space-y-4">
      {/* Row 1: Personal Info + Contact Details */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Personal Info */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Personal Information</h3>
            {editingPersonal ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setPersonal(personalDraft); setEditingPersonal(false) }}
                  className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={2} /> Save
                </button>
                <button
                  onClick={() => { setPersonalDraft(personal); setEditingPersonal(false) }}
                  className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} /> Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => { setPersonalDraft(personal); setEditingPersonal(true) }} className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground">
                <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={2} />
              </button>
            )}
          </div>
          {editingPersonal ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <EditField label="Full Name" value={personalDraft.name} onChange={(v) => setPersonalDraft((d) => ({ ...d, name: v }))} />
              <EditField label="Email" value={personalDraft.email} onChange={(v) => setPersonalDraft((d) => ({ ...d, email: v }))} />
              <EditField label="Employee ID" value={personalDraft.employeeId} onChange={(v) => setPersonalDraft((d) => ({ ...d, employeeId: v }))} />
              <EditField label="Department" value={personalDraft.department} onChange={(v) => setPersonalDraft((d) => ({ ...d, department: v }))} />
              <EditField label="Team" value={personalDraft.team} onChange={(v) => setPersonalDraft((d) => ({ ...d, team: v }))} />
              <EditField label="Start Date" type="date" value={personalDraft.startDate} onChange={(v) => setPersonalDraft((d) => ({ ...d, startDate: v }))} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow label="Full Name" value={personal.name} />
              <InfoRow label="Email" value={personal.email} />
              <InfoRow label="Employee ID" value={personal.employeeId} />
              <InfoRow label="Department" value={personal.department} />
              <InfoRow label="Team" value={personal.team || "—"} />
              <InfoRow label="Start Date" value={personal.startDate} />
              <InfoRow label="Status" value={employee.status === "on-leave" ? "On Leave" : employee.status.charAt(0).toUpperCase() + employee.status.slice(1)} />
            </div>
          )}
        </div>

        {/* Contact + Docs */}
        <div className="flex flex-col gap-4">
          {/* Contact Details */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">Contact Details</h3>
              {editingContact ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setContact(contactDraft); setEditingContact(false) }} className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90">
                    <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={2} /> Save
                  </button>
                  <button onClick={() => { setContactDraft(contact); setEditingContact(false) }} className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                    <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} /> Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => { setContactDraft(contact); setEditingContact(true) }} className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground">
                  <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={2} />
                </button>
              )}
            </div>
            {editingContact ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <EditField label="Phone" value={contactDraft.phone} onChange={(v) => setContactDraft((d) => ({ ...d, phone: v }))} />
                <EditField label="Address" value={contactDraft.address} onChange={(v) => setContactDraft((d) => ({ ...d, address: v }))} />
                <EditField label="Emergency Contact" value={contactDraft.emergencyContact} onChange={(v) => setContactDraft((d) => ({ ...d, emergencyContact: v }))} />
                <EditField label="Relationship" value={contactDraft.relationship} onChange={(v) => setContactDraft((d) => ({ ...d, relationship: v }))} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow label="Phone" value={contact.phone} />
                <InfoRow label="Address" value={contact.address} />
                <InfoRow label="Emergency Contact" value={contact.emergencyContact} />
                <InfoRow label="Relationship" value={contact.relationship} />
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">Documents & Files</h3>
              <button onClick={() => setEditingDocs((v) => !v)} className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground">
                <HugeiconsIcon icon={editingDocs ? Cancel01Icon : Add01Icon} size={13} strokeWidth={2} />
              </button>
            </div>
            {editingDocs ? (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/30">
                <svg viewBox="0 0 24 24" className="size-7 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12m0-12l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[12px] text-muted-foreground">Click to upload a file</span>
                <input type="file" className="hidden" />
              </label>
            ) : (
              <p className="text-[13px] text-muted-foreground">No documents uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Job Positions */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold">Job Positions</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Assigned positions and linked salary grades</p>
          </div>
          {!addingPosition && (
            <button
              onClick={() => setAddingPosition(true)}
              className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} /> Assign Position
            </button>
          )}
        </div>

        {addingPosition && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
            <select
              value={newPositionId}
              onChange={(e) => setNewPositionId(e.target.value)}
              className="h-8 flex-1 rounded-lg border bg-background px-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Select position —</option>
              {Object.keys(positionsByDept).sort().map((dept) => (
                <optgroup key={dept} label={dept}>
                  {positionsByDept[dept]!.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}{p.level ? ` (${p.level})` : ""}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <input type="checkbox" checked={newPositionPrimary} onChange={(e) => setNewPositionPrimary(e.target.checked)} />
              Primary
            </label>
            <button
              onClick={handleAssignPosition}
              disabled={!newPositionId || assignMut.isPending}
              className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
            >
              <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2} />
            </button>
            <button
              onClick={() => { setAddingPosition(false); setNewPositionId("") }}
              className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} />
            </button>
          </div>
        )}

        {userPositions.length === 0 && !addingPosition ? (
          <p className="py-4 text-center text-[13px] text-muted-foreground">No positions assigned yet.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {userPositions.filter((up) => up.active).map((up) => {
              const defaultGrade = up.position.salaryGrades.find((g) => g.isDefault) ?? up.position.salaryGrades[0]
              return (
                <div key={up.id} className="group flex items-center gap-3 py-2.5">
                  {up.primary && (
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">PRIMARY</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{up.position.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {up.position.department && <span className="text-[11px] text-muted-foreground">{up.position.department}</span>}
                      {up.position.level && <span className="text-[11px] text-muted-foreground">· {up.position.level}</span>}
                    </div>
                  </div>
                  {defaultGrade && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{defaultGrade.code}</span>
                      <span className="text-[12px] font-medium">
                        {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(defaultGrade.baseSalary)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!up.primary && (
                      <button
                        onClick={() => setPrimaryMut.mutate(up.id)}
                        className="rounded-lg border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Set primary
                      </button>
                    )}
                    <button
                      onClick={() => removeMut.mutate(up.id)}
                      className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {primaryGrade && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <span className="text-[11px] text-muted-foreground">Payroll base pay resolves to</span>
            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{primaryGrade.code}</span>
            <span className="text-[12px] font-semibold text-foreground">
              {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(primaryGrade.baseSalary)}
            </span>
          </div>
        )}
      </div>

      {/* Row 3: Work Record */}
      <WorkRecordCard startDate={personal.startDate} employeeId={employeeId} />

      {/* Row 4: Employment Stage */}
      <EmploymentStageCard />

      {/* Row 3: Work Assignments */}
      <WorkAssignmentsSection employeeId={employeeId} />

      {/* Row 4: KPI */}
      <KpiSection employeeId={employeeId} />

      {/* Row 5: Attendance Summary + Dashboard Widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceSummaryWidget />
        </div>
        <div>
          <DashboardWidgets employeeId={employeeId} />
        </div>
      </div>
    </div>
  )
}
