"use client"

import { create } from "zustand"
import { newId } from "@/lib/email-template-api"
import type {
  BlockStyle,
  BlockType,
  EmailBlock,
  EmailLayout,
  ResolvedTemplate,
} from "@/lib/email-template-types"

// A new block with sensible defaults, created when something is dropped from the palette.
export function createBlock(type: BlockType): EmailBlock {
  switch (type) {
    case "heading":
      return { id: newId(), type, content: { text: "New heading" }, style: { align: "left", fontSize: 22, bold: true, color: "#0f172a", paddingY: 8 } }
    case "text":
      return { id: newId(), type, content: { text: "Write something here. Use {{variables}} to personalize." }, style: { align: "left", fontSize: 14, color: "#334155", paddingY: 8 } }
    case "button":
      return { id: newId(), type, content: { text: "Click here", href: "https://" }, style: { align: "left", background: "#4f46e5", color: "#ffffff", radius: 8, paddingY: 12, paddingX: 20 } }
    case "image":
      return { id: newId(), type, content: { src: "", alt: "Image" }, style: { align: "center", width: 100, radius: 8, paddingY: 8 } }
    case "divider":
      return { id: newId(), type, content: {}, style: { color: "#e2e8f0", paddingY: 8 } }
    case "spacer":
      return { id: newId(), type, content: {}, style: { height: 24 } }
    case "social":
      return { id: newId(), type, content: { socials: [{ network: "twitter", href: "https://" }, { network: "linkedin", href: "https://" }] }, style: { align: "center", paddingY: 8 } }
    case "footer":
      return { id: newId(), type, content: { text: "© {{companyName}} • Unsubscribe" }, style: { align: "center", fontSize: 12, color: "#94a3b8", paddingY: 8 } }
    case "columns":
      return { id: newId(), type, content: { columns: [[], []] }, style: { paddingY: 8 } }
  }
}

interface EditorState {
  templateKey: string | null
  resolved: ResolvedTemplate | null
  subject: string
  layout: EmailLayout | null
  selectedId: string | null
  preview: boolean
  dirty: boolean

  load: (resolved: ResolvedTemplate) => void
  select: (id: string | null) => void
  setPreview: (preview: boolean) => void
  setSubject: (subject: string) => void
  setDoc: (patch: Partial<Pick<EmailLayout, "background" | "contentBackground" | "width">>) => void

  addBlock: (type: BlockType, atIndex?: number) => void
  insertExisting: (block: EmailBlock, atIndex: number) => void
  moveBlock: (fromIndex: number, toIndex: number) => void
  updateContent: (id: string, patch: Partial<EmailBlock["content"]>) => void
  updateStyle: (id: string, patch: Partial<BlockStyle>) => void
  duplicateBlock: (id: string) => void
  removeBlock: (id: string) => void

  markSaved: () => void
}

function indexOf(layout: EmailLayout, id: string) {
  return layout.blocks.findIndex((b) => b.id === id)
}

export const useEditorStore = create<EditorState>((set) => ({
  templateKey: null,
  resolved: null,
  subject: "",
  layout: null,
  selectedId: null,
  preview: false,
  dirty: false,

  load: (resolved) => {
    const subject = resolved.config.subject ?? resolved.template.defaultSubject
    // Deep clone so edits don't mutate the seeded default.
    const base = resolved.config.layout ?? resolved.template.defaultLayout
    const layout = structuredClone(base)
    set({
      templateKey: resolved.template.key,
      resolved,
      subject,
      layout,
      selectedId: null,
      preview: false,
      dirty: false,
    })
  },

  select: (id) => set({ selectedId: id }),
  setPreview: (preview) => set({ preview, selectedId: null }),
  setSubject: (subject) => set({ subject, dirty: true }),

  setDoc: (patch) =>
    set((s) => (s.layout ? { layout: { ...s.layout, ...patch }, dirty: true } : s)),

  addBlock: (type, atIndex) =>
    set((s) => {
      if (!s.layout) return s
      const block = createBlock(type)
      const blocks = [...s.layout.blocks]
      const at = atIndex ?? blocks.length
      blocks.splice(at, 0, block)
      return { layout: { ...s.layout, blocks }, selectedId: block.id, dirty: true }
    }),

  insertExisting: (block, atIndex) =>
    set((s) => {
      if (!s.layout) return s
      const blocks = [...s.layout.blocks]
      blocks.splice(atIndex, 0, block)
      return { layout: { ...s.layout, blocks }, selectedId: block.id, dirty: true }
    }),

  moveBlock: (fromIndex, toIndex) =>
    set((s) => {
      if (!s.layout) return s
      const blocks = [...s.layout.blocks]
      const [moved] = blocks.splice(fromIndex, 1)
      blocks.splice(toIndex, 0, moved)
      return { layout: { ...s.layout, blocks }, dirty: true }
    }),

  updateContent: (id, patch) =>
    set((s) => {
      if (!s.layout) return s
      const blocks = s.layout.blocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, ...patch } } : b
      )
      return { layout: { ...s.layout, blocks }, dirty: true }
    }),

  updateStyle: (id, patch) =>
    set((s) => {
      if (!s.layout) return s
      const blocks = s.layout.blocks.map((b) =>
        b.id === id ? { ...b, style: { ...b.style, ...patch } } : b
      )
      return { layout: { ...s.layout, blocks }, dirty: true }
    }),

  duplicateBlock: (id) =>
    set((s) => {
      if (!s.layout) return s
      const i = indexOf(s.layout, id)
      if (i < 0) return s
      const copy = { ...structuredClone(s.layout.blocks[i]), id: newId() }
      const blocks = [...s.layout.blocks]
      blocks.splice(i + 1, 0, copy)
      return { layout: { ...s.layout, blocks }, selectedId: copy.id, dirty: true }
    }),

  removeBlock: (id) =>
    set((s) => {
      if (!s.layout) return s
      const blocks = s.layout.blocks.filter((b) => b.id !== id)
      return {
        layout: { ...s.layout, blocks },
        selectedId: s.selectedId === id ? null : s.selectedId,
        dirty: true,
      }
    }),

  markSaved: () => set({ dirty: false }),
}))
