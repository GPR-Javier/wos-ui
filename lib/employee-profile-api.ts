import { api } from "./api"

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssignmentType =
  | "PROJECT"
  | "TEAM"
  | "SERVICE_AREA"
  | "BRANCH"
  | "WORKSTATION"
  | "OPERATIONAL_ROLE"

export type AssignmentStatus = "ACTIVE" | "UPCOMING" | "ON_HOLD" | "COMPLETED"

export type KpiStatus = "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED"

export interface EmployeeAssignment {
  id: number
  employeeId: number
  type: AssignmentType
  name: string
  description?: string | null
  startDate: string // "YYYY-MM-DD"
  deadline?: string | null // "YYYY-MM-DD"
  status: AssignmentStatus
}

export interface EmployeeKpi {
  id: number
  employeeId: number
  name: string
  target: number
  current: number
  unit?: string | null // e.g., "%", "calls", "units"
  status: KpiStatus
  period: string // e.g., "Q2 2025", "May 2025"
}

export interface CreateAssignmentPayload {
  type: AssignmentType
  name: string
  description?: string
  startDate: string
  deadline?: string | null
  status: AssignmentStatus
}

export interface CreateKpiPayload {
  name: string
  target: number
  current: number
  unit?: string
  status: KpiStatus
  period: string
}

// ── Salary Grades (admin-configured) ─────────────────────────────────────────

export interface SalaryGrade {
  id: number
  name: string
  currency: string
  salaryAmount: number
  effectiveDate?: string | null // "YYYY-MM-DD"
  active: boolean
  employeeCount: number
}

export interface CreateSalaryGradePayload {
  name: string
  currency?: string
  salaryAmount: number
  effectiveDate?: string | null
  active?: boolean
}

export const CURRENCY_OPTIONS = [
  { code: "PHP", symbol: "₱", label: "PHP — Philippine Peso" },
  { code: "USD", symbol: "$", label: "USD — US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR — Euro" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound" },
  { code: "SGD", symbol: "S$", label: "SGD — Singapore Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD — Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY — Japanese Yen" },
]

export function currencySymbol(code: string | null | undefined): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? "₱"
}

// ── Payroll Setup (admin-configured) ─────────────────────────────────────────

export type CompensationBasis =
  | "DAILY"
  | "WEEKLY"
  | "SEMI_MONTHLY"
  | "MONTHLY"
  | "YEARLY"
  | "CONTRACTUAL"

export type DeductionSchedule =
  | "EVERY_PAYROLL"
  | "FIRST_PAYROLL"
  | "SECOND_PAYROLL"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUAL"

export type DeductionAmountType = "FIXED" | "PERCENTAGE"

export interface PayrollSetupLineItem {
  name: string
  amount: number
  amountType?: DeductionAmountType | null
  schedule?: DeductionSchedule | null
}

export interface PayrollSetup {
  id: number
  jobPositionId: number
  jobPositionTitle: string
  salaryGradeId: number
  salaryGradeName: string
  salaryAmount: number
  compensationBasis: CompensationBasis
  cutoffPeriod: string
  overtimeEligible: boolean
  overtimeRate: number
  allowances: PayrollSetupLineItem[]
  deductions: PayrollSetupLineItem[]
  effectiveDate?: string | null
  active: boolean
}

export interface CreatePayrollSetupPayload {
  jobPositionId: number
  salaryGradeId: number
  compensationBasis: CompensationBasis
  cutoffPeriod: string
  overtimeEligible: boolean
  overtimeRate: number
  allowances: PayrollSetupLineItem[]
  deductions: PayrollSetupLineItem[]
  effectiveDate?: string | null
}

// ── Departments (admin-configured) ───────────────────────────────────────────

export interface Department {
  id: number
  name: string
  description?: string | null
  active: boolean
}

export interface CreateDepartmentPayload {
  name: string
  description?: string | null
}

// ── Job Positions (admin-configured) ─────────────────────────────────────────

