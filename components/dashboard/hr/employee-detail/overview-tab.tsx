"use client"

import { useState } from "react"
import type { Employee } from "@/lib/types"
import { attendanceRecords } from "@/lib/mock-data"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PencilEdit01Icon,
  Tick02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface Props {
  employee: Employee
}

// ── Shared attendance + performance data (mirrors the other tabs) ──────────────

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const ATTEND_STATS = [
  { present: 18, late: 1, absent: 0, leave: 1, ot: 4.5, workDays: 20 },
  { present: 16, late: 2, absent: 1, leave: 1, ot: 3.25, workDays: 20 },
  { present: 17, late: 2, absent: 0, leave: 2, ot: 6.75, workDays: 21 },
  { present: 13, late: 1, absent: 1, leave: 2, ot: 2.5, workDays: 17 },
]

const PERF_STATS = [
  {
    openSlots: 4,
    bookedClasses: 36,
    studentPct: 91,
    totalReviews: 28,
    fiveStar: 19,
    lowStar: 2,
  },
  {
    openSlots: 6,
    bookedClasses: 34,
    studentPct: 87,
    totalReviews: 26,
    fiveStar: 17,
    lowStar: 3,
  },
  {
    openSlots: 3,
    bookedClasses: 37,
    studentPct: 93,
    totalReviews: 31,
    fiveStar: 22,
    lowStar: 1,
  },
  {
    openSlots: 7,
    bookedClasses: 33,
    studentPct: 84,
    totalReviews: 24,
    fiveStar: 14,
    lowStar: 4,
  },
]

const NOW_MONTH = new Date().getMonth()

const statusVariant: Record<
  string,
  "green" | "red" | "amber" | "gray" | "blue" | "purple"
> = {
  present: "green",
  late: "amber",
  leave: "blue",
  restday: "gray",
  overtime: "purple",
  overbreak: "amber",
  undertime: "red",
  absent: "red",
}

// ── Employment stages ──────────────────────────────────────────────────────────

