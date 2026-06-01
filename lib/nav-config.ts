import type { NavItem } from "./types"

// All dashboard nav items — sidebar filters by user's authorities
export const navConfig: NavItem[] = [
  { label: "Dashboard", section: "overview", authority: null },
  {
    label: "Management",
    section: "team",
    authority: null,
    noPage: true,
    children: [
      {
        label: "Employees",
        section: "employees",
        authority: "EMPLOYEE_MANAGEMENT:VIEW_EMPLOYEES",
      },
      {
        label: "Attendance Logs",
        section: "attendance",
        authority: "ATTENDANCE_MANAGEMENT:VIEW_ALL_ATTENDANCE",
      },
      {
        label: "Work Schedule",
        section: "schedules",
        authority: "SCHEDULE_MANAGEMENT:VIEW_SCHEDULES",
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
        label: "Schedule Changes",
        section: "schedule-changes",
        authority: "SCHEDULE_CHANGE_REQUEST:VIEW_ALL",
      },
      {
        label: "Leave Management",
        section: "leave",
        authority: "LEAVE_MANAGEMENT:VIEW_ALL_LEAVE_REQUESTS",
        badge: 4,
      },
      {
        label: "COE",
        section: "coe",
        authority: "COE_MANAGEMENT:VIEW_ALL",
      },
      {
        label: "OT Requests",
        section: "overtime",
        authority: "OVERTIME_MANAGEMENT:VIEW_ALL",
      },
      {
        label: "HR Disputes",
        section: "salary-disputes",
        authority: "SALARY_DISPUTE_MANAGEMENT:VIEW_ALL",
      },
    ],
  },
  {
    label: "Finance System",
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
        label: "Invoices",
        section: "invoices",
        authority: "INVOICES:VIEW_ALL",
      },
      {
        label: "Official Receipts",
        section: "or",
        authority: "OFFICIAL_RECEIPTS:VIEW_ALL",
      },
      {
        label: "Billing",
        section: "billing",
        authority: "BILLING:VIEW_ALL",
      },
      {
        label: "Tax",
        section: "tax",
        authority: "TAX:VIEW_ALL",
      },
      {
        label: "Salary Adjustments",
        section: "salary-adjustments",
        authority: "SALARY_ADJUSTMENTS:VIEW_ALL",
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
    label: "Business / Compliance",
    section: "business",
    authority: null,
    noPage: true,
    children: [
      {
        label: "Contracts",
        section: "contracts",
        authority: "CONTRACTS:VIEW_ALL",
      },
      {
        label: "Permits",
        section: "permits",
        authority: "PERMITS:VIEW_ALL",
      },
      {
        label: "Licenses",
        section: "licenses",
        authority: "LICENSES:VIEW_ALL",
      },
      {
        label: "Government Documents",
        section: "government-docs",
        authority: "GOVERNMENT_DOCS:VIEW_ALL",
      },
      {
        label: "Legal Operations",
        section: "legal-ops",
        authority: "LEGAL_OPS:VIEW_ALL",
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
  {
    label: "Applicants",
    section: "applicants",
    authority: "RECRUITMENT:VIEW_APPLICANTS",
  },
  // Applicant portal — visibility driven by authorities (APPLICANT control)
  {
    label: "Careers",
    section: "careers",
    authority: "CAREERS:VIEW_JOBS",
  },
  {
    label: "My Applications",
    section: "my-applications",
    authority: "MY_APPLICATIONS:VIEW_OWN_APPLICATIONS",
  },
  {
    label: "Interviews",
    section: "interviews",
    authority: "APPLICANT_INTERVIEWS:VIEW_INTERVIEWS",
  },
  {
    label: "Offers",
    section: "offers",
    authority: "APPLICANT_OFFERS:VIEW_OFFERS",
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
      {
        label: "Business Trip",
        section: "my-business-trip",
        authority: "BUSINESS_TRIP:VIEW_OWN",
      },
      {
        label: "Expense Report",
        section: "my-expense",
        authority: "EXPENSE_REPORTS:VIEW_OWN",
      },
    ],
  },
  {
    label: "My Payslip",
    section: "payroll",
    authority: "PAYROLL:VIEW_PAYSLIP",
    // Admins/HR with payroll management see "Finance System → Payroll" instead
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

/**
 * Resolves the landing route after login from the user's authorities, following the
 * same config that drives the sidebar. Returns the first *gated* nav page the user can
 * access (skipping the universal Overview and expand-only parents). Falls back to the
 * dashboard overview when no specific page is authorized.
 */
export function resolveLandingPath(authorities: string[]): string {
  const can = (a: string | null | undefined) => !!a && authorities.includes(a)

  for (const item of navConfig) {
    if (item.children?.length) {
      const child = item.children.find((c) => can(c.authority))
      if (child) return `/dashboard/${child.section}`
      continue
    }
    if (item.noPage || item.section === "overview") continue
    if (can(item.authority)) return `/dashboard/${item.section}`
  }

  return "/dashboard"
}

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
  overview: "Dashboard",
  dtr: "My Attendance",
  payroll: "Payroll",
  request: "My Leave",
  leave: "Leave Management",
  team: "Management",
  attendance: "Attendance Logs",
  employees: "Employees",
  "change-time": "Change Time In/Time Out",
  or: "Official Receipts",
  coe: "COE Requests",
  overtime: "OT Requests",
  "my-overtime": "Overtime",
  "my-coe": "COE Requests",
  "my-or": "OR Requests",
  "my-change-time": "Change Time In/Time Out",
  "my-schedule": "Schedule Change Request",
  "salary-disputes": "HR Disputes",
  "my-salary-dispute": "Salary Dispute",
  "business-trip": "Business Trip",
  "my-business-trip": "Business Trip",
  expenses: "Expense Reports",
  "my-expense": "Expense Reports",
  requests: "Requests",
  business: "Business / Compliance",
  receipts: "Official Receipts",
  permits: "Permits",
  contracts: "Contracts",
  schedules: "Work Schedule",
  finance: "Finance System",
  invoices: "Invoices",
  billing: "Billing",
  tax: "Tax",
  "salary-adjustments": "Salary Adjustments",
  licenses: "Licenses",
  "government-docs": "Government Documents",
  "legal-ops": "Legal Operations",
  rewards: "Rewards & Ratings",
  reports: "Reports",
  upload: "Upload Center",
  announcements: "Announcements",
  recruitment: "Recruitment",
  applicants: "Applicants",
  careers: "Careers",
  "my-applications": "My Applications",
  interviews: "Interviews",
  offers: "Offers",
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
