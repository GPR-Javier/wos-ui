"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FileEditIcon,
  PlusSignIcon,
  Delete02Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  SchedulePolicyForm,
  type SchedulePolicyFormValue,
} from "@/components/custom/schedule-policy-form"
import { LeaveCreditsForm } from "@/components/custom/leave-credits-form"
import type { SchedulePolicyPayload } from "@/lib/schedule-policy-api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  useContracts,
  useCreateContract,
  useUpdateContractStatus,
  useDeleteContract,
} from "@/hooks/use-contract"
import { useJobPositions } from "@/hooks/use-employee-profile"
import { CURRENCY_OPTIONS } from "@/lib/employee-profile-api"
import {
  EMPLOYMENT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  activeLeaveTypes,
  leaveCreditLabel,
  type EmploymentType,
  type ContractStatus,
  type CreateContractPayload,
} from "@/lib/contract-api"

interface Props {
  employeeId: number
}

const EMPLOYMENT_TYPES = Object.entries(EMPLOYMENT_TYPE_LABELS) as [
  EmploymentType,
  string,
][]
const CONTRACT_STATUSES = Object.entries(CONTRACT_STATUS_LABELS) as [
  ContractStatus,
  string,
][]

function fmt(date?: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const EMPTY_FORM: CreateContractPayload = {
  employmentType: "REGULAR",
  startDate: "",
  endDate: null,
  probationEndDate: null,
  signingDate: null,
  contractNumber: null,
  notes: null,
  content: null,
  jobPositionId: null,
  salaryAmount: null,
  currency: "PHP",
  leaveCredits: null,
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

export function ContractTab({ employeeId }: Props) {
  const { data: contracts = [], isLoading } = useContracts(employeeId)
  const { data: positions = [] } = useJobPositions()
  const createContract = useCreateContract(employeeId)
  const updateStatus = useUpdateContractStatus(employeeId)
  const deleteContract = useDeleteContract(employeeId)

  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState<CreateContractPayload>(EMPTY_FORM)
  const [overrideSchedule, setOverrideSchedule] = useState(false)
  const [schedule, setSchedule] = useState<SchedulePolicyFormValue>({
    payload: DEFAULT_SCHEDULE,
    note: "",
  })

  const set = (k: keyof CreateContractPayload, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setOverrideSchedule(false)
    setSchedule({ payload: DEFAULT_SCHEDULE, note: "" })
  }

  const handleCreate = async () => {
    if (!form.startDate || !form.employmentType) return
    await createContract.mutateAsync({
      ...form,
      overrideSchedule,
      schedulePolicy: overrideSchedule ? schedule.payload : null,
    })
    resetForm()
    setShowForm(false)
  }

  const handleStatusChange = (
    contractId: number,
    contractStatus: ContractStatus
  ) => {
    updateStatus.mutate({ contractId, contractStatus })
  }

  const handleDelete = (contractId: number) => {
    if (!confirm("Delete this contract? This cannot be undone.")) return
    deleteContract.mutate(contractId)
  }

  if (isLoading) {
    return (
      <div className="py-16 text-center text-[13px] text-muted-foreground">
        Loading contracts…
      </div>
    )
  }

  const active = contracts.filter((c) => c.contractStatus === "ACTIVE")
  const others = contracts.filter((c) => c.contractStatus !== "ACTIVE")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold">Employment Contracts</h3>
          <p className="text-[12px] text-muted-foreground">
            {contracts.length} contract{contracts.length !== 1 ? "s" : ""} on
            file
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <HugeiconsIcon
              icon={PlusSignIcon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            New Contract
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[13px] font-semibold">New Contract</p>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Employment Type */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Employment Type *</Label>
              <Select
                value={form.employmentType}
                onValueChange={(v) =>
                  set("employmentType", v as EmploymentType)
                }
              >
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map(([val, label]) => (
                    <SelectItem key={val} value={val} className="text-[13px]">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contract Number */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Contract Number</Label>
              <Input
                className="h-8 text-[13px]"
                placeholder="e.g. CONTRACT-2024-001"
                value={form.contractNumber ?? ""}
                onChange={(e) => set("contractNumber", e.target.value || null)}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Start Date *</Label>
              <Input
                type="date"
                className="h-8 text-[13px]"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">End Date</Label>
              <Input
                type="date"
                className="h-8 text-[13px]"
                value={form.endDate ?? ""}
                onChange={(e) => set("endDate", e.target.value || null)}
              />
              <p className="text-[10px] text-muted-foreground">
                Leave blank for open-ended
              </p>
            </div>

            {/* Probation End Date */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Probation End Date</Label>
              <Input
                type="date"
                className="h-8 text-[13px]"
                value={form.probationEndDate ?? ""}
                onChange={(e) =>
                  set("probationEndDate", e.target.value || null)
                }
              />
            </div>

            {/* Signing Date */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Signing Date</Label>
              <Input
                type="date"
                className="h-8 text-[13px]"
                value={form.signingDate ?? ""}
                onChange={(e) => set("signingDate", e.target.value || null)}
              />
            </div>

            {/* Job Position */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Job Position</Label>
              <Select
                value={form.jobPositionId?.toString() ?? "none"}
                onValueChange={(v) =>
                  set("jobPositionId", v === "none" ? null : Number(v))
                }
              >
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-[13px]">
                    None
                  </SelectItem>
                  {positions
                    .filter((p) => p.active)
                    .map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id.toString()}
                        className="text-[13px]"
                      >
                        {p.title}
                        {p.department ? ` · ${p.department}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Salary</Label>
              <div className="flex gap-2">
                <Select
                  value={form.currency ?? "PHP"}
                  onValueChange={(v) => set("currency", v)}
                >
                  <SelectTrigger className="h-8 w-24 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem
                        key={c.code}
                        value={c.code}
                        className="text-[13px]"
                      >
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  className="h-8 flex-1 text-[13px]"
                  placeholder="0"
                  value={form.salaryAmount ?? ""}
                  onChange={(e) =>
                    set(
                      "salaryAmount",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>

          </div>

          {/* Leave entitlement */}
          <div className="mt-4 rounded-lg border bg-background p-4">
            <Label className="text-[13px] font-semibold">Leave entitlement</Label>
            <p className="mt-0.5 mb-3 text-[11px] text-muted-foreground">
              Annual paid-leave credits for this contract.
            </p>
            <LeaveCreditsForm
              value={form.leaveCredits ?? {}}
              onChange={(lc) => set("leaveCredits", lc)}
            />
          </div>

          {/* Schedule policy override */}
          <div className="mt-4 rounded-lg border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-[13px] font-semibold">
                  Custom schedule policy
                </Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {overrideSchedule
                    ? "This employee will use the custom schedule below for attendance."
                    : "Off — uses the role / organization default schedule policy."}
                </p>
              </div>
              <Switch
                checked={overrideSchedule}
                onCheckedChange={setOverrideSchedule}
              />
            </div>
            {overrideSchedule && (
              <div className="mt-4 border-t pt-4">
                <SchedulePolicyForm
                  value={schedule}
                  onChange={setSchedule}
                  showNote={false}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mt-4 space-y-1.5">
            <Label className="text-[12px]">Notes</Label>
            <Textarea
              className="min-h-16 resize-none text-[13px]"
              placeholder="Any notes or remarks…"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!form.startDate || createContract.isPending}
              onClick={handleCreate}
            >
              <HugeiconsIcon
                icon={FloppyDiskIcon}
                size={13}
                strokeWidth={2}
                className="mr-1.5"
              />
              {createContract.isPending ? "Saving…" : "Save Contract"}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {contracts.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed bg-card py-14 text-center">
          <HugeiconsIcon
            icon={FileEditIcon}
            size={28}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-muted-foreground/50"
          />
          <p className="text-[13px] font-medium text-muted-foreground">
            No contracts on file
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Create the first employment contract for this employee.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
            <HugeiconsIcon
              icon={PlusSignIcon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            New Contract
          </Button>
        </div>
      )}

      {/* Active Contracts */}
      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Active
          </p>
          {active.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onStatusChange={(s) => handleStatusChange(c.id, s)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}

      {/* Past Contracts */}
      {others.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Past / Draft
          </p>
          {others.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onStatusChange={(s) => handleStatusChange(c.id, s)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── ContractCard ────────────────────────────────────────────────────────────

import type { EmploymentContract } from "@/lib/contract-api"

function ContractCard({
  contract: c,
  expanded,
  onToggle,
  onStatusChange,
  onDelete,
}: {
  contract: EmploymentContract
  expanded: boolean
  onToggle: () => void
  onStatusChange: (s: ContractStatus) => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm transition-all",
        c.contractStatus === "ACTIVE" &&
          "border-green-200 dark:border-green-900"
      )}
    >
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold">
              {EMPLOYMENT_TYPE_LABELS[c.employmentType]}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                CONTRACT_STATUS_COLORS[c.contractStatus]
              )}
            >
              {CONTRACT_STATUS_LABELS[c.contractStatus]}
            </span>
            {c.contractNumber && (
              <span className="text-[11px] text-muted-foreground">
                #{c.contractNumber}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {fmt(c.startDate)} →{" "}
            {c.endDate ? (
              fmt(c.endDate)
            ) : (
              <span className="italic">Open-ended</span>
            )}
            {c.jobPosition && ` · ${c.jobPosition.title}`}
            {c.salaryAmount != null &&
              ` · ${c.currency ?? "PHP"} ${c.salaryAmount.toLocaleString("en-PH")}`}
          </p>
        </div>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={2}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pt-3 pb-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px] sm:grid-cols-3">
            <Field
              label="Employment Type"
              value={EMPLOYMENT_TYPE_LABELS[c.employmentType]}
            />
            <Field
              label="Status"
              value={CONTRACT_STATUS_LABELS[c.contractStatus]}
            />
            {c.contractNumber && (
              <Field label="Contract #" value={c.contractNumber} />
            )}
            <Field label="Start Date" value={fmt(c.startDate)} />
            <Field label="End Date" value={fmt(c.endDate)} />
            {c.probationEndDate && (
              <Field label="Probation Ends" value={fmt(c.probationEndDate)} />
            )}
            {c.signingDate && (
              <Field label="Signed On" value={fmt(c.signingDate)} />
            )}
            {c.jobPosition && (
              <Field
                label="Position"
                value={`${c.jobPosition.title}${c.jobPosition.department ? ` · ${c.jobPosition.department}` : ""}`}
              />
            )}
            {c.salaryAmount != null && (
              <Field
                label="Salary"
                value={`${c.currency ?? "PHP"} ${c.salaryAmount.toLocaleString("en-PH")}`}
              />
            )}
            {activeLeaveTypes(c.leaveCredits).map((lt) => {
              const label = leaveCreditLabel(c.leaveCredits, lt.key)
              return label ? (
                <Field key={lt.key} label={lt.label} value={label} />
              ) : null
            })}
            {c.scheduleOverridden && (
              <Field label="Schedule" value="Custom policy" />
            )}
          </div>

          {c.notes && (
            <div className="mt-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Notes
              </p>
              <p className="mt-1 text-[12px]">{c.notes}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Quick status change */}
            <Select
              value={c.contractStatus}
              onValueChange={(v) => onStatusChange(v as ContractStatus)}
            >
              <SelectTrigger className="h-7 w-auto gap-1.5 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_STATUSES.map(([val, label]) => (
                  <SelectItem key={val} value={val} className="text-[12px]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                size={12}
                strokeWidth={2}
                className="mr-1"
              />
              Delete
            </Button>

            <span className="ml-auto text-[10px] text-muted-foreground">
              Created by {c.createdBy ?? "—"} · {fmt(c.createdAt)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-[12px] font-medium">{value}</p>
    </div>
  )
}