/** A salary grade as embedded inside a JobPosition response */
export interface PositionSalaryGrade {
  id: number
  name: string
  salaryAmount: number
  isDefault: boolean
  effectiveDate?: string | null
}

export interface JobPosition {
  id: number
  title: string
  department?: string | null
  level?: string | null
  active: boolean
  salaryGradeId?: number | null
  salaryGrade?: PositionSalaryGrade | null
  salaryGrades: PositionSalaryGrade[]
}

export interface CreateJobPositionPayload {
  title: string
  department?: string | null
  level?: string | null
  salaryGradeId?: number | null
}

// ── User Positions (employee ↔ job position junction) ────────────────────────

export interface UserPosition {
  id: number
  userId: number
  position: {
    id: number
    title: string
    department?: string | null
    level?: string | null
    salaryGrades: PositionSalaryGrade[]
  }
  primary: boolean
  startDate?: string | null
  endDate?: string | null
  active: boolean
  assignedBy?: string | null
  assignedAt: string
  removedBy?: string | null
  removedAt?: string | null
}

export interface AssignPositionPayload {
  jobPositionId: number
  primary: boolean
  startDate?: string | null
}

// ── Career Milestones ─────────────────────────────────────────────────────────

export type MilestoneType =
  | "HIRED"
  | "PROBATIONARY"
  | "REGULAR"
  | "PROMOTION"
  | "TRANSFER"
  | "AWARD"
  | "TRAINING"
  | "OTHER"

export interface EmployeeCareerMilestone {
  id: number
  employeeId: number
  type: MilestoneType
  title: string // e.g. "Promoted to Senior Developer"
  date: string // "YYYY-MM-DD"
  notes?: string | null
}

export interface CreateMilestonePayload {
  type: MilestoneType
  title: string
  date: string
  notes?: string | null
}

// ── API ───────────────────────────────────────────────────────────────────────

