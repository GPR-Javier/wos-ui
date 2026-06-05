import { api } from "./api"

// ── Types ─────────────────────────────────────────────────────────────────────

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

export interface ContractGradeSummary {
  id: number
  name: string
  salaryAmount: number
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
  salaryPeriod?: string | null
  applicantSignature?: string | null
  contractStatus: ContractStatus
  startDate: string // "YYYY-MM-DD"
  endDate?: string | null
  probationEndDate?: string | null
  signingDate?: string | null
  notes?: string | null
  content?: string | null
  jobPosition?: ContractPositionSummary | null
  salaryGrade?: ContractGradeSummary | null
  employee?: ContractEmployeeSummary | null
  createdAt: string
  createdBy?: string | null
  updatedAt: string
  updatedBy?: string | null
}

export interface CreateContractPayload {
  employmentType: EmploymentType
  workType?: string | null
  salaryPeriod?: string | null
  startDate: string
  endDate?: string | null
  probationEndDate?: string | null
  signingDate?: string | null
  contractNumber?: string | null
  notes?: string | null
  content?: string | null
  jobPositionId?: number | null
  salaryGradeId?: number | null
}

export interface UpdateContractPayload {
  employmentType?: EmploymentType
  workType?: string | null
  salaryPeriod?: string | null
  contractStatus?: ContractStatus
  startDate?: string
  endDate?: string | null
  probationEndDate?: string | null
  signingDate?: string | null
  notes?: string | null
  content?: string | null
  jobPositionId?: number | null
  salaryGradeId?: number | null
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
