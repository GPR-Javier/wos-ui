// Types for the template system, served by the `wos-notification` service. System templates are
// seeded from JSON resources and declare a variable contract; each company may override the
// layout/subject (the drag-and-drop customization).

// What a template renders into. One editor serves all three — only the palette and the presence
// of a subject line differ.
export type TemplateKind = "EMAIL" | "DOCUMENT" | "PAYSLIP"

export type EmailCategory =
  | "AUTH"
  | "RECRUITMENT"
  | "HR"
  | "PAYROLL"
  | "MARKETING"
  | "LEGAL"

export const CATEGORY_LABEL: Record<EmailCategory, string> = {
  AUTH: "Authentication",
  RECRUITMENT: "Recruitment",
  HR: "HR & Requests",
  PAYROLL: "Payroll & Finance",
  MARKETING: "Marketing",
  LEGAL: "Legal",
}

export const CATEGORY_ORDER: EmailCategory[] = [
  "AUTH",
  "RECRUITMENT",
  "HR",
  "PAYROLL",
  "MARKETING",
  "LEGAL",
]

// ── Variables ────────────────────────────────────────────────────────────────
// Placeholders rendered as `{{var_key}}` and merged server-side at send time.
// SYSTEM vars are injected by the backend trigger (e.g. otp); USER vars come from
// the recipient/merge data on a marketing blast.

export type VariableSource = "SYSTEM" | "USER"
export type VariableType = "STRING" | "DATE" | "URL" | "NUMBER"

export interface TemplateVariable {
  key: string // e.g. "recipientName"
  label: string // e.g. "Recipient name"
  description?: string
  sampleValue: string // used for live preview
  required: boolean
  source: VariableSource
  dataType: VariableType
}

// ── Blocks (the drag-and-drop building units) ────────────────────────────────

export type BlockType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "divider"
  | "spacer"
  | "columns"
  | "social"
  | "footer"
  // Payslip-only structural blocks. These render figures from the payroll record rather than
  // authored content, which is why they carry no editable `content` and are locked (see below).
  //
  // They deliberately mirror the section groups of Configure → Payroll → Payroll setup
  // (Position & Grade, Compensation, Overtime, Allowances, Deductions) so an admin meets the same
  // vocabulary in the screen that sets a figure and the one that prints it.
  | "payslipHeader" // Position & Grade
  | "compensation" // Compensation — basic pay for the period
  | "overtimeTable" // Overtime — itemised per overtime type
  | "allowancesTable" // Allowances
  | "grossPay" // basic + allowances + overtime
  | "deductionsTable" // Deductions — grouped Government / Loans / Other
  | "netPay"

/** Blocks a company may restyle and reorder but never delete, and never add more of. */
export const LOCKED_BLOCK_TYPES: BlockType[] = [
  "payslipHeader",
  "compensation",
  "overtimeTable",
  "allowancesTable",
  "grossPay",
  "deductionsTable",
  "netPay",
]

/** Which blocks each kind's palette offers. Locked blocks are never in a palette — they're seeded. */
export const PALETTE_BY_KIND: Record<TemplateKind, BlockType[]> = {
  EMAIL: [
    "heading",
    "text",
    "button",
    "image",
    "divider",
    "spacer",
    "columns",
    "social",
    "footer",
  ],
  // No buttons or social rows: a legal document is prose, and a CTA in terms of service is noise.
  DOCUMENT: ["heading", "text", "image", "divider", "spacer"],
  // Branding and footnotes around the fixed figure tables.
  PAYSLIP: ["heading", "text", "image", "divider", "spacer"],
}

export type TextAlign = "left" | "center" | "right"

export interface BlockStyle {
  align?: TextAlign
  color?: string // hex
  background?: string // hex
  fontSize?: number // px
  bold?: boolean
  paddingY?: number // px
  paddingX?: number // px
  radius?: number // px (button/image)
  height?: number // px (spacer)
  width?: number // % (image/button)
}

export interface EmailBlock {
  id: string
  type: BlockType
  /**
   * Structural block the company can move and restyle but not delete or duplicate. Set on the
   * seeded payslip blocks so a payslip can never ship without its earnings, deductions, or net pay.
   */
  locked?: boolean
  // Free-form content keyed by block type. Kept loose so blocks stay self-describing
  // and the renderer can switch on `type`.
  content: {
    text?: string // heading / text / footer / button label
    href?: string // button / social
    src?: string // image
    alt?: string // image
    columns?: EmailBlock[][] // columns: array of column block-lists
    socials?: { network: string; href: string }[]
  }
  style: BlockStyle
}

// The full canvas: an ordered list of blocks plus document-level styling.
export interface EmailLayout {
  blocks: EmailBlock[]
  background: string // hex — the email body background
  contentBackground: string // hex — the card/content background
  width: number // px — content width (typically 600)
}

// ── Templates ────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  key: string // stable contract key, e.g. "REGISTER_OTP"
  kind: TemplateKind
  category: EmailCategory
  name: string
  description: string
  isMarketing: boolean
  /** Null for DOCUMENT and PAYSLIP — neither has a subject line. */
  defaultSubject: string | null
  defaultLayout: EmailLayout
  variables: TemplateVariable[]
}

// Per-company override of a system template. `subject`/`layout` null = use system default.
export interface CompanyEmailConfig {
  templateKey: string
  enabled: boolean
  subject: string | null
  layout: EmailLayout | null
  updatedAt: string | null
}

// A template merged with its (optional) company override — what the UI actually edits.
export interface ResolvedTemplate {
  template: EmailTemplate
  config: CompanyEmailConfig
  customized: boolean // company has a non-null layout or subject override
}
