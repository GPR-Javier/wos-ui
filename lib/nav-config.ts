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
        label: "Leave Management",
        section: "leave",
        authority: "LEAVE_MANAGEMENT:VIEW_ALL_LEAVE_REQUESTS",
        badge: 4,
      },
      {
        label: "Employees",
        section: "employees",
        authority: "EMPLOYEE_MANAGEMENT:VIEW_EMPLOYEES",
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
    ],
  },
  {
    label: "System",
    section: "admin",
    authority: "CONFIGURATION:VIEW_CONFIG",
    noPage: true,
    children: [
      {
        label: "Configuration",
        section: "config",
        authority: "CONFIGURATION:VIEW_CONFIG",
      },
      {
        label: "Schedule Change Requests",
        section: "schedule-changes",
        authority: "SCHEDULE_CHANGE_REQUEST:VIEW_ALL",
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
    label: "My Leave",
    section: "request",
    authority: "LEAVE:VIEW_OWN_LEAVE",
    badge: 2,
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
