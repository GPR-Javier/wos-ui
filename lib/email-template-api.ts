"use client"

// Frontend-only mock for the email template system. Seeded "system" templates mirror what the
// future `wos-notification` service will own; company overrides are persisted to localStorage so
// the prototype feels stateful. Swap these functions for axios calls when the backend lands.

import type {
  CompanyEmailConfig,
  EmailBlock,
  EmailLayout,
  EmailTemplate,
  ResolvedTemplate,
  TemplateVariable,
} from "./email-template-types"

export function newId(prefix = "blk"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

// ── Block factories (keep seeded layouts readable) ───────────────────────────

function heading(text: string): EmailBlock {
  return {
    id: newId(),
    type: "heading",
    content: { text },
    style: { align: "left", fontSize: 22, bold: true, color: "#0f172a", paddingY: 8 },
  }
}
function text(body: string): EmailBlock {
  return {
    id: newId(),
    type: "text",
    content: { text: body },
    style: { align: "left", fontSize: 14, color: "#334155", paddingY: 8 },
  }
}
function button(label: string, href = "https://app.workos.dev"): EmailBlock {
  return {
    id: newId(),
    type: "button",
    content: { text: label, href },
    style: { align: "left", background: "#4f46e5", color: "#ffffff", radius: 8, paddingY: 12, paddingX: 20 },
  }
}
function divider(): EmailBlock {
  return { id: newId(), type: "divider", content: {}, style: { color: "#e2e8f0", paddingY: 8 } }
}
function spacer(height = 16): EmailBlock {
  return { id: newId(), type: "spacer", content: {}, style: { height } }
}
function footer(body: string): EmailBlock {
  return {
    id: newId(),
    type: "footer",
    content: { text: body },
    style: { align: "center", fontSize: 12, color: "#94a3b8", paddingY: 8 },
  }
}

function layout(blocks: EmailBlock[]): EmailLayout {
  return { blocks, background: "#f1f5f9", contentBackground: "#ffffff", width: 600 }
}

// Common variables reused across templates.
const V = {
  recipientName: {
    key: "recipientName",
    label: "Recipient name",
    sampleValue: "Maria Santos",
    required: false,
    source: "SYSTEM",
    dataType: "STRING",
  } satisfies TemplateVariable,
  companyName: {
    key: "companyName",
    label: "Company name",
    sampleValue: "Acme Corp",
    required: false,
    source: "SYSTEM",
    dataType: "STRING",
  } satisfies TemplateVariable,
  supportEmail: {
    key: "supportEmail",
    label: "Support email",
    sampleValue: "support@acme.com",
    required: false,
    source: "SYSTEM",
    dataType: "STRING",
  } satisfies TemplateVariable,
}

// ── Seeded system templates ──────────────────────────────────────────────────

export const SYSTEM_TEMPLATES: EmailTemplate[] = [
  {
    key: "REGISTER_OTP",
    category: "AUTH",
    name: "Registration OTP",
    description: "One-time code sent to verify a new account's email address.",
    isMarketing: false,
    defaultSubject: "Your {{companyName}} verification code",
    variables: [
      V.recipientName,
      V.companyName,
      { key: "otp", label: "OTP code", sampleValue: "493201", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "expiryMinutes", label: "Expiry (minutes)", sampleValue: "10", required: true, source: "SYSTEM", dataType: "NUMBER" },
    ],
    defaultLayout: layout([
      heading("Verify your email"),
      text("Hi {{recipientName}}, use the code below to finish setting up your {{companyName}} account."),
      { id: newId(), type: "heading", content: { text: "{{otp}}" }, style: { align: "center", fontSize: 34, bold: true, color: "#4f46e5", paddingY: 16 } },
      text("This code expires in {{expiryMinutes}} minutes. If you didn't request it, you can safely ignore this email."),
      spacer(),
      divider(),
      footer("Sent by {{companyName}} • Need help? {{supportEmail}}"),
    ]),
  },
  {
    key: "FORGOT_PASSWORD",
    category: "AUTH",
    name: "Password reset",
    description: "Reset code / link sent when a user requests a password reset.",
    isMarketing: false,
    defaultSubject: "Reset your {{companyName}} password",
    variables: [
      V.recipientName,
      V.companyName,
      { key: "resetCode", label: "Reset code", sampleValue: "771204", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "resetUrl", label: "Reset link", sampleValue: "https://app.workos.dev/reset?t=abc", required: false, source: "SYSTEM", dataType: "URL" },
    ],
    defaultLayout: layout([
      heading("Reset your password"),
      text("Hi {{recipientName}}, we received a request to reset your password. Use the code below or click the button."),
      { id: newId(), type: "heading", content: { text: "{{resetCode}}" }, style: { align: "center", fontSize: 34, bold: true, color: "#4f46e5", paddingY: 16 } },
      button("Reset password", "{{resetUrl}}"),
      spacer(),
      footer("Didn't request this? Contact {{supportEmail}}."),
    ]),
  },
  {
    key: "WELCOME",
    category: "AUTH",
    name: "Welcome",
    description: "Sent after an account is activated.",
    isMarketing: false,
    defaultSubject: "Welcome to {{companyName}}, {{recipientName}}!",
    variables: [V.recipientName, V.companyName, { key: "loginUrl", label: "Login link", sampleValue: "https://app.workos.dev/login", required: false, source: "SYSTEM", dataType: "URL" }],
    defaultLayout: layout([
      heading("Welcome aboard 🎉"),
      text("Hi {{recipientName}}, your {{companyName}} account is ready. Jump in and explore your dashboard."),
      button("Open dashboard", "{{loginUrl}}"),
      spacer(),
      footer("{{companyName}}"),
    ]),
  },
  {
    key: "COMPANY_INVITE",
    category: "AUTH",
    name: "Team invitation",
    description: "Sent when an admin invites someone to join the company.",
    isMarketing: false,
    defaultSubject: "{{inviterName}} invited you to {{companyName}}",
    variables: [
      V.companyName,
      { key: "inviterName", label: "Inviter name", sampleValue: "Jane Cruz", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "roleName", label: "Role", sampleValue: "HR Manager", required: false, source: "SYSTEM", dataType: "STRING" },
      { key: "inviteUrl", label: "Invite link", sampleValue: "https://app.workos.dev/invite?t=xyz", required: true, source: "SYSTEM", dataType: "URL" },
    ],
    defaultLayout: layout([
      heading("You're invited"),
      text("{{inviterName}} has invited you to join {{companyName}} as {{roleName}}."),
      button("Accept invitation", "{{inviteUrl}}"),
      spacer(),
      footer("{{companyName}}"),
    ]),
  },
  {
    key: "APPLICATION_RECEIVED",
    category: "RECRUITMENT",
    name: "Application received",
    description: "Confirmation sent when a candidate submits a job application.",
    isMarketing: false,
    defaultSubject: "We received your application for {{position}}",
    variables: [
      V.recipientName,
      V.companyName,
      { key: "position", label: "Position", sampleValue: "Senior Designer", required: true, source: "SYSTEM", dataType: "STRING" },
    ],
    defaultLayout: layout([
      heading("Application received"),
      text("Hi {{recipientName}}, thanks for applying for the {{position}} role at {{companyName}}. Our team will review it shortly."),
      spacer(),
      footer("{{companyName}} Talent Team"),
    ]),
  },
  {
    key: "INTERVIEW_INVITE",
    category: "RECRUITMENT",
    name: "Interview invitation",
    description: "Sent to schedule or confirm an interview.",
    isMarketing: false,
    defaultSubject: "Interview invitation — {{position}} at {{companyName}}",
    variables: [
      V.recipientName,
      V.companyName,
      { key: "position", label: "Position", sampleValue: "Senior Designer", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "interviewDate", label: "Interview date", sampleValue: "Jun 20, 2026 · 2:00 PM", required: true, source: "SYSTEM", dataType: "DATE" },
      { key: "meetingUrl", label: "Meeting link", sampleValue: "https://meet.workos.dev/abc", required: false, source: "SYSTEM", dataType: "URL" },
    ],
    defaultLayout: layout([
      heading("You're invited to interview"),
      text("Hi {{recipientName}}, we'd love to talk to you about the {{position}} role. Your interview is scheduled for {{interviewDate}}."),
      button("Join meeting", "{{meetingUrl}}"),
      spacer(),
      footer("{{companyName}} Talent Team"),
    ]),
  },
  {
    key: "INTERVIEW_RESULT",
    category: "RECRUITMENT",
    name: "Interview result",
    description: "Pass / reject outcome after an interview.",
    isMarketing: false,
    defaultSubject: "Update on your application for {{position}}",
    variables: [
      V.recipientName,
      V.companyName,
      { key: "position", label: "Position", sampleValue: "Senior Designer", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "outcome", label: "Outcome", sampleValue: "moved to the next round", required: true, source: "SYSTEM", dataType: "STRING" },
    ],
    defaultLayout: layout([
      heading("Application update"),
      text("Hi {{recipientName}}, thank you for interviewing for the {{position}} role. We're pleased to let you know you've {{outcome}}."),
      spacer(),
      footer("{{companyName}} Talent Team"),
    ]),
  },
  {
    key: "APPLICATION_REJECTED",
    category: "RECRUITMENT",
    name: "Application rejected",
    description: "Polite decline sent when a candidate is not moving forward.",
    isMarketing: false,
    defaultSubject: "Update on your application for {{position}}",
    variables: [
      V.recipientName,
      V.companyName,
      { key: "position", label: "Position", sampleValue: "Senior Designer", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "stage", label: "Stage reached", sampleValue: "interview", required: false, source: "SYSTEM", dataType: "STRING" },
    ],
    defaultLayout: layout([
      heading("Thank you for applying"),
      text("Hi {{recipientName}}, thank you for your interest in the {{position}} role at {{companyName}} and for the time you invested in the {{stage}} stage."),
      text("After careful consideration, we've decided not to move forward with your application at this time. This was a difficult decision — we encourage you to apply for future openings that match your experience."),
      text("We wish you all the best in your job search."),
      spacer(),
      divider(),
      footer("{{companyName}} Talent Team"),
    ]),
  },
  {
    key: "OFFER_EXTENDED",
    category: "RECRUITMENT",
    name: "Offer extended",
    description: "Job offer with a link to review and sign the contract.",
    isMarketing: false,
    defaultSubject: "Your offer from {{companyName}}",
    variables: [
      V.recipientName,
      V.companyName,
      { key: "position", label: "Position", sampleValue: "Senior Designer", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "offerUrl", label: "Offer link", sampleValue: "https://app.workos.dev/offer/123", required: true, source: "SYSTEM", dataType: "URL" },
    ],
    defaultLayout: layout([
      heading("Congratulations 🎉"),
      text("Hi {{recipientName}}, we're excited to offer you the {{position}} role at {{companyName}}. Review and sign your offer below."),
      button("Review offer", "{{offerUrl}}"),
      spacer(),
      footer("{{companyName}}"),
    ]),
  },
  {
    key: "LEAVE_STATUS",
    category: "HR",
    name: "Leave request update",
    description: "Approved / rejected notification for a leave request.",
    isMarketing: false,
    defaultSubject: "Your leave request was {{status}}",
    variables: [
      V.recipientName,
      { key: "leaveType", label: "Leave type", sampleValue: "Vacation", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "status", label: "Status", sampleValue: "approved", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "dateRange", label: "Date range", sampleValue: "Jun 23 – Jun 27", required: true, source: "SYSTEM", dataType: "STRING" },
    ],
    defaultLayout: layout([
      heading("Leave request {{status}}"),
      text("Hi {{recipientName}}, your {{leaveType}} request for {{dateRange}} has been {{status}}."),
      spacer(),
      footer("HR Team"),
    ]),
  },
  {
    key: "REQUEST_STATUS",
    category: "HR",
    name: "Request update (generic)",
    description: "Overtime, change-time, business-trip, expense and similar request updates.",
    isMarketing: false,
    defaultSubject: "Your {{requestType}} request was {{status}}",
    variables: [
      V.recipientName,
      { key: "requestType", label: "Request type", sampleValue: "Overtime", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "status", label: "Status", sampleValue: "approved", required: true, source: "SYSTEM", dataType: "STRING" },
    ],
    defaultLayout: layout([
      heading("Request {{status}}"),
      text("Hi {{recipientName}}, your {{requestType}} request has been {{status}}."),
      spacer(),
      footer("HR Team"),
    ]),
  },
  {
    key: "COE_READY",
    category: "HR",
    name: "Certificate of Employment ready",
    description: "Sent when a requested COE document is ready to download.",
    isMarketing: false,
    defaultSubject: "Your Certificate of Employment is ready",
    variables: [
      V.recipientName,
      { key: "downloadUrl", label: "Download link", sampleValue: "https://app.workos.dev/coe/123", required: true, source: "SYSTEM", dataType: "URL" },
    ],
    defaultLayout: layout([
      heading("Your COE is ready"),
      text("Hi {{recipientName}}, your Certificate of Employment is ready to download."),
      button("Download document", "{{downloadUrl}}"),
      spacer(),
      footer("HR Team"),
    ]),
  },
  {
    key: "PAYSLIP_AVAILABLE",
    category: "PAYROLL",
    name: "Payslip available",
    description: "Sent when a payslip is released for a pay period.",
    isMarketing: false,
    defaultSubject: "Your payslip for {{payPeriod}} is ready",
    variables: [
      V.recipientName,
      { key: "payPeriod", label: "Pay period", sampleValue: "June 1–15, 2026", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "netPay", label: "Net pay", sampleValue: "₱24,500.00", required: false, source: "SYSTEM", dataType: "STRING" },
      { key: "payslipUrl", label: "Payslip link", sampleValue: "https://app.workos.dev/payslip/123", required: true, source: "SYSTEM", dataType: "URL" },
    ],
    defaultLayout: layout([
      heading("Payslip ready"),
      text("Hi {{recipientName}}, your payslip for {{payPeriod}} is now available. Net pay: {{netPay}}."),
      button("View payslip", "{{payslipUrl}}"),
      spacer(),
      footer("Payroll Team"),
    ]),
  },
  {
    key: "INVOICE_NOTICE",
    category: "PAYROLL",
    name: "Invoice / billing notice",
    description: "Subscription or billing notice to company admins.",
    isMarketing: false,
    defaultSubject: "Invoice {{invoiceNumber}} from {{companyName}}",
    variables: [
      V.companyName,
      { key: "invoiceNumber", label: "Invoice number", sampleValue: "INV-2026-0612", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "amountDue", label: "Amount due", sampleValue: "₱4,999.00", required: true, source: "SYSTEM", dataType: "STRING" },
      { key: "dueDate", label: "Due date", sampleValue: "Jun 30, 2026", required: true, source: "SYSTEM", dataType: "DATE" },
      { key: "invoiceUrl", label: "Invoice link", sampleValue: "https://app.workos.dev/invoice/123", required: false, source: "SYSTEM", dataType: "URL" },
    ],
    defaultLayout: layout([
      heading("Invoice {{invoiceNumber}}"),
      text("Amount due: {{amountDue}}, payable by {{dueDate}}."),
      button("View invoice", "{{invoiceUrl}}"),
      spacer(),
      footer("{{companyName}} Billing"),
    ]),
  },
  {
    key: "MARKETING_ANNOUNCEMENT",
    category: "MARKETING",
    name: "Announcement / newsletter",
    description: "Broadcast email for announcements, product news and promotions.",
    isMarketing: true,
    defaultSubject: "{{headline}}",
    variables: [
      { key: "firstName", label: "First name", sampleValue: "Maria", required: false, source: "USER", dataType: "STRING" },
      { key: "headline", label: "Headline", sampleValue: "Big news from Acme", required: true, source: "USER", dataType: "STRING" },
      { key: "ctaUrl", label: "CTA link", sampleValue: "https://acme.com/news", required: false, source: "USER", dataType: "URL" },
      { key: "unsubscribeUrl", label: "Unsubscribe link", sampleValue: "https://acme.com/unsub", required: true, source: "SYSTEM", dataType: "URL" },
    ],
    defaultLayout: layout([
      heading("{{headline}}"),
      text("Hi {{firstName}}, here's the latest from us."),
      button("Read more", "{{ctaUrl}}"),
      spacer(),
      divider(),
      footer("You're receiving this because you subscribed. Unsubscribe: {{unsubscribeUrl}}"),
    ]),
  },
]

// ── Company override store (localStorage-backed) ─────────────────────────────

const STORE_KEY = "wos.emailConfigs.v1"

type ConfigStore = Record<string, Record<string, CompanyEmailConfig>> // slug -> key -> config

function readStore(): ConfigStore {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
  } catch {
    return {}
  }
}
function writeStore(store: ConfigStore) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