export const employeeProfileApi = {
  // Assignments
  listAssignments: (employeeId: number) =>
    api
      .get<EmployeeAssignment[]>(`/hr/employees/${employeeId}/assignments`)
      .then((r) => r.data),

  createAssignment: (employeeId: number, payload: CreateAssignmentPayload) =>
    api
      .post<EmployeeAssignment>(
        `/hr/employees/${employeeId}/assignments`,
        payload
      )
      .then((r) => r.data),

  updateAssignment: (
    employeeId: number,
    assignmentId: number,
    payload: Partial<CreateAssignmentPayload>
  ) =>
    api
      .put<EmployeeAssignment>(
        `/hr/employees/${employeeId}/assignments/${assignmentId}`,
        payload
      )
      .then((r) => r.data),

  deleteAssignment: (employeeId: number, assignmentId: number) =>
    api.delete(`/hr/employees/${employeeId}/assignments/${assignmentId}`),

  // KPIs
  listKpis: (employeeId: number) =>
    api
      .get<EmployeeKpi[]>(`/hr/employees/${employeeId}/kpis`)
      .then((r) => r.data),

  createKpi: (employeeId: number, payload: CreateKpiPayload) =>
    api
      .post<EmployeeKpi>(`/hr/employees/${employeeId}/kpis`, payload)
      .then((r) => r.data),

  updateKpi: (
    employeeId: number,
    kpiId: number,
    payload: Partial<CreateKpiPayload>
  ) =>
    api
      .put<EmployeeKpi>(`/hr/employees/${employeeId}/kpis/${kpiId}`, payload)
      .then((r) => r.data),

  deleteKpi: (employeeId: number, kpiId: number) =>
    api.delete(`/hr/employees/${employeeId}/kpis/${kpiId}`),

  // Career Milestones
  listMilestones: (employeeId: number) =>
    api
      .get<EmployeeCareerMilestone[]>(`/hr/employees/${employeeId}/milestones`)
      .then((r) => r.data),

  createMilestone: (employeeId: number, payload: CreateMilestonePayload) =>
    api
      .post<EmployeeCareerMilestone>(
        `/hr/employees/${employeeId}/milestones`,
        payload
      )
      .then((r) => r.data),

  updateMilestone: (
    employeeId: number,
    milestoneId: number,
    payload: Partial<CreateMilestonePayload>
  ) =>
    api
      .put<EmployeeCareerMilestone>(
        `/hr/employees/${employeeId}/milestones/${milestoneId}`,
        payload
      )
      .then((r) => r.data),

  deleteMilestone: (employeeId: number, milestoneId: number) =>
    api.delete(`/hr/employees/${employeeId}/milestones/${milestoneId}`),

  // Job Positions — admin-managed
  listPositions: () =>
    api.get<JobPosition[]>("/hr/positions").then((r) => r.data),

  createPosition: (payload: CreateJobPositionPayload) =>
    api.post<JobPosition>("/hr/positions", payload).then((r) => r.data),

  updatePosition: (id: number, payload: Partial<CreateJobPositionPayload>) =>
    api.put<JobPosition>(`/hr/positions/${id}`, payload).then((r) => r.data),

  deletePosition: (id: number) => api.delete(`/hr/positions/${id}`),

  linkGradeToPosition: (
    positionId: number,
    salaryGradeId: number,
    isDefault: boolean
  ) =>
    api
      .post<JobPosition>(`/hr/positions/${positionId}/salary-grades`, {
        salaryGradeId,
        isDefault,
      })
      .then((r) => r.data),

  unlinkGradeFromPosition: (positionId: number, gradeId: number) =>
    api.delete(`/hr/positions/${positionId}/salary-grades/${gradeId}`),

  // Salary Grades — admin-managed
  listSalaryGrades: () =>
    api.get<SalaryGrade[]>("/hr/salary-grades").then((r) => r.data),

  createSalaryGrade: (payload: CreateSalaryGradePayload) =>
    api.post<SalaryGrade>("/hr/salary-grades", payload).then((r) => r.data),

  updateSalaryGrade: (id: number, payload: Partial<CreateSalaryGradePayload>) =>
    api
      .put<SalaryGrade>(`/hr/salary-grades/${id}`, payload)
      .then((r) => r.data),

  deleteSalaryGrade: (id: number) => api.delete(`/hr/salary-grades/${id}`),

  // Departments — admin-managed
  listDepartments: () =>
    api.get<Department[]>("/hr/departments").then((r) => r.data),

  createDepartment: (payload: CreateDepartmentPayload) =>
    api.post<Department>("/hr/departments", payload).then((r) => r.data),

  updateDepartment: (
    id: number,
    payload: Partial<CreateDepartmentPayload> & { active?: boolean }
  ) =>
    api.put<Department>(`/hr/departments/${id}`, payload).then((r) => r.data),

  deleteDepartment: (id: number) => api.delete(`/hr/departments/${id}`),

  // Payroll Setup — admin-managed
  listPayrollSetups: () =>
    api.get<PayrollSetup[]>("/hr/payroll-setup").then((r) => r.data),

  createPayrollSetup: (payload: CreatePayrollSetupPayload) =>
    api.post<PayrollSetup>("/hr/payroll-setup", payload).then((r) => r.data),

  updatePayrollSetup: (
    id: number,
    payload: Partial<CreatePayrollSetupPayload>
  ) =>
    api
      .put<PayrollSetup>(`/hr/payroll-setup/${id}`, payload)
      .then((r) => r.data),

  deletePayrollSetup: (id: number) => api.delete(`/hr/payroll-setup/${id}`),

  // User Positions — employee ↔ position junction
  listUserPositions: (userId: number) =>
    api
      .get<UserPosition[]>(`/hr/employees/${userId}/positions`)
      .then((r) => r.data),

  assignPosition: (userId: number, payload: AssignPositionPayload) =>
    api
      .post<UserPosition>(`/hr/employees/${userId}/positions`, payload)
      .then((r) => r.data),

  setPrimaryPosition: (userId: number, positionId: number) =>
    api
      .patch<UserPosition>(
        `/hr/employees/${userId}/positions/${positionId}/set-primary`
      )
      .then((r) => r.data),

  removePosition: (userId: number, positionId: number) =>
    api.delete(`/hr/employees/${userId}/positions/${positionId}`),
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const ASSIGNMENT_TYPE_LABEL: Record<AssignmentType, string> = {
  PROJECT: "Project",
  TEAM: "Team Assignment",
  SERVICE_AREA: "Service Area",
  BRANCH: "Branch",
  WORKSTATION: "Workstation",
  OPERATIONAL_ROLE: "Operational Role",
}

export const ASSIGNMENT_TYPE_COLOR: Record<
  AssignmentType,
  "blue" | "purple" | "green" | "amber" | "cyan" | "gray"
> = {
  PROJECT: "blue",
  TEAM: "purple",
  SERVICE_AREA: "green",
  BRANCH: "amber",
  WORKSTATION: "cyan",
  OPERATIONAL_ROLE: "gray",
}

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  ACTIVE: "Active",
  UPCOMING: "Upcoming",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
}