const STAGES = [
  {
    key: "trainee",
    label: "Trainee",
    color:
      "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
  },
  {
    key: "probationary",
    label: "Probationary",
    color:
      "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  },
  {
    key: "regular",
    label: "Regular",
    color:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  },
  {
    key: "senior",
    label: "Senior",
    color:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  },
  {
    key: "resigned",
    label: "Resigned",
    color:
      "bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  },
  {
    key: "terminated",
    label: "Terminated",
    color:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-[13px]">{value}</span>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <Input
        className="h-8 text-[13px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Section({
  title,
  editing,
  onEdit,
  onSave,
  onCancel,
  children,
}: {
  title: string
  editing?: boolean
  onEdit?: () => void
  onSave?: () => void
  onCancel?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onSave}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={2} />
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
              Cancel
            </button>
          </div>
        ) : onEdit ? (
          <button
            onClick={onEdit}
            className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={2} />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function MiniStatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums",
          accent ?? "text-foreground"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function AttendanceSummary() {
  const latestIdx = ATTEND_STATS.length - 1
  const latest = ATTEND_STATS[latestIdx]!
  const prev = ATTEND_STATS[latestIdx - 1]
  const monthLabel =
    MONTH_SHORT[Math.min(NOW_MONTH, latestIdx)] ?? MONTH_SHORT[latestIdx]!

  const attendPct =
    latest.workDays > 0
      ? Math.round(((latest.present + latest.late) / latest.workDays) * 100)
      : 0

  const prevPct =
    prev && prev.workDays > 0
      ? Math.round(((prev.present + prev.late) / prev.workDays) * 100)
      : null

  const trend = prevPct !== null ? attendPct - prevPct : null

  // Month-over-month mini bars
  const maxPresent = Math.max(...ATTEND_STATS.map((s) => s.present), 1)

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStatCard
          label="Attendance Rate"
          value={`${attendPct}%`}
          sub={
            trend !== null
              ? trend >= 0
                ? `↑ +${trend}% vs last month`
                : `↓ ${trend}% vs last month`
              : monthLabel
          }
          accent={
            attendPct >= 90
              ? "text-green-600"
              : attendPct >= 75
                ? "text-amber-500"
                : "text-red-500"
          }
        />
        <MiniStatCard
          label="Present"
          value={String(latest.present)}
          sub={`of ${latest.workDays} work days`}
        />
        <MiniStatCard
          label="Late / Absent"
          value={`${latest.late} / ${latest.absent}`}
          sub="this month"
        />
        <MiniStatCard
          label="OT Hours"
          value={`${latest.ot}h`}
          sub="this month"
        />
      </div>

      {/* Month-over-month bar comparison */}
      <div>
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
          Present days — last {ATTEND_STATS.length} months
        </p>
        <div className="flex items-end gap-2">
          {ATTEND_STATS.map((s, i) => {
            const barPct = (s.present / maxPresent) * 100
            const isLast = i === latestIdx
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="relative w-full overflow-hidden rounded-t-md bg-muted"
                  style={{ height: 52 }}
                >
                  <div
                    className={cn(
                      "absolute bottom-0 w-full rounded-t-md transition-all",
                      isLast ? "bg-primary" : "bg-primary/30"
                    )}
                    style={{ height: `${barPct}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    isLast
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {MONTH_SHORT[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent records */}
      <div>
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
          Recent records
        </p>
        <div className="divide-y rounded-lg border">
          {attendanceRecords.slice(0, 5).map((rec, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-12 text-[12px] font-medium tabular-nums">
                  {rec.date}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {rec.day}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {rec.timeIn} – {rec.timeOut}
                </span>
                <StatusBadge variant={statusVariant[rec.status] ?? "gray"}>
                  {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PerformanceSummary() {
  const latestIdx = PERF_STATS.length - 1
  const latest = PERF_STATS[latestIdx]!
  const prev = PERF_STATS[latestIdx - 1]
  const monthLabel =
    MONTH_SHORT[Math.min(NOW_MONTH, latestIdx)] ?? MONTH_SHORT[latestIdx]!

  const totalSlots = latest.openSlots + latest.bookedClasses
  const bookingRate =
    totalSlots > 0 ? Math.round((latest.bookedClasses / totalSlots) * 100) : 0
  const fiveStarPct =
    latest.totalReviews > 0
      ? Math.round((latest.fiveStar / latest.totalReviews) * 100)
      : 0

  const prevBooking =
    prev && prev.openSlots + prev.bookedClasses > 0
      ? Math.round(
          (prev.bookedClasses / (prev.openSlots + prev.bookedClasses)) * 100
        )
      : null
  const bookingTrend = prevBooking !== null ? bookingRate - prevBooking : null

  // Sparkline for student pct
  const maxPct = Math.max(...PERF_STATS.map((p) => p.studentPct), 1)

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStatCard
          label="Open Slots"
          value={String(latest.openSlots)}
          sub={`of ${totalSlots} total`}
          accent={latest.openSlots > 5 ? "text-amber-500" : "text-foreground"}
        />
        <MiniStatCard
          label="Booked Classes"
          value={String(latest.bookedClasses)}
          sub={
            bookingTrend !== null
              ? bookingTrend >= 0
                ? `↑ +${bookingTrend}% fill rate`
                : `↓ ${bookingTrend}% fill rate`
              : `${bookingRate}% fill rate`
          }
        />
        <MiniStatCard
          label="Student's %"
          value={`${latest.studentPct}%`}
          sub={
            latest.studentPct >= 90
              ? "Excellent"
              : latest.studentPct >= 75
                ? "Good"
                : "Needs attention"
          }
          accent={
            latest.studentPct >= 90
              ? "text-green-600"
              : latest.studentPct >= 75
                ? "text-amber-500"
                : "text-red-500"
          }
        />
        <MiniStatCard
          label="Total Reviews"
          value={String(latest.totalReviews)}
          sub={monthLabel}
        />
        <MiniStatCard
          label="5-Star Ratings"
          value={String(latest.fiveStar)}
          sub={`${fiveStarPct}% of reviews`}
          accent="text-amber-500"
        />
        <MiniStatCard
          label="2★ and Below"
          value={String(latest.lowStar)}
          sub="low ratings"
          accent={
            latest.lowStar > 3
              ? "text-red-500"
              : latest.lowStar > 0
                ? "text-amber-500"
                : "text-green-600"
          }
        />
      </div>

      {/* Student % trend */}
      <div>
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
          Student attendance % — last {PERF_STATS.length} months
        </p>
        <div className="flex items-end gap-2">
          {PERF_STATS.map((p, i) => {
            const barPct = (p.studentPct / maxPct) * 100
            const isLast = i === latestIdx
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    isLast
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {p.studentPct > 0 ? `${p.studentPct}%` : ""}
                </span>
                <div
                  className="relative w-full overflow-hidden rounded-t-md bg-muted"
                  style={{ height: 52 }}
                >
                  <div
                    className={cn(
                      "absolute bottom-0 w-full rounded-t-md transition-all",
                      isLast ? "bg-emerald-500" : "bg-emerald-500/30"
                    )}
                    style={{ height: `${barPct}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    isLast
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {MONTH_SHORT[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rating snapshot */}
      <div>
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
          Rating snapshot — {monthLabel}
        </p>
        <div className="flex items-center gap-4 rounded-lg border bg-background px-4 py-3">
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-500 tabular-nums">
              {latest.totalReviews > 0
                ? ((latest.fiveStar * 5) / latest.totalReviews).toFixed(1)
                : "—"}
            </p>
            <div className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <svg
                  key={n}
                  viewBox="0 0 12 12"
                  className={cn(
                    "size-3",
                    n <=
                      Math.round(
                        (latest.fiveStar * 5) / (latest.totalReviews || 1)
                      )
                      ? "fill-amber-400"
                      : "fill-muted"
                  )}
                >
                  <path d="M6 1l1.2 3.6H11L8.1 6.8l1.2 3.6L6 8.2l-3.3 2.2 1.2-3.6L1 4.6h3.8z" />
                </svg>
              ))}
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {latest.totalReviews} reviews
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            {[
              { label: "5 ★", value: latest.fiveStar, color: "bg-amber-400" },
              {
                label: "3–4 ★",
                value: latest.totalReviews - latest.fiveStar - latest.lowStar,
                color: "bg-amber-300",
              },
              { label: "≤2 ★", value: latest.lowStar, color: "bg-red-400" },
            ].map(({ label, value, color }) => {
              const pct =
                latest.totalReviews > 0
                  ? (value / latest.totalReviews) * 100
                  : 0
              return (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-10 text-[10px] text-muted-foreground">
                    {label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", color)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-[10px] text-muted-foreground tabular-nums">
                    {value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

const POINTS_OPTIONS = [5, 25, 40, 50, 60, 70, 80, 90, 100]

const DEFAULT_CURRICULA = ["BCT", "Smart Juniors", "Callan", "REMS"]

interface EmploymentFlags {
  flexibleTime: boolean
  overtimeAllowed: boolean
  remoteWork: boolean
  nightDifferential: boolean
  holidayPay: boolean
}

const FLAG_LABELS: {
  key: keyof EmploymentFlags
  label: string
  description: string
}[] = [
  {
    key: "flexibleTime",
    label: "Flexible Time",
    description: "Employee may set their own clock-in window",
  },
  {
    key: "overtimeAllowed",
    label: "Overtime Allowed",
    description: "Eligible to render and log overtime hours",
  },
  {
    key: "remoteWork",
    label: "Remote Work",
    description: "Permitted to work outside the office",
  },
  {
    key: "nightDifferential",
    label: "Night Differential",
    description: "Receives night-shift pay differential",
  },
  {
    key: "holidayPay",
    label: "Holiday Pay",
    description: "Entitled to holiday premium pay",
  },
]

export function OverviewTab({ employee }: Props) {
  const [subTab, setSubTab] = useState<"attendance" | "performance">(
    "attendance"
  )
  const [points, setPoints] = useState<number>(25)
  const [curricula, setCurricula] = useState<string[]>(["BCT"])
  const [extraCurricula, setExtraCurricula] = useState<string[]>([])
  const [newCurriculum, setNewCurriculum] = useState("")
  const [addingNew, setAddingNew] = useState(false)

  // Stage
  const [stage, setStage] = useState("probationary")
  const [editingStage, setEditingStage] = useState(false)
  const [stageDraft, setStageDraft] = useState("probationary")

  // Per-card edit states
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingEmployment, setEditingEmployment] = useState(false)
  const [editingContact, setEditingContact] = useState(false)
  const [editingDocs, setEditingDocs] = useState(false)

  // Employment flags
  const [flags, setFlags] = useState<EmploymentFlags>({
    flexibleTime: false,
    overtimeAllowed: true,
    remoteWork: false,
    nightDifferential: false,
    holidayPay: true,
  })
  const [flagsDraft, setFlagsDraft] = useState<EmploymentFlags>(flags)

  // Grace period
  const [gracePeriodMins, setGracePeriodMins] = useState(5)
  const [gracePeriodDraft, setGracePeriodDraft] = useState(5)

  // Employment draft (for cancel)
  const [pointsDraft, setPointsDraft] = useState(25)
  const [curriculaDraft, setCurriculaDraft] = useState<string[]>(["BCT"])

  // Personal fields
  const [personal, setPersonal] = useState({
    name: employee.name,
    email: employee.email,
    employeeId: employee.employeeId,
    role: employee.role,
    status: employee.status,
    startDate: employee.startDate,
  })
  const [personalDraft, setPersonalDraft] = useState(personal)

  // Contact fields
  const [contact, setContact] = useState({
    phone: "+63 917 123 4567",
    address: "Makati City, Metro Manila",
    emergencyContact: "—",
    relationship: "—",
  })
  const [contactDraft, setContactDraft] = useState(contact)

  function toggleCurriculum(name: string) {
    setCurricula((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    )
  }

  function addCurriculum() {
    const trimmed = newCurriculum.trim()
    if (!trimmed) return
    setExtraCurricula((prev) => [...prev, trimmed])
    setCurricula((prev) => [...prev, trimmed])
    setNewCurriculum("")
    setAddingNew(false)
  }

  const allCurricula = [...DEFAULT_CURRICULA, ...extraCurricula]
  const currentStage = STAGES.find((s) => s.key === stage)!

  return (
    <div className="space-y-4">
      {/* Employment Stage — full width */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold">Employment Stage</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Current standing of this employee
            </p>
          </div>
          {editingStage ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setStage(stageDraft)
                  setEditingStage(false)
                }}
                className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={2} />
                Save
              </button>
              <button
                onClick={() => {
                  setStageDraft(stage)
                  setEditingStage(false)
                }}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setStageDraft(stage)
                setEditingStage(true)
              }}
              className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon
                icon={PencilEdit01Icon}
                size={13}
                strokeWidth={2}
              />
            </button>
          )}
        </div>

        {editingStage ? (
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStageDraft(s.key)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-[12px] font-medium transition-all",
                  stageDraft === s.key
                    ? `${s.color} ring-2 ring-primary/30`
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* Stage progress strip */}
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
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all",
                          isCurrent
                            ? `${s.color} border-current`
                            : isPast
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {isPast ? (
                          <svg viewBox="0 0 10 10" className="size-3">
                            <path
                              d="M1.5 5l2.5 2.5 4.5-4.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          isCurrent
                            ? "text-foreground"
                            : isPast
                              ? "text-primary"
                              : "text-muted-foreground"
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "mx-1 mb-4 h-0.5 flex-1",
                          thisIdx < stageIdx ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Current badge */}
            <span
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold",
                currentStage.color
              )}
            >
              {currentStage.label}
            </span>
          </div>
        )}

        {/* Resigned / Terminated shown separately */}
        {(stage === "resigned" || stage === "terminated") && !editingStage && (
          <div
            className={cn(
              "mt-3 rounded-lg border px-4 py-2.5 text-[12px] font-medium",
              currentStage.color
            )}
          >
            This employee is marked as <strong>{currentStage.label}</strong>.
          </div>
        )}
      </div>

      {/* Profile cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title="Personal Information"
          editing={editingPersonal}
          onEdit={() => {
            setPersonalDraft(personal)
            setEditingPersonal(true)
          }}
          onSave={() => {
            setPersonal(personalDraft)
            setEditingPersonal(false)
          }}
          onCancel={() => {
            setPersonalDraft(personal)
            setEditingPersonal(false)
          }}
        >
          {editingPersonal ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <EditField
                label="Full Name"
                value={personalDraft.name}
                onChange={(v) => setPersonalDraft((d) => ({ ...d, name: v }))}
              />
              <EditField
                label="Email"
                value={personalDraft.email}
                onChange={(v) => setPersonalDraft((d) => ({ ...d, email: v }))}
              />
              <EditField
                label="Employee ID"
                value={personalDraft.employeeId}
                onChange={(v) =>
                  setPersonalDraft((d) => ({ ...d, employeeId: v }))
                }
              />
              <EditField
                label="Role"
                value={personalDraft.role}
                onChange={(v) =>
                  setPersonalDraft((d) => ({
                    ...d,
                    role: v as "employee" | "hr" | "admin",
                  }))
                }
              />
              <EditField
                label="Status"
                value={personalDraft.status}
                onChange={(v) =>
                  setPersonalDraft((d) => ({
                    ...d,
                    status: v as "active" | "on-leave" | "inactive",
                  }))
                }
              />
              <EditField
                label="Start Date"
                value={personalDraft.startDate}
                onChange={(v) =>
                  setPersonalDraft((d) => ({ ...d, startDate: v }))
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow label="Full Name" value={personal.name} />
              <InfoRow label="Email" value={personal.email} />
              <InfoRow label="Employee ID" value={personal.employeeId} />
              <InfoRow label="Role" value={personal.role} />
              <InfoRow label="Status" value={personal.status} />
              <InfoRow label="Start Date" value={personal.startDate} />
            </div>
          )}
        </Section>

        <Section
          title="Employment Details"
          editing={editingEmployment}
          onEdit={() => {
            setPointsDraft(points)
            setCurriculaDraft(curricula)
            setFlagsDraft(flags)
            setGracePeriodDraft(gracePeriodMins)
            setEditingEmployment(true)
          }}
          onSave={() => {
            setPoints(pointsDraft)
            setCurricula(curriculaDraft)
            setFlags(flagsDraft)
            setGracePeriodMins(gracePeriodDraft)
            setEditingEmployment(false)
          }}
          onCancel={() => {
            setFlagsDraft(flags)
            setGracePeriodDraft(gracePeriodMins)
            setEditingEmployment(false)
          }}
        >
          {editingEmployment ? (
            <div className="space-y-5">
              {/* Points */}
              <div className="space-y-2">
                <Label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Points
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {POINTS_OPTIONS.map((pt) => (
                    <button
                      key={pt}
                      onClick={() => setPointsDraft(pt)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[12px] font-medium tabular-nums transition-colors",
                        pointsDraft === pt
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Curriculum */}
              <div className="space-y-2">
                <Label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Curriculum
                </Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {allCurricula.map((name) => {
                    const checked = curriculaDraft.includes(name)
                    return (
                      <label
                        key={name}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <div
                          onClick={() =>
                            setCurriculaDraft((prev) =>
                              prev.includes(name)
                                ? prev.filter((c) => c !== name)
                                : [...prev, name]
                            )
                          }
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                            checked
                              ? "border-primary bg-primary"
                              : "border-border bg-background"
                          )}
                        >
                          {checked && (
                            <svg viewBox="0 0 10 10" className="size-2.5">
                              <path
                                d="M1.5 5l2.5 2.5 4.5-4.5"
                                stroke="white"
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          onClick={() =>
                            setCurriculaDraft((prev) =>
                              prev.includes(name)
                                ? prev.filter((c) => c !== name)
                                : [...prev, name]
                            )
                          }
                          className={cn(
                            "text-[13px] select-none",
                            checked
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {name}
                        </span>
                      </label>
                    )
                  })}
                </div>
                {addingNew ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      autoFocus
                      className="h-8 w-40 text-[12px]"
                      placeholder="Curriculum name…"
                      value={newCurriculum}
                      onChange={(e) => setNewCurriculum(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCurriculum()
                        if (e.key === "Escape") {
                          setAddingNew(false)
                          setNewCurriculum("")
                        }
                      }}
                    />
                    <Button
                      size="xs"
                      onClick={addCurriculum}
                      disabled={!newCurriculum.trim()}
                    >
                      Add
                    </Button>
                    <button
                      onClick={() => {
                        setAddingNew(false)
                        setNewCurriculum("")
                      }}
                      className="text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingNew(true)}
                    className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-base leading-none">+</span> Add
                    curriculum
                  </button>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Work policy toggles */}
              <div className="space-y-3">
                <Label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Work Policy
                </Label>
                <div className="space-y-3">
                  {FLAG_LABELS.map(({ key, label, description }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-[13px] font-medium">{label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {description}
                        </p>
                      </div>
                      <Switch
                        checked={flagsDraft[key]}
                        onCheckedChange={(v) =>
                          setFlagsDraft((f) => ({ ...f, [key]: v }))
                        }
                      />
                    </div>
                  ))}

                  {/* Grace period — always visible in edit mode */}
                  <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                    <div>
                      <p className="text-[13px] font-medium">
                        Late Grace Period
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Minutes allowed after shift start before marked late
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        className="h-8 w-16 text-center text-[13px] tabular-nums"
                        value={gracePeriodDraft}
                        onChange={(e) =>
                          setGracePeriodDraft(
                            Math.min(60, Math.max(0, Number(e.target.value)))
                          )
                        }
                      />
                      <span className="text-[12px] text-muted-foreground">
                        min
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow label="Points" value={`${points} pts`} />
                <InfoRow
                  label="Curriculum"
                  value={
                    curricula.length > 0
                      ? curricula.join(", ")
                      : "None selected"
                  }
                />
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="mb-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Work Policy
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                  {FLAG_LABELS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          flags[key] ? "bg-green-500" : "bg-muted-foreground/30"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[12px]",
                          flags[key]
                            ? "text-foreground"
                            : "text-muted-foreground line-through decoration-muted-foreground/40"
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <span className="size-2 shrink-0 rounded-full bg-amber-400" />
                  <span className="text-[12px] text-muted-foreground">
                    Late Grace Period
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums">
                    {gracePeriodMins} min{gracePeriodMins !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section
          title="Contact Details"
          editing={editingContact}
          onEdit={() => {
            setContactDraft(contact)
            setEditingContact(true)
          }}
          onSave={() => {
            setContact(contactDraft)
            setEditingContact(false)
          }}
          onCancel={() => {
            setContactDraft(contact)
            setEditingContact(false)
          }}
        >
          {editingContact ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <EditField
                label="Phone"
                value={contactDraft.phone}
                onChange={(v) => setContactDraft((d) => ({ ...d, phone: v }))}
              />
              <EditField
                label="Address"
                value={contactDraft.address}
                onChange={(v) => setContactDraft((d) => ({ ...d, address: v }))}
              />
              <EditField
                label="Emergency Contact"
                value={contactDraft.emergencyContact}
                onChange={(v) =>
                  setContactDraft((d) => ({ ...d, emergencyContact: v }))
                }
              />
              <EditField
                label="Relationship"
                value={contactDraft.relationship}
                onChange={(v) =>
                  setContactDraft((d) => ({ ...d, relationship: v }))
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow label="Phone" value={contact.phone} />
              <InfoRow label="Address" value={contact.address} />
              <InfoRow
                label="Emergency Contact"
                value={contact.emergencyContact}
              />
              <InfoRow label="Relationship" value={contact.relationship} />
            </div>
          )}
        </Section>

        <Section
          title="Documents & Files"
          editing={editingDocs}
          onEdit={() => setEditingDocs(true)}
          onSave={() => setEditingDocs(false)}
          onCancel={() => setEditingDocs(false)}
        >
          {editingDocs ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30">
              <svg
                viewBox="0 0 24 24"
                className="size-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12m0-12l-4 4m4-4l4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[12px] text-muted-foreground">
                Click to upload a file
              </span>
              <input type="file" className="hidden" />
            </label>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              No documents uploaded yet.
            </p>
          )}
        </Section>
      </div>

      {/* Summary sub-tabs */}
      <div className="rounded-xl border bg-card">
        {/* Sub-tab header */}
        <div className="flex border-b">
          {(["attendance", "performance"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={cn(
                "relative flex-1 py-3 text-[13px] font-medium capitalize transition-colors",
                subTab === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "attendance"
                ? "Attendance Summary"
                : "Performance Summary"}
              {subTab === tab && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Sub-tab content */}
        <div className="p-5">
          {subTab === "attendance" ? (
            <AttendanceSummary />
          ) : (
            <PerformanceSummary />
          )}
        </div>
      </div>
    </div>
  )
}
