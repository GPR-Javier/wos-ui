"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  FloppyDiskIcon,
  RefreshIcon,
  ViewIcon,
  PencilEdit02Icon,
  SentIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useSlug, useSlugHref } from "@/lib/slug"
import { templateApi } from "@/lib/template-api"
import type { BlockType } from "@/lib/template-types"
import { useEditorStore } from "./editor-store"
import { BlockPalette } from "./block-palette"
import { Canvas } from "./canvas"
import { BlockInspector } from "./block-inspector"
import { VariablePanel } from "./variable-panel"

/**
 * One editor for all three template kinds. `backTab` is the Communications tab that opened it, so
 * "back" returns where the user came from rather than always to the email list.
 */
export function TemplateEditor({
  templateKey,
  backTab,
}: {
  templateKey: string
  backTab: string
}) {
  const slug = useSlug()
  const slugHref = useSlugHref()
  const [notFound, setNotFound] = useState(false)

  const resolved = useEditorStore((s) => s.resolved)
  const subject = useEditorStore((s) => s.subject)
  const preview = useEditorStore((s) => s.preview)
  const dirty = useEditorStore((s) => s.dirty)
  const load = useEditorStore((s) => s.load)
  const setSubject = useEditorStore((s) => s.setSubject)
  const setPreview = useEditorStore((s) => s.setPreview)
  const addBlock = useEditorStore((s) => s.addBlock)
  const moveBlock = useEditorStore((s) => s.moveBlock)
  const markSaved = useEditorStore((s) => s.markSaved)

  const ready = resolved?.template.key === templateKey

  useEffect(() => {
    templateApi.get(templateKey).then((r) => {
      if (r) load(r)
      else setNotFound(true)
    })
  }, [slug, templateKey, load])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    const layout = useEditorStore.getState().layout
    if (!layout) return
    const activeKey = String(active.id)

    // Adding a new block dragged from the palette.
    if (activeKey.startsWith("palette:")) {
      const type = active.data.current?.blockType as BlockType
      const overIndex = over
        ? layout.blocks.findIndex((b) => b.id === over.id)
        : -1
      addBlock(type, overIndex >= 0 ? overIndex : undefined)
      return
    }

    // Reordering existing blocks.
    if (over && active.id !== over.id) {
      const from = layout.blocks.findIndex((b) => b.id === active.id)
      const to = layout.blocks.findIndex((b) => b.id === over.id)
      if (from >= 0 && to >= 0) moveBlock(from, to)
    }
  }

  const onSave = async () => {
    const state = useEditorStore.getState()
    if (!state.resolved || !state.layout) return
    const template = state.resolved.template
    await templateApi.saveConfig({
      templateKey,
      enabled: state.resolved.config.enabled,
      // Null when unchanged, so the template keeps inheriting later default revisions. Non-email
      // kinds have no subject to send at all.
      subject:
        template.kind !== "EMAIL" || subject === template.defaultSubject
          ? null
          : subject,
      layout: structuredClone(state.layout),
      updatedAt: null,
    })
    markSaved()
    toast.success("Template saved", {
      description: "Your customization is live for this company.",
    })
  }

  const onReset = async () => {
    const fresh = await templateApi.resetToDefault(templateKey)
    load(fresh)
    toast.success("Reset to system default")
  }

  const onSendTest = () => {
    toast.success("Test email queued (mock)", {
      description:
        "When wos-notification is wired up, this sends a live preview to you.",
    })
  }

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-[14px]">Template “{templateKey}” not found.</p>
        <Link
          href={slugHref(`/dashboard/config?tab=${backTab}`)}
          className="text-[13px] text-primary hover:underline"
        >
          Back to templates
        </Link>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
        Loading…
      </div>
    )
  }

  const vars = resolved.template.variables
  const kind = resolved.template.kind
  // A subject line and a test send only mean something for an email; a document and a payslip are
  // rendered into a page and a PDF respectively.
  const isEmail = kind === "EMAIL"

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <Link
          href={slugHref(`/dashboard/config?tab=${backTab}`)}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Back to templates"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.8} />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">
            {resolved.template.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {resolved.template.key}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Edit / Preview toggle */}
          <div className="flex rounded-md border border-border p-0.5">
            {[
              { v: false, label: "Edit", icon: PencilEdit02Icon },
              { v: true, label: "Preview", icon: ViewIcon },
            ].map((o) => (
              <button
                key={o.label}
                onClick={() => setPreview(o.v)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium",
                  preview === o.v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <HugeiconsIcon icon={o.icon} size={13} strokeWidth={1.8} />
                {o.label}
              </button>
            ))}
          </div>

          {isEmail && (
            <button
              onClick={onSendTest}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={SentIcon} size={13} strokeWidth={1.8} />
              Send test
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={RefreshIcon} size={13} strokeWidth={1.8} />
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={!dirty}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <HugeiconsIcon icon={FloppyDiskIcon} size={13} strokeWidth={1.8} />
            {dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      {/* Subject line — emails only */}
      {isEmail && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            Subject
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject — use {{variables}}"
            className="h-7 flex-1 rounded-md border border-transparent bg-transparent px-1 text-[13px] outline-none focus:border-border focus:bg-background"
          />
        </div>
      )}

      {/* Body: palette | canvas | inspector+variables */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex min-h-0 flex-1">
          {!preview && <BlockPalette kind={kind} />}
          <Canvas />
          {!preview && (
            <div className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-background p-4">
              <BlockInspector />
              <div className="border-t border-border pt-4">
                <VariablePanel vars={vars} />
              </div>
            </div>
          )}
        </div>
      </DndContext>
    </div>
  )
}