function defaultConfig(key: string): CompanyEmailConfig {
  return { templateKey: key, enabled: true, subject: null, layout: null, updatedAt: null }
}

export function getTemplate(key: string): EmailTemplate | undefined {
  return SYSTEM_TEMPLATES.find((t) => t.key === key)
}

function resolve(slug: string, t: EmailTemplate): ResolvedTemplate {
  const config = readStore()[slug]?.[t.key] ?? defaultConfig(t.key)
  return {
    template: t,
    config,
    customized: config.layout !== null || config.subject !== null,
  }
}

// Mock async API — mirrors what the future axios client will expose.
export const emailTemplateApi = {
  async list(slug: string): Promise<ResolvedTemplate[]> {
    return SYSTEM_TEMPLATES.map((t) => resolve(slug, t))
  },
  async get(slug: string, key: string): Promise<ResolvedTemplate | undefined> {
    const t = getTemplate(key)
    return t ? resolve(slug, t) : undefined
  },
  async saveConfig(slug: string, config: CompanyEmailConfig): Promise<CompanyEmailConfig> {
    const store = readStore()
    store[slug] = store[slug] ?? {}
    const next = { ...config, updatedAt: new Date().toISOString() }
    store[slug][config.templateKey] = next
    writeStore(store)
    return next
  },
  async setEnabled(slug: string, key: string, enabled: boolean): Promise<void> {
    const store = readStore()
    store[slug] = store[slug] ?? {}
    const current = store[slug][key] ?? defaultConfig(key)
    store[slug][key] = { ...current, enabled }
    writeStore(store)
  },
  async resetToDefault(slug: string, key: string): Promise<void> {
    const store = readStore()
    if (store[slug]?.[key]) {
      store[slug][key] = { ...store[slug][key], subject: null, layout: null, updatedAt: null }
      writeStore(store)
    }
  },
}
