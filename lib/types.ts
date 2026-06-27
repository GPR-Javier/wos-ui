export type Role = "employee" | "admin" | "settings" | "applicant"

export interface NavItem {
  label: string
  section: string
  badge?: number
  authority: string | null // authority required to see this item; null = always visible
  hideIfAuthority?: string // hide this item if the user *also* has this authority (mutual-exclusion with the admin counterpart)
  children?: NavItem[]
  noPage?: boolean // parent is expand-only — clicking label just toggles children, no navigation
}

export interface Employee {
  id: string
  name: string
  initials: string
  email: string
  department: string
  position: string
  role: "employee" | "hr" | "admin"
  status: "active" | "on-leave" | "inactive"
  startDate: string
  employeeId: string
}

export interface AttendanceRecord {
  date: string
  day: string
  timeIn: string
  timeOut: string
  hoursWorked: string
  rdHours?: string
  otHours: string
  status:
    | "present"
    | "late"
    | "absent"
    | "leave"
    | "holiday"
    | "restday"
    | "overtime"
    | "overbreak"
    | "undertime"
}

export interface PayslipData {
  period: string
  basic: string
  otHrs: string
  ot: string
  gross: string
  sss: string
  philhealth: string
  pagibig: string
  tax: string
  deductions: string
  net: string
  released: string
  status: "released" | "upcoming"
}

export interface LeaveBalance {
  type: string
  total: number
  used: number
  remaining: number
  color: "green" | "blue" | "amber" | "purple"
}

export interface LeaveRequest {
  id: string
  employee: string
  initials: string
  type: string
  from: string
  to: string
  days: number
  status: "pending" | "approved" | "rejected"
  reason: string
  filed: string
}

export interface AuditLog {
  id: string
  user: string
  initials: string
  action: string
  target: string
  ip: string
  timestamp: string
  severity: "info" | "warning" | "critical"
}

export interface JobPosting {
  id: string
  title: string
  department: string
  location: string
  type: string
  salary: string
  status: "new" | "urgent" | "open" | "closed"
  applications: number
  tags: string[]
}
