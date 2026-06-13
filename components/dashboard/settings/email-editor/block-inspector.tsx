"use client"

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  PaintBoardIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { BlockStyle, EmailBlock, TextAlign } from "@/lib/email-template-types"
import { useEditorStore } from "./editor-store"

// ── Compact field primitives ─────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full rounded-md border border-border bg-background px-2 text-[12px] outline-none focus:border-primary/50"
    />
  )
}

function NumberField({
  value,
  onChange,
  min = 0,
  max = 100,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-14 rounded-md border border-border bg-background px-2 text-[12px] outline-none focus:border-primary/50"
      />
      {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
    </div>
  )
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded-md border border-border bg-background p-0.5"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-18 rounded-md border border-border bg-background px-2 text-[11px] uppercase outline-none focus:border-primary/50"
      />
    </div>
  )
}

const ALIGN_OPTS: { value: TextAlign; icon: IconSvgElement }[] = [
  { value: "left", icon: TextAlignLeftIcon },
  { value: "center", icon: TextAlignCenterIcon },
  { value: "right", icon: TextAlignRightIcon },
]

function AlignField({ value, onChange }: { value: TextAlign; onChange: (v: TextAlign) => void }) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {ALIGN_OPTS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex size-6 items-center justify-center rounded",
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <HugeiconsIcon icon={o.icon} size={13} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Inspector ────────────────────────────────────────────────────────────────

function DocSettings() {
  const layout = useEditorStore((s) => s.layout)
  const setDoc = useEditorStore((s) => s.setDoc)
  if (!layout) return null
  return (
    <Section title="Email settings">
      <Field label="Body background">
        <ColorField value={layout.background} onChange={(v) => setDoc({ background: v })} />
      </Field>
      <Field label="Content background">
        <ColorField value={layout.contentBackground} onChange={(v) => setDoc({ contentBackground: v })} />
      </Field>
      <Field label="Content width">
        <NumberField value={layout.width} min={320} max={800} suffix="px" onChange={(v) => setDoc({ width: v })} />
      </Field>
    </Section>
  )
}

function StyleControls({ block }: { block: EmailBlock }) {
  const updateStyle = useEditorStore((s) => s.updateStyle)
  const set = (patch: Partial<BlockStyle>) => updateStyle(block.id, patch)
  const s = block.style
  const hasText = ["heading", "text", "button", "footer"].includes(block.type)

  return (
    <Section title="Style">
      {block.type !== "divider" && block.type !== "spacer" && (
        <Field label="Align">
          <AlignField value={(s.align ?? "left") as TextAlign} onChange={(v) => set({ align: v })} />
        </Field>
      )}
      {hasText && (
        <>
          <Field label="Font size">
            <NumberField value={s.fontSize ?? 14} min={10} max={48} suffix="px" onChange={(v) => set({ fontSize: v })} />
          </Field>
          <Field label="Text color">
            <ColorField value={s.color ?? "#334155"} onChange={(v) => set({ color: v })} />
          </Field>
        </>
      )}
      {block.type === "button" && (
        <>
          <Field label="Background">
            <ColorField value={s.background ?? "#4f46e5"} onChange={(v) => set({ background: v })} />
          </Field>
          <Field label="Corner radius">
            <NumberField value={s.radius ?? 8} min={0} max={40} suffix="px" onChange={(v) => set({ radius: v })} />
          </Field>
        </>
      )}
      {block.type === "image" && (
        <>
          <Field label="Width">
            <NumberField value={s.width ?? 100} min={10} max={100} suffix="%" onChange={(v) => set({ width: v })} />
          </Field>
          <Field label="Corner radius">
            <NumberField value={s.radius ?? 0} min={0} max={40} suffix="px" onChange={(v) => set({ radius: v })} />
          </Field>
        </>
      )}
      {block.type === "divider" && (
        <Field label="Line color">
          <ColorField value={s.color ?? "#e2e8f0"} onChange={(v) => set({ color: v })} />
        </Field>
      )}
      {block.type === "spacer" ? (
        <Field label="Height">
          <NumberField value={s.height ?? 24} min={4} max={120} suffix="px" onChange={(v) => set({ height: v })} />
        </Field>
      ) : (
        <Field label="Vertical padding">
          <NumberField value={s.paddingY ?? 8} min={0} max={60} suffix="px" onChange={(v) => set({ paddingY: v })} />
        </Field>
      )}
    </Section>
  )
}

function ContentControls({ block }: { block: EmailBlock }) {
  const updateContent = useEditorStore((s) => s.updateContent)
  const set = (patch: Partial<EmailBlock["content"]>) => updateContent(block.id, patch)

  if (["heading", "text", "footer"].includes(block.type)) {
    return (
      <Section title="Content">
        <textarea
          value={block.content.text ?? ""}
          onChange={(e) => set({ text: e.target.value })}
          rows={block.type === "heading" ? 2 : 4}
          placeholder="Use {{variables}} to personalize"
          className="w-full resize-none rounded-md border border-border bg-background p-2 text-[12px] outline-none focus:border-primary/50"
        />
      </Section>
    )
  }
  if (block.type === "button") {
    return (
      <Section title="Content">
        <Field label="Label">
          <TextInput value={block.content.text ?? ""} onChange={(v) => set({ text: v })} />
        </Field>
        <Field label="Link">
          <TextInput value={block.content.href ?? ""} placeholder="https://" onChange={(v) => set({ href: v })} />
        </Field>
      </Section>
    )
  }
  if (block.type === "image") {
    return (
      <Section title="Content">
        <Field label="Image URL">
          <TextInput value={block.content.src ?? ""} placeholder="https://" onChange={(v) => set({ src: v })} />
        </Field>
        <Field label="Alt text">
          <TextInput value={block.content.alt ?? ""} onChange={(v) => set({ alt: v })} />
        </Field>
      </Section>
    )
  }
  return null
}

export function BlockInspector() {
  const layout = useEditorStore((s) => s.layout)
  const selectedId = useEditorStore((s) => s.selectedId)
  const block = layout?.blocks.find((b) => b.id === selectedId)

  if (!block) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <HugeiconsIcon icon={PaintBoardIcon} size={14} strokeWidth={1.8} />
          Select a block to edit it
        </div>
        <DocSettings />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-[12px] font-semibold capitalize">{block.type}</div>
      <ContentControls block={block} />
      <StyleControls block={block} />
    </div>
  )
}
