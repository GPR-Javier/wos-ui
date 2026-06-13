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
import type { EmailBlock, TemplateVariable } from "@/lib/email-template-types"

const VAR_RE = /\{\{\s*([\w]+)\s*\}\}/g

/** Replace `{{key}}` tokens with each variable's sample value (used in preview). */
export function interpolate(text: string, vars: TemplateVariable[]): string {
  const map = new Map(vars.map((v) => [v.key, v.sampleValue]))
  return text.replace(VAR_RE, (_, key) => map.get(key) ?? `{{${key}}}`)
}

/** Render text either with sample values (preview) or with highlighted token chips (edit). */
function renderText(text: string, vars: TemplateVariable[], preview: boolean) {
  if (preview) return interpolate(text, vars)
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

const SOCIAL_ICON: Record<string, typeof NewTwitterIcon> = {
  twitter: NewTwitterIcon,
  linkedin: Linkedin01Icon,
  facebook: Facebook01Icon,
  instagram: InstagramIcon,
}

export function BlockView({
  block,
  vars,
  preview,
}: {
  block: EmailBlock
  vars: TemplateVariable[]
  preview: boolean
}) {
  const s = block.style
  const pad = {
    paddingTop: s.paddingY,
    paddingBottom: s.paddingY,
    paddingLeft: s.paddingX,
    paddingRight: s.paddingX,
  }
  const align = (s.align ?? "left") as React.CSSProperties["textAlign"]

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
            {renderText(block.content.text ?? "", vars, preview)}
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
            {renderText(block.content.text ?? "", vars, preview)}
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
            {renderText(block.content.text ?? "Button", vars, preview)}
          </span>
        </div>
      )
    case "image":
      return (
        <div style={{ ...pad, textAlign: align }}>
          {block.content.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.content.src}
              alt={block.content.alt ?? ""}
              style={{
                width: `${s.width ?? 100}%`,
                borderRadius: s.radius,
                display: "inline-block",
              }}
            />
          ) : (
            <div
              className="inline-flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground"
              style={{ width: `${s.width ?? 100}%`, borderRadius: s.radius }}
            >
              <HugeiconsIcon icon={ImageIcon} size={22} strokeWidth={1.6} />
            </div>
          )}
        </div>
      )
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
                  />
                ))
              )}
            </div>
          ))}
        </div>
      )
  }
}
