import type { NavItem } from "./types"

// All dashboard nav items — sidebar filters by user's authorities
export const navConfig: NavItem[] = [
  { label: "Overview", section: "overview", authority: null },
  {
    label: "Team",
    section: "team",
    authority: null,
    noPage: true,
    children: [
      {
        label: "Attendance",
        section: "attendance",
        authority: "ATTENDANCE_MANAGEMENT:VIEW_ALL_ATTENDANCE",
      },
      {
        label: "Schedule",
        section: "schedules",
        authority: "SCHEDULE_MANAGEMENT:VIEW_SCHEDULES",
      },
      {
        label: "Employees",
        section: "employees",
        authority: "EMPLOYEE_MANAGEMENT:VIEW_EMPLOYEES",
      },
    ],
  },
  {
    label: "Requests",
    section: "requests",
    authority: null,
    noPage: true,
    children: [
      {
        label: "Change Time In/Time Out",
        section: "change-time",
        authority: "CHANGE_TIME_MANAGEMENT:VIEW_ALL",
      },
      {
        label: "Leave Management",
        section: "leave",
        authority: "LEAVE_MANAGEMENT:VIEW_ALL_LEAVE_REQUESTS",
        badge: 4,
      },
      {
        label: "Schedule Changes",
        section: "schedule-changes",
        authority: "SCHEDULE_CHANGE_REQUEST:VIEW_ALL",
      },
      {
        label: "Overtime",
        section: "overtime",
        authority: "OVERTIME_MANAGEMENT:VIEW_ALL",
      },
      {
        label: "Salary Disputes",
        section: "salary-disputes",
        authority: "SALARY_DISPUTE_MANAGEMENT:VIEW_ALL",
      },
      {
        label: "COE",
        section: "coe",
        authority: "COE_MANAGEMENT:VIEW_ALL",
      },
    ],
  },
  {
    label: "Finance",
    section: "finance",
    authority: null,
    noPage: true,
    children: [
      {
        label: "Payroll",
        section: "payroll",
        authority: "PAYROLL_MANAGEMENT:VIEW_ALL_PAYSLIPS",
      },
      {
        label: "Rewards & Ratings",
        section: "rewards",
        authority: "REWARDS:VIEW_REWARDS",
      },
      {
        label: "Business Trip",
        section: "business-trip",
        authority: "BUSINESS_TRIP:VIEW_ALL",
      },
      {
        label: "Expense Reports",
        section: "expenses",
        authority: "EXPENSE_REPORTS:VIEW_ALL",
      },
    ],
  },
  {
    label: "Business",
    section: "business",
    authority: null,
    noPage: true,
    children: [
      {
        label: "Official Receipts",
        section: "or",
        authority: "OFFICIAL_RECEIPTS:VIEW_ALL",
      },
      {
        label: "Contracts",
        section: "contracts",
        authority: "CONTRACTS:VIEW_ALL",
      },
    ],
  },
  {
    label: "System",
    section: "admin",
    authority: null,
    noPage: true,
    children: [
      {
        label: "Configuration",
        section: "config",
        authority: "SCHEDULE_POLICY:VIEW",
      },
      {
        label: "Roles & Permissions",
        section: "roles",
        authority: "ROLES_AND_PERMISSIONS:VIEW_ROLES",
      },
      {
        label: "Audit Log",
        section: "audit",
        authority: "AUDIT_LOG:VIEW_AUDIT_LOGS",
      },
    ],
  },
  {
    label: "Recruitment",
    section: "recruitment",
    authority: "RECRUITMENT:VIEW_JOB_POSTINGS",
  },
  // Personal / self-service items — visibility driven by authorities
  {
    label: "My Attendance",
    section: "dtr",
    authority: "DTR:VIEW_ATTENDANCE",
    badge: 1,
  },
  {
    label: "Request",
    section: "my-requests",
    authority: null,
    noPage: true,
    children: [
      {
        label: "Change Time In/Time Out",
        section: "my-change-time",
        authority: "CHANGE_TIME_REQUEST:VIEW_OWN",
      },
      {
        label: "File Leave",
        section: "request",
        authority: "LEAVE:VIEW_OWN_LEAVE",
        badge: 2,
      },
      {
        label: "Overtime",
        section: "my-overtime",
        authority: "OVERTIME:VIEW_OWN",
      },
      {
        label: "Change Schedule",
        section: "my-schedule",
        authority: "SCHEDULE_CHANGE_REQUEST:VIEW_OWN",
      },
      {
        label: "COE",
        section: "my-coe",
        authority: "CERTIFICATE_OF_EMPLOYMENT:VIEW_OWN",
      },
      {
        label: "Salary Dispute",
        section: "my-salary-dispute",
        authority: "SALARY_DISPUTE:VIEW_OWN",
      },
    ],
  },
  {
    label: "My Payslip",
    section: "payroll",
    authority: "PAYROLL:VIEW_PAYSLIP",
    // Admins/HR with payroll management see "Finance → Payroll" instead
    hideIfAuthority: "PAYROLL_MANAGEMENT:VIEW_ALL_PAYSLIPS",
  },
  {
    label: "Reports",
    section: "reports",
    authority: "REPORTS:VIEW_REPORTS",
  },
  {
    label: "Upload Center",
    section: "upload",
    authority: "UPLOAD_CENTER:VIEW_UPLOADS",
  },
  {
    label: "Announcements",
    section: "announcements",
    authority: "ANNOUNCEMENTS:VIEW_ANNOUNCEMENTS",
  },
]

// Settings nav (always shown on /dashboard/settings/*)
export const settingsNavConfig: NavItem[] = [
  { label: "Profile", section: "general", authority: null },
  { label: "Security", section: "security", authority: null },
  { label: "Notifications", section: "notifications", authority: null },
  { label: "Appearance", section: "appearance", authority: null },
]

export const roleLabels: Record<string, string> = {
  EMPLOYEE: "Employee",
  HR: "HR Manager",
  ADMIN: "Admin",
}

export const sectionTitles: Record<string, string> = {
  overview: "Overview",
  dtr: "My Attendance",
  payroll: "Payroll",
  request: "My Leave",
  leave: "Leave Management",
  team: "Team",
  attendance: "Attendance",
  employees: "Employees",
  "change-time": "Change Time In/Time Out",
  or: "Official Receipts",
  coe: "COE Requests",
  overtime: "Overtime",
  "my-overtime": "Overtime",
  "my-coe": "COE Requests",
  "my-or": "OR Requests",
  "my-change-time": "Change Time In/Time Out",
  "my-schedule": "Schedule Change Request",
  "salary-disputes": "Salary Disputes",
  "my-salary-dispute": "Salary Dispute",
  requests: "Requests",
  business: "Business",
  receipts: "Official Receipts",
  permits: "Permits",
  "business-trip": "Business Trip",
  expenses: "Expense Reports",
  contracts: "Contracts",
  schedules: "Schedules",
  finance: "Finance",
  rewards: "Rewards & Ratings",
  reports: "Reports",
  upload: "Upload Center",
  announcements: "Announcements",
  recruitment: "Recruitment",
  admin: "System",
  roles: "Roles & Permissions",
  audit: "Audit Log",
  config: "Configuration",
  "schedule-changes": "Schedule Change Requests",
  settings: "Settings",
  general: "My Profile",
  security: "Security",
  notifications: "Notifications",
  appearance: "Appearance",
}
