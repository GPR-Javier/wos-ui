"use client"

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DragDropVerticalIcon,
  Copy01Icon,
  Delete02Icon,
  Mail01Icon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type {
  EmailBlock,
  TemplateKind,
  TemplateVariable,
} from "@/lib/template-types"
import { useEditorStore } from "./editor-store"
import { BlockView } from "./block-view"

function SortableBlock({
  block,
  vars,
  selected,
  onSelect,
}: {
  block: EmailBlock
  vars: TemplateVariable[]
  selected: boolean
  onSelect: () => void
}) {
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock)
  const removeBlock = useEditorStore((s) => s.removeBlock)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group/block relative", isDragging && "opacity-30")}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <div
        className={cn(
          "rounded-md ring-1 ring-transparent transition-shadow",
          selected ? "ring-2 ring-primary" : "group-hover/block:ring-border"
        )}
      >
        <BlockView block={block} vars={vars} preview={false} />
      </div>

      {/* Hover / selected controls */}
      <div
        className={cn(
          "absolute -top-3 right-2 flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5 shadow-sm transition-opacity",
          selected
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover/block:pointer-events-auto group-hover/block:opacity-100"
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <HugeiconsIcon
            icon={DragDropVerticalIcon}
            size={14}
            strokeWidth={1.8}
          />
        </button>
        {/* Locked blocks stay draggable and restylable — they just can't be removed or copied. */}
        {block.locked ? (
          <span
            className="flex size-6 items-center justify-center rounded text-muted-foreground/70"
            title="Required block — move or restyle it, but it can't be removed"
          >
            <HugeiconsIcon
              icon={SquareLock02Icon}
              size={13}
              strokeWidth={1.8}
            />
          </span>
        ) : (
          <>
            <button
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Duplicate"
              onClick={(e) => {
                e.stopPropagation()
                duplicateBlock(block.id)
              }}
            >
              <HugeiconsIcon icon={Copy01Icon} size={13} strokeWidth={1.8} />
            </button>
            <button
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation()
                removeBlock(block.id)
              }}
            >
              <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const EMPTY_HINT: Record<TemplateKind, string> = {
  EMAIL: "Drag blocks here to build your email",
  DOCUMENT: "Drag blocks here to write your document",
  PAYSLIP: "Drag blocks here to build your payslip",
}

export function Canvas() {
  const layout = useEditorStore((s) => s.layout)
  const selectedId = useEditorStore((s) => s.selectedId)
  const preview = useEditorStore((s) => s.preview)
  const select = useEditorStore((s) => s.select)
  const resolved = useEditorStore((s) => s.resolved)
  const vars = resolved?.template.variables ?? []

  if (!layout) return null

  return (
    <div
      className="flex-1 overflow-y-auto p-8"
      style={{ background: layout.background }}
      onClick={() => select(null)}
    >
      <div
        className="mx-auto rounded-xl shadow-sm"
        style={{
          maxWidth: layout.width,
          background: layout.contentBackground,
          padding: "24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {layout.blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-muted-foreground">
            <HugeiconsIcon icon={Mail01Icon} size={26} strokeWidth={1.5} />
            <p className="text-[13px]">
              {EMPTY_HINT[resolved?.template.kind ?? "EMAIL"]}
            </p>
          </div>
        ) : preview ? (
          layout.blocks.map((b) => (
            <BlockView key={b.id} block={b} vars={vars} preview />
          ))
        ) : (
          <SortableContext
            items={layout.blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {layout.blocks.map((b) => (
                <SortableBlock
                  key={b.id}
                  block={b}
                  vars={vars}
                  selected={selectedId === b.id}
                  onSelect={() => select(b.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}
