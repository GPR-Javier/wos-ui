import type { PricingPlan, PlanComparison } from "@/lib/pricing-api"

// Local fallbacks mirroring GET /hr/plans* so public pages render before wos-hr is up.

export const FALLBACK_PLANS: PricingPlan[] = [
  { slug: "trial", name: "Free Trial", tagline: "Try everything, no card required", currency: "USD", monthlyPrice: 0, annualPrice: 0, customPrice: false, seatLimit: 10, includedSeats: 10, perSeatMonthly: null, perSeatAnnual: null, trialDays: 14, recommended: false, sortOrder: 0, ctaLabel: "Start free trial", features: [] },
  { slug: "starter", name: "Starter", tagline: "The HR essentials for small teams", currency: "USD", monthlyPrice: 29, annualPrice: 290, customPrice: false, seatLimit: null, includedSeats: 15, perSeatMonthly: 9, perSeatAnnual: 90, trialDays: null, recommended: false, sortOrder: 1, ctaLabel: "Choose Starter", features: [] },
  { slug: "business", name: "Business", tagline: "Run payroll and the full request flow", currency: "USD", monthlyPrice: 99, annualPrice: 990, customPrice: false, seatLimit: null, includedSeats: 60, perSeatMonthly: 9, perSeatAnnual: 90, trialDays: null, recommended: false, sortOrder: 2, ctaLabel: "Choose Business", features: [] },
  { slug: "professional", name: "Professional", tagline: "Hiring, AI and analytics at scale", currency: "USD", monthlyPrice: 249, annualPrice: 2490, customPrice: false, seatLimit: null, includedSeats: 250, perSeatMonthly: 9, perSeatAnnual: 90, trialDays: null, recommended: true, sortOrder: 3, ctaLabel: "Choose Professional", features: [] },
  { slug: "enterprise", name: "Enterprise", tagline: "Security, scale and dedicated support", currency: "USD", monthlyPrice: null, annualPrice: null, customPrice: true, seatLimit: null, includedSeats: null, perSeatMonthly: null, perSeatAnnual: null, trialDays: null, recommended: false, sortOrder: 4, ctaLabel: "Talk to sales", features: [] },
]

const FB_STARTER = ["attendance", "directory", "scheduling", "roles"]
const FB_BUSINESS = [...FB_STARTER, "payroll", "requests", "recruitment"]
const FB_PROFESSIONAL = [...FB_BUSINESS, "ai", "analytics", "audit", "rewards"]
const FB_ENTERPRISE = [...FB_PROFESSIONAL, "sso", "support"]

export const FALLBACK_COMPARISON: PlanComparison = {
  features: [
    { key: "attendance", label: "Attendance & leave", description: "Clock in/out, timesheets, and leave requests with approvals." },
    { key: "directory", label: "Employee directory", description: "A searchable directory of every employee and their profile." },
    { key: "scheduling", label: "Scheduling", description: "Build and publish shifts; employees see their own schedule." },
    { key: "roles", label: "Custom roles & permissions", description: "Define custom roles with fine-grained page and action permissions." },
    { key: "payroll", label: "Payroll & overtime", description: "Run payroll, generate payslips, and compute overtime." },
    { key: "requests", label: "Full request workflows", description: "COE, official business, change-time, schedule-change and dispute flows." },
    { key: "recruitment", label: "Recruitment", description: "Post jobs, collect applications, and manage candidates end to end." },
    { key: "ai", label: "AI interviews & assessments", description: "AI-assisted interviews and automated candidate assessments.", note: "Requires your own AI provider API key — billed by the provider, not included in the plan." },
    { key: "analytics", label: "Analytics", description: "Dashboards and reports across attendance, payroll, and hiring." },
    { key: "audit", label: "Audit log", description: "A full audit trail of who changed what, and when." },
    { key: "rewards", label: "Rewards & contracts", description: "Rewards, ratings, and employment-contract management." },
    { key: "sso", label: "SSO & advanced security", description: "Single sign-on plus advanced security and access controls." },
    { key: "support", label: "Priority support & SLA", description: "Priority support with a guaranteed response-time SLA." },
  ],
  plans: [
    { slug: "trial", name: "Free Trial", recommended: false, included: FB_PROFESSIONAL },
    { slug: "starter", name: "Starter", recommended: false, included: FB_STARTER },
    { slug: "business", name: "Business", recommended: false, included: FB_BUSINESS },
    { slug: "professional", name: "Professional", recommended: true, included: FB_PROFESSIONAL },
    { slug: "enterprise", name: "Enterprise", recommended: false, included: FB_ENTERPRISE },
  ],
}
