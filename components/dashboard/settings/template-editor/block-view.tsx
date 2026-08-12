"use client"

import { Fragment } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ImageIcon,
  NewTwitterIcon,
  Linkedin01Icon,
  Facebook01Icon,
  InstagramIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { EmailBlock, TemplateVariable } from "@/lib/template-types"
import {
  SAMPLE_FIGURES,
  type FigureRow,
  type FigureSection,
  type PayslipFigures,
} from "@/lib/payslip-figures"

const VAR_RE = /\{\{\s*([\w]+)\s*\}\}/g
/** Non-global twin of VAR_RE — a global regex carries lastIndex state and misfires on reuse. */
const VAR_RE_ONCE = /\{\{\s*([\w]+)\s*\}\}/

/**
 * Replace `{{key}}` tokens. `values` (real data, when rendering an actual payslip) wins over each
 * variable's sampleValue; an empty real value still counts, so a blank field renders blank rather
 * than falling back to fake sample text.
 */
export function interpolate(
  text: string,
  vars: TemplateVariable[],
  values?: Record<string, string>
): string {
  const map = new Map(vars.map((v) => [v.key, v.sampleValue]))
  return text.replace(VAR_RE, (_, key) =>
    values && key in values ? values[key] : (map.get(key) ?? `{{${key}}}`)
  )
}

/** Render text either with resolved values (preview) or with highlighted token chips (edit). */
function renderText(
  text: string,
  vars: TemplateVariable[],
  preview: boolean,
  values?: Record<string, string>
) {
  if (preview) return interpolate(text, vars, values)
  const map = new Map(vars.map((v) => [v.key, v]))
  const out: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  VAR_RE.lastIndex = 0
  while ((m = VAR_RE.exec(text))) {
    if (m.index > last)
      out.push(<Fragment key={last}>{text.slice(last, m.index)}</Fragment>)
    const known = map.has(m[1])
    out.push(
      <span
        key={m.index}
        className={cn(
          "rounded px-1 py-0.5 text-[0.9em] font-medium",
          known
            ? "bg-primary/10 text-primary"
            : "bg-destructive/10 text-destructive ring-1 ring-destructive/30"
        )}
        title={known ? `Variable: ${m[1]}` : `Unknown variable: ${m[1]}`}
      >
        {`{{${m[1]}}}`}
      </span>
    )
    last = m.index + m[0].length
  }
  if (last < text.length)
    out.push(<Fragment key={last}>{text.slice(last)}</Fragment>)
  return out
}

/**
 * True when a line has nothing left to say once its variables are filled in — either empty, or only
 * the separators that were meant to join values (e.g. "· " when both email and phone are unset).
 * Such a block is skipped rather than printing a blank line or a stray bullet on the document.
 */
function isBlankAfterFill(text: string): boolean {
  return /^[\s·•|,;:/–—-]*$/.test(text)
}

const SOCIAL_ICON: Record<string, typeof NewTwitterIcon> = {
  twitter: NewTwitterIcon,
  linkedin: Linkedin01Icon,
  facebook: Facebook01Icon,
  instagram: InstagramIcon,
}

function AmountRows({ rows }: { rows: FigureRow[] }) {
  return (
    <>
      {rows.map(({ label, amount }) => (
        <tr key={label}>
          <td className="py-1">{label}</td>
          <td className="py-1 text-right tabular-nums">{amount}</td>
        </tr>
      ))}
    </>
  )
}

