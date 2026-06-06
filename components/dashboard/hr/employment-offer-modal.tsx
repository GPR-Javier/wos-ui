"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  SchedulePolicyForm,
  type SchedulePolicyFormValue,
} from "@/components/custom/schedule-policy-form"
import type { SchedulePolicyPayload } from "@/lib/schedule-policy-api"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useGiveOffer } from "@/hooks/use-review"
import type { ReviewDetail, OfferPayload } from "@/lib/review-api"
import { useUserRoles } from "@/hooks/use-admin-roles"
import { useJobPositions } from "@/hooks/use-employee-profile"
import {
  EMPLOYMENT_TYPE_LABELS,
  type EmploymentType,
  type LeaveCredits,
} from "@/lib/contract-api"
import { LeaveCreditsForm } from "@/components/custom/leave-credits-form"
import { CURRENCY_OPTIONS } from "@/lib/employee-profile-api"

const WORK_TYPE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
]

const SALARY_PERIOD_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "weekly", label: "Weekly" },
  { value: "semi-monthly", label: "Semi-monthly" },
  { value: "monthly", label: "Monthly" },
  { value: "fixed-price", label: "Fixed price" },
]

/** Best-effort seed of the contract employment type from the posting's recruiting label. */
function seedEmploymentType(postingType?: string | null): EmploymentType {
  switch ((postingType ?? "").toLowerCase()) {
    case "part-time":
      return "PART_TIME"
    case "contract":
      return "CONTRACTUAL"
    case "freelance":
      return "PROJECT_BASED"
    case "internship":
      return "CASUAL"
    default:
      return "PROBATIONARY"
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const DEFAULT_SCHEDULE: SchedulePolicyPayload = {
  earliestClockIn: "06:00",
  latestClockIn: "09:00",
  lateGraceMins: 10,
  earliestClockOut: "15:00",
  latestClockOut: "19:00",
  requiredHours: 8,
  undertimeGraceMins: 10,
  workdays: ["MON", "TUE", "WED", "THU", "FRI"],
  timezone: "Asia/Manila",
}

export function EmploymentOfferModal({
  detail,
  onClose,
}: {
  detail: ReviewDetail
  onClose: () => void
}) {
  const giveOffer = useGiveOffer()
  const { data: userRoles = [] } = useUserRoles()
  const { data: jobPositions = [] } = useJobPositions()

  const roleOptions = userRoles.filter(
    (r) => r.roleType === "EMPLOYEE" || r.roleType === "ADMIN"
  )
  const activePositions = jobPositions.filter((p) => p.active)

  const [userRoleId, setUserRoleId] = useState(
    detail.hireUserRoleId != null ? String(detail.hireUserRoleId) : ""
  )
  const [jobPositionId, setJobPositionId] = useState(
    detail.hireJobPositionId != null ? String(detail.hireJobPositionId) : ""
  )
  const [salaryAmount, setSalaryAmount] = useState(
    detail.offer?.salaryAmount != null ? String(detail.offer.salaryAmount) : ""
  )
  const [currency, setCurrency] = useState(
    detail.offer?.salaryCurrency ?? "PHP"
  )
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    seedEmploymentType(detail.hirePostingType)
  )
  const [workType, setWorkType] = useState(detail.hireWorkType ?? "onsite")
  const [salaryPeriod, setSalaryPeriod] = useState(
    detail.hireSalaryPeriod ?? "monthly"
  )
  const [startDate, setStartDate] = useState(today())
  const [probationEndDate, setProbationEndDate] = useState("")
  const [notes, setNotes] = useState("")
  const [leaveCredits, setLeaveCredits] = useState<LeaveCredits>(
    detail.offer?.leaveCredits ?? {}
  )
  const [overrideSchedule, setOverrideSchedule] = useState(
    detail.offer?.scheduleOverridden ?? false
  )
  const [schedule, setSchedule] = useState<SchedulePolicyFormValue>({
    payload: detail.offer?.schedulePolicy ?? DEFAULT_SCHEDULE,
    note: "",
  })
  const [error, setError] = useState<string | null>(null)

  const selectedPosition = activePositions.find(
    (p) => String(p.id) === jobPositionId
  )
  const department = selectedPosition?.department ?? detail.hireDepartment ?? "—"

  function submit() {
    setError(null)
    if (!userRoleId) {
      setError("Select the role the applicant will be hired into.")
      return
    }
    if (!startDate) {
      setError("Select a start date.")
      return
    }
    const payload: OfferPayload = {
      userRoleId: Number(userRoleId),
      jobPositionId: jobPositionId ? Number(jobPositionId) : null,
      salaryAmount: salaryAmount ? Number(salaryAmount) : null,
      currency,
      employmentType,
      workType,
      salaryPeriod,
      startDate,
      probationEndDate: probationEndDate || null,
      notes: notes.trim() || null,
      leaveCredits,
      overrideSchedule,
      schedulePolicy: overrideSchedule ? schedule.payload : null,
    }
    giveOffer.mutate(
      { id: detail.id, payload },
      {
        onSuccess: onClose,
        onError: (e: unknown) => {
          const msg =
            (e as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? "Couldn't extend the offer. Please try again."
          setError(msg)
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg animate-in rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">Extend employment offer</h2>
            <p className="text-[12px] text-muted-foreground">
              {detail.applicantName ?? detail.applicantEmail} ·{" "}
              {detail.jobTitle ?? "Position"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-6 py-5">
          <p className="rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground">
            Values are pre-filled from the job posting. Adjust them to reflect
            what was agreed during interviews — this becomes the contract the
            applicant reviews and signs.
          </p>

          {/* Role + Position */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Role on hire *
              </Label>
              <select
                value={userRoleId}
                onChange={(e) => setUserRoleId(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="">Select role…</option>
                {roleOptions.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name}
                    {r.roleType === "ADMIN" ? " (Admin)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Job position
              </Label>
              <select
                value={jobPositionId}
                onChange={(e) => setJobPositionId(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="">Select position…</option>
                {activePositions.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department (derived) */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">
              Department
            </Label>
            <div className="flex h-9 items-center rounded-lg border border-input bg-muted/40 px-3 text-[13px] text-muted-foreground">
              {department}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Determined by the selected job position.
            </p>
          </div>

          {/* Employment type + Work type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Employment type
              </Label>
              <select
                value={employmentType}
                onChange={(e) =>
                  setEmploymentType(e.target.value as EmploymentType)
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {(
                  Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]
                ).map((t) => (
                  <option key={t} value={t}>
                    {EMPLOYMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Work type
              </Label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {WORK_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary + period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Salary</Label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={0}
                  className="h-9 flex-1 text-[13px]"
                  placeholder="0"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Pay period
              </Label>
              <select
                value={salaryPeriod}
                onChange={(e) => setSalaryPeriod(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {SALARY_PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Start date *
              </Label>
              <Input
                type="date"
                className="h-9 text-[13px]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Probation end (optional)
              </Label>
              <Input
                type="date"
                className="h-9 text-[13px]"
                value={probationEndDate}
                onChange={(e) => setProbationEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Leave entitlement */}
          <div className="rounded-lg border border-border p-3">
            <Label className="text-[13px] font-semibold">Leave entitlement</Label>
            <p className="mt-0.5 mb-3 text-[11px] text-muted-foreground">
              Annual paid-leave credits for this hire.
            </p>
            <LeaveCreditsForm value={leaveCredits} onChange={setLeaveCredits} />
          </div>

          {/* Schedule policy override */}
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-[13px] font-semibold">
                  Custom schedule policy
                </Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {overrideSchedule
                    ? "The hire will use the custom schedule below for attendance."
                    : "Off — uses the role / organization default schedule policy."}
                </p>
              </div>
              <Switch
                checked={overrideSchedule}
                onCheckedChange={setOverrideSchedule}
              />
            </div>
            {overrideSchedule && (
              <div className="mt-3 border-t pt-3">
                <SchedulePolicyForm
                  value={schedule}
                  onChange={setSchedule}
                  showNote={false}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">
              Notes (optional)
            </Label>
            <textarea
              className="min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder="Anything to clarify on the offer…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-border px-6 py-4">
          {error && (
            <div
              className={cn(
                "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] font-medium text-destructive"
              )}
            >
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={giveOffer.isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={giveOffer.isPending}>
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={13}
                strokeWidth={2}
                className="mr-1.5"
              />
              {giveOffer.isPending ? "Sending…" : "Send offer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
