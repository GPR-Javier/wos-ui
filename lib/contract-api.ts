import { api } from "./api"
import type { SchedulePolicyPayload } from "./schedule-policy-api"

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Annual paid-leave entitlement granted by a contract, split by type.
 * `flexi` is a single pool usable across three leave kinds; the rest are dedicated.
 * The four day-counts are the annual entitlement (the cap when accruing).
 */
export interface LeaveCredits {
  flexi?: number | null
  sick?: number | null
  vacation?: number | null
  emergency?: number | null
  /** true → flexi pool only; false/undefined → the three dedicated types. */
  useFlexi?: boolean
  /** true → accrue annual/12 per month (capped at annual); false → granted upfront. */
  accrueMonthly?: boolean
}

/** A day-count leave pool key (excludes the boolean flags). */
export type LeaveTypeKey = "flexi" | "sick" | "vacation" | "emergency"

export const LEAVE_TYPES: { key: LeaveTypeKey; label: string }[] = [
  { key: "flexi", label: "Flexi Leave" },
  { key: "sick", label: "Sick Leave" },
  { key: "vacation", label: "Vacation Leave" },
  { key: "emergency", label: "Emergency Leave" },
]

/** The leave pools in effect for a config: flexi alone, or the three dedicated types. */
export function activeLeaveTypes(
  lc?: LeaveCredits | null
): { key: LeaveTypeKey; label: string }[] {
  if (lc?.useFlexi) return LEAVE_TYPES.filter((t) => t.key === "flexi")
  return LEAVE_TYPES.filter((t) => t.key !== "flexi")
}

/** Derived monthly accrual rate for an annual entitlement. */
export function monthlyRate(annual?: number | null): number {
  return annual != null ? annual / 12 : 0
}

/** Compact rate text, e.g. 2 or 1.3 (drops trailing .0). */
function fmtRate(r: number): string {
  return r % 1 === 0 ? String(r) : r.toFixed(1)
}

/**
 * Display string for one leave pool, e.g. "24 days / yr · accrues ~2/mo"
 * or "15 days / yr · upfront". Returns null when the pool has no value.
 */
export function leaveCreditLabel(
  lc: LeaveCredits | null | undefined,
  key: LeaveTypeKey
): string | null {
  const v = lc?.[key]
  if (v == null) return null
  const base = `${v} day${v === 1 ? "" : "s"} / yr`
  const suffix = lc?.accrueMonthly
    ? ` · accrues ~${fmtRate(v / 12)}/mo`
    : " · upfront"
  return `${base}${suffix}`
}

/** Whole months elapsed between two dates (0 if b is before a). */
function monthsBetween(a: Date, b: Date): number {
  return Math.max(
    0,
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  )
}

/**
 * Days accrued so far for one pool. Upfront → the full annual amount.
 * Monthly → min(annual, monthsElapsed × annual/12), capped at the annual cap.
 */
export function accruedDays(
  annual: number | null | undefined,
  startDate: string | null | undefined,
  accrueMonthly?: boolean,
  asOf: Date = new Date()
): number {
  if (annual == null) return 0
  if (!accrueMonthly || !startDate) return annual
  const start = new Date(startDate + "T00:00:00")
  const months = monthsBetween(start, asOf)
  return Math.min(annual, months * monthlyRate(annual))
}

export type EmploymentType =
  | "REGULAR"
  | "PROBATIONARY"
  | "CONTRACTUAL"
  | "PROJECT_BASED"
  | "PART_TIME"
  | "CASUAL"

export type ContractStatus =
  | "DRAFT"
  | "ACTIVE"
  | "EXPIRED"
  | "TERMINATED"
  | "SUPERSEDED"

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  REGULAR: "Regular",
  PROBATIONARY: "Probationary",
  CONTRACTUAL: "Contractual",
  PROJECT_BASED: "Project-Based",
  PART_TIME: "Part-Time",
  CASUAL: "Casual",
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
  SUPERSEDED: "Superseded",
}

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  EXPIRED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  TERMINATED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  SUPERSEDED:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

export interface ContractPositionSummary {
  id: number
  title: string
  department?: string | null
}

export interface ContractEmployeeSummary {
  id: number
  firstName?: string | null
  lastName?: string | null
  employeeId?: string | null
  email?: string | null
}

export interface EmploymentContract {
  id: number
  contractNumber?: string | null
  employmentType: EmploymentType
  workType?: string | null
  salaryAmount?: number | null
  currency?: string | null
  salaryPeriod?: string | null
  leaveCredits?: LeaveCredits | null
  applicantSignature?: string | null
  contractStatus: ContractStatus
  startDate: string // "YYYY-MM-DD"
  endDate?: string | null
  probationEndDate?: string | null
  signingDate?: string | null
  notes?: string | null
  content?: string | null
  jobPosition?: ContractPositionSummary | null
  employee?: ContractEmployeeSummary | null
  /** Whether the employee currently has a USER-scope schedule override. */
  scheduleOverridden?: boolean
  /** The current USER-scope override payload, when scheduleOverridden is true. */
  schedulePolicy?: SchedulePolicyPayload | null
  createdAt: string
  createdBy?: string | null
  updatedAt: string
  updatedBy?: string | null
}

export interface CreateContractPayload {
  employmentType: EmploymentType
  workType?: string | null
  salaryAmount?: number | null
  currency?: string | null
  salaryPeriod?: string | null
  leaveCredits?: LeaveCredits | null
  startDate: string
  endDate?: string | null
  probationEndDate?: string | null
  signingDate?: string | null
  contractNumber?: string | null
  notes?: string | null
  content?: string | null
  jobPositionId?: number | null
  /** TRUE = save schedulePolicy as a USER override; FALSE = clear it; omit = leave as-is. */
  overrideSchedule?: boolean
  schedulePolicy?: SchedulePolicyPayload | null
}

export interface UpdateContractPayload {
  employmentType?: EmploymentType
  workType?: string | null
  salaryAmount?: number | null
  currency?: string | null
  salaryPeriod?: string | null
  leaveCredits?: LeaveCredits | null
  contractStatus?: ContractStatus
  startDate?: string
  endDate?: string | null
  probationEndDate?: string | null
  signingDate?: string | null
  notes?: string | null
  content?: string | null
  jobPositionId?: number | null
  overrideSchedule?: boolean
  schedulePolicy?: SchedulePolicyPayload | null
}

// ── API ───────────────────────────────────────────────────────────────────────

const base = (userId: number) => `/hr/employees/${userId}/contracts`

export const listAllContracts = () =>
  api.get<EmploymentContract[]>("/hr/contracts").then((r) => r.data)

export const listContracts = (userId: number) =>
  api.get<EmploymentContract[]>(base(userId)).then((r) => r.data)

export const getContract = (userId: number, contractId: number) =>
  api
    .get<EmploymentContract>(`${base(userId)}/${contractId}`)
    .then((r) => r.data)

export const createContract = (
  userId: number,
  payload: CreateContractPayload
) => api.post<EmploymentContract>(base(userId), payload).then((r) => r.data)

export const updateContract = (
  userId: number,
  contractId: number,
  payload: UpdateContractPayload
) =>
  api
    .put<EmploymentContract>(`${base(userId)}/${contractId}`, payload)
    .then((r) => r.data)

export const updateContractStatus = (
  userId: number,
  contractId: number,
  contractStatus: ContractStatus
) =>
  api
    .patch<EmploymentContract>(`${base(userId)}/${contractId}/status`, {
      contractStatus,
    })
    .then((r) => r.data)

export const deleteContract = (userId: number, contractId: number) =>
  api.delete(`${base(userId)}/${contractId}`)