export const ASSIGNMENT_STATUS_VARIANT: Record<
  AssignmentStatus,
  "green" | "blue" | "amber" | "gray"
> = {
  ACTIVE: "green",
  UPCOMING: "blue",
  ON_HOLD: "amber",
  COMPLETED: "gray",
}

export const KPI_STATUS_LABEL: Record<KpiStatus, string> = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  BEHIND: "Behind",
  COMPLETED: "Completed",
}

export const KPI_STATUS_VARIANT: Record<
  KpiStatus,
  "green" | "amber" | "red" | "blue"
> = {
  ON_TRACK: "green",
  AT_RISK: "amber",
  BEHIND: "red",
  COMPLETED: "blue",
}

export const MILESTONE_TYPE_LABEL: Record<MilestoneType, string> = {
  HIRED: "Hired",
  PROBATIONARY: "Probationary",
  REGULAR: "Regularized",
  PROMOTION: "Promotion",
  TRANSFER: "Transfer",
  AWARD: "Award",
  TRAINING: "Training",
  OTHER: "Other",
}

export const MILESTONE_TYPES: MilestoneType[] = [
  "HIRED",
  "PROBATIONARY",
  "REGULAR",
  "PROMOTION",
  "TRANSFER",
  "AWARD",
  "TRAINING",
  "OTHER",
]

// Dot color class and icon color class per type
export const MILESTONE_TYPE_STYLE: Record<
  MilestoneType,
  { dot: string; ring: string; label: string }
> = {
  HIRED: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-200 dark:ring-emerald-800",
    label: "text-emerald-700 dark:text-emerald-400",
  },
  PROBATIONARY: {
    dot: "bg-violet-500",
    ring: "ring-violet-200 dark:ring-violet-800",
    label: "text-violet-700 dark:text-violet-400",
  },
  REGULAR: {
    dot: "bg-blue-500",
    ring: "ring-blue-200 dark:ring-blue-800",
    label: "text-blue-700 dark:text-blue-400",
  },
  PROMOTION: {
    dot: "bg-amber-500",
    ring: "ring-amber-200 dark:ring-amber-800",
    label: "text-amber-700 dark:text-amber-400",
  },
  TRANSFER: {
    dot: "bg-cyan-500",
    ring: "ring-cyan-200 dark:ring-cyan-800",
    label: "text-cyan-700 dark:text-cyan-400",
  },
  AWARD: {
    dot: "bg-yellow-400",
    ring: "ring-yellow-200 dark:ring-yellow-800",
    label: "text-yellow-700 dark:text-yellow-400",
  },
  TRAINING: {
    dot: "bg-indigo-500",
    ring: "ring-indigo-200 dark:ring-indigo-800",
    label: "text-indigo-700 dark:text-indigo-400",
  },
  OTHER: {
    dot: "bg-gray-400",
    ring: "ring-gray-200 dark:ring-gray-700",
    label: "text-gray-600 dark:text-gray-400",
  },
}
