// Types for the email template system (frontend-only for now; the real backend will be the
// `wos-notification` service). System templates are seeded app-side and declare a variable
// contract; each company may override the layout/subject (the drag-and-drop customization).

export type EmailCategory =
  | "AUTH"
  | "RECRUITMENT"
  | "HR"
  | "PAYROLL"
  | "MARKETING"

export const CATEGORY_LABEL: Record<EmailCategory, string> = {
  AUTH: "Authentication",
  RECRUITMENT: "Recruitment",
  HR: "HR & Requests",
  PAYROLL: "Payroll & Finance",
  MARKETING: "Marketing",
}

export const CATEGORY_ORDER: EmailCategory[] = [
  "AUTH",
  "RECRUITMENT",
  "HR",
  "PAYROLL",
  "MARKETING",
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
  category: EmailCategory
  name: string
  description: string
  isMarketing: boolean
  defaultSubject: string
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
