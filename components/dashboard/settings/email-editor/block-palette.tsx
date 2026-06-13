"use client"

import { useDraggable } from "@dnd-kit/core"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Heading01Icon,
  TextIcon,
  CursorMagicSelection02Icon,
  ImageIcon,
  MinusSignIcon,
  DistributeVerticalCenterIcon,
  LayoutTwoColumnIcon,
  Share08Icon,
  ParagraphIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { BlockType } from "@/lib/email-template-types"
import { useEditorStore } from "./editor-store"

const PALETTE: { type: BlockType; label: string; icon: IconSvgElement }[] = [
  { type: "heading", label: "Heading", icon: Heading01Icon },
  { type: "text", label: "Text", icon: TextIcon },
  { type: "button", label: "Button", icon: CursorMagicSelection02Icon },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "divider", label: "Divider", icon: MinusSignIcon },
  { type: "spacer", label: "Spacer", icon: DistributeVerticalCenterIcon },
  { type: "columns", label: "Columns", icon: LayoutTwoColumnIcon },
  { type: "social", label: "Social", icon: Share08Icon },
  { type: "footer", label: "Footer", icon: ParagraphIcon },
]

function PaletteItem({
  type,
  label,
  icon,
}: {
  type: BlockType
  label: string
  icon: IconSvgElement
}) {
  const addBlock = useEditorStore((s) => s.addBlock)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { palette: true, blockType: type },
  })

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => addBlock(type)}
      className={cn(
        "flex cursor-grab flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      title={`Add ${label} — click or drag onto the canvas`}
    >
      <HugeiconsIcon icon={icon} size={18} strokeWidth={1.7} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}

export function BlockPalette() {
  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[12px] font-semibold">Blocks</p>
        <p className="text-[11px] text-muted-foreground">Click or drag to add</p>
      </div>
      <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3">
        {PALETTE.map((p) => (
          <PaletteItem key={p.type} {...p} />
        ))}
      </div>
    </div>
  )
}