/** Label/amount rows under a section heading, with an optional bold total. */
function FigureTable({
  heading,
  section,
  totalLabel,
  style,
}: {
  heading: string
  section: FigureSection
  totalLabel?: string
  style: React.CSSProperties
}) {
  return (
    <div style={style}>
      <p className="mb-1.5 text-[11px] font-bold tracking-wider uppercase opacity-60">
        {heading}
      </p>
      <table className="w-full border-collapse">
        <tbody>
          {section.rows && <AmountRows rows={section.rows} />}
          {section.groups?.map((group) => (
            <Fragment key={group.label}>
              <tr>
                <td
                  colSpan={2}
                  className="pt-2 pb-0.5 text-[0.85em] opacity-50"
                >
                  {group.label}
                </td>
              </tr>
              <AmountRows rows={group.rows} />
            </Fragment>
          ))}
          {section.total !== undefined && (
            <tr className="border-t border-current/15 font-semibold">
              <td className="pt-1.5">{totalLabel}</td>
              <td className="pt-1.5 text-right tabular-nums">
                {section.total}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function BlockView({
  block,
  vars,
  preview,
  figures = SAMPLE_FIGURES,
}: {
  block: EmailBlock
  vars: TemplateVariable[]
  preview: boolean
  /**
   * Figures for the structural payslip blocks. Defaults to samples so the template editor works
   * unchanged; the live payroll preview passes real ones. Both go through this same renderer, so
   * what an admin arranges is what an employee receives.
   */
  figures?: PayslipFigures
}) {
  const s = block.style
  const pad = {
    paddingTop: s.paddingY,
    paddingBottom: s.paddingY,
    paddingLeft: s.paddingX,
    paddingRight: s.paddingX,
  }
  const align = (s.align ?? "left") as React.CSSProperties["textAlign"]

  // Only when rendering a real document — in the editor an empty block must stay visible and
  // selectable, otherwise a company couldn't click it to edit it.
  if (
    preview &&
    (block.type === "heading" ||
      block.type === "text" ||
      block.type === "footer") &&
    isBlankAfterFill(
      interpolate(block.content.text ?? "", vars, figures.values)
    )
  ) {
    return null
  }

  switch (block.type) {
    case "heading":
      return (
        <div style={{ ...pad, textAlign: align }}>
          <span
            style={{
              fontSize: s.fontSize,
              fontWeight: s.bold ? 700 : 500,
              color: s.color,
            }}
          >
            {renderText(
              block.content.text ?? "",
              vars,
              preview,
              figures.values
            )}
          </span>
        </div>
      )
    case "text":
    case "footer":
      return (
        <div style={{ ...pad, textAlign: align }}>
          <span
            style={{ fontSize: s.fontSize, color: s.color, lineHeight: 1.6 }}
          >
            {renderText(
              block.content.text ?? "",
              vars,
              preview,
              figures.values
            )}
          </span>
        </div>
      )
    case "button":
      return (
        <div style={{ ...pad, textAlign: align }}>
          <span
            className="inline-block font-medium"
            style={{
              background: s.background,
              color: s.color,
              borderRadius: s.radius,
              padding: `${s.paddingY ?? 12}px ${s.paddingX ?? 20}px`,
              fontSize: s.fontSize ?? 14,
            }}
          >
            {renderText(
              block.content.text ?? "Button",
              vars,
              preview,
              figures.values
            )}
          </span>
        </div>
      )
    case "image": {
      // Sources are interpolated too, so a block can point at `{{companyLogo}}` and resolve to the
      // company's uploaded image at render time instead of a hardcoded URL.
      const rawSrc = block.content.src ?? ""
      const token = rawSrc.match(VAR_RE_ONCE)?.[1]
      // In edit mode a token is not a URL — handing "{{companyLogo}}" to <img> just renders the
      // browser's broken-image glyph. Show the placeholder and name what it will resolve to.
      const src = preview
        ? interpolate(rawSrc, vars, figures.values)
        : token
          ? ""
          : rawSrc
      // On a real document an unresolved image is nothing, not a dashed placeholder — a company
      // with no logo uploaded should get a payslip without one, not with an empty box on it.
      if (preview && !src) return null
      return (
        <div style={{ ...pad, textAlign: align }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={block.content.alt ?? ""}
              style={{
                width: `${s.width ?? 100}%`,
                borderRadius: s.radius,
                display: "inline-block",
              }}
            />
          ) : (
            <div
              className="inline-flex h-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground"
              style={{ width: `${s.width ?? 100}%`, borderRadius: s.radius }}
            >
              <HugeiconsIcon icon={ImageIcon} size={22} strokeWidth={1.6} />
              {token && (
                <span className="px-2 text-center text-[10px] leading-tight">
                  {`{{${token}}}`}
                </span>
              )}
            </div>
          )}
        </div>
      )
    }
    case "divider":
      return (
        <div style={pad}>
          <hr
            style={{
              border: 0,
              borderTop: `1px solid ${s.color ?? "#e2e8f0"}`,
            }}
          />
        </div>
      )
    case "spacer":
      return <div style={{ height: s.height ?? 24 }} />
    case "social":
      return (
        <div
          style={{ ...pad, textAlign: align }}
          className="flex justify-center gap-3"
        >
          {(block.content.socials ?? []).map((soc, i) => (
            <span
              key={i}
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <HugeiconsIcon
                icon={SOCIAL_ICON[soc.network] ?? NewTwitterIcon}
                size={16}
                strokeWidth={1.8}
              />
            </span>
          ))}
        </div>
      )
    case "columns":
      return (
        <div style={pad} className="flex gap-3">
          {(block.content.columns ?? [[], []]).map((col, ci) => (
            <div
              key={ci}
              className="flex-1 rounded-lg border border-dashed border-border p-3"
            >
              {col.length === 0 ? (
                <p className="text-center text-[11px] text-muted-foreground">
                  Column {ci + 1}
                </p>
              ) : (
                col.map((b) => (
                  <BlockView
                    key={b.id}
                    block={b}
                    vars={vars}
                    preview={preview}
                    figures={figures}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      )

    // ── Payslip structural blocks ────────────────────────────────────────────
    case "payslipHeader":
      return (
        <div style={{ ...pad, fontSize: s.fontSize, color: s.color }}>
          <table className="w-full border-collapse">
            <tbody>
              {figures.header.map((row) => (
                <tr key={row.label}>
                  <td className="w-32 py-0.5 opacity-60">{row.label}</td>
                  <td className="py-0.5 font-medium">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case "compensation":
      return (
        <FigureTable
          heading="Compensation"
          section={figures.compensation}
          style={{ ...pad, fontSize: s.fontSize, color: s.color }}
        />
      )
    // A section with nothing in it is omitted rather than printed as a row of zeros — that's how
    // payslips read, and it's what makes the layout adapt to each employee.
    case "overtimeTable":
      return figures.overtime.empty ? null : (
        <FigureTable
          heading="Overtime"
          section={figures.overtime}
          totalLabel="Total overtime"
          style={{ ...pad, fontSize: s.fontSize, color: s.color }}
        />
      )
    case "allowancesTable":
      return figures.allowances.empty ? null : (
        <FigureTable
          heading="Allowances"
          section={figures.allowances}
          totalLabel="Total allowances"
          style={{ ...pad, fontSize: s.fontSize, color: s.color }}
        />
      )
    case "grossPay":
      return (
        <FigureTable
          heading="Gross pay"
          section={{ total: figures.grossPay }}
          totalLabel="Gross pay"
          style={{ ...pad, fontSize: s.fontSize, color: s.color }}
        />
      )
    case "deductionsTable":
      return figures.deductions.empty ? null : (
        <FigureTable
          heading="Deductions"
          section={figures.deductions}
          totalLabel="Total deductions"
          style={{ ...pad, fontSize: s.fontSize, color: s.color }}
        />
      )
    case "netPay":
      return (
        <div style={{ ...pad, textAlign: align }}>
          <div
            className="inline-flex items-baseline gap-3"
            style={{
              background: s.background,
              borderRadius: s.radius,
              padding: `${s.paddingY ?? 12}px ${s.paddingX ?? 14}px`,
            }}
          >
            <span
              className="text-[11px] font-bold tracking-wider uppercase opacity-60"
              style={{ color: s.color }}
            >
              Net pay
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: s.fontSize,
                fontWeight: s.bold ? 700 : 500,
                color: s.color,
              }}
            >
              {figures.netPay}
            </span>
          </div>
        </div>
      )
  }
}
