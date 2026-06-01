"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { useEffect } from "react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { cn } from "@/lib/utils"

// ── Toolbar button ─────────────────────────────────────────────────────────────

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={cn(
        "flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-[11px] font-semibold transition-colors select-none",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-4 w-px shrink-0 bg-border" />
}

// ── Editor ────────────────────────────────────────────────────────────────────

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write a detailed job description…",
  className,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Placeholder.configure({ placeholder })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "rte-content" },
    },
  })

  // Sync external value changes (e.g. opening edit modal with saved content)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== value) {
      editor.commands.setContent(value ?? "", false)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null

  const e = editor // alias for brevity

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input focus-within:ring-2 focus-within:ring-ring",
        className
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/30 px-2 py-1.5">
        {/* Text style */}
        <ToolBtn
          active={e.isActive("bold")}
          onClick={() => e.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn
          active={e.isActive("italic")}
          onClick={() => e.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolBtn>
        <ToolBtn
          active={e.isActive("underline")}
          onClick={() => e.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <span className="underline">U</span>
        </ToolBtn>

        <Divider />

        {/* Headings */}
        <ToolBtn
          active={e.isActive("heading", { level: 2 })}
          onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          H2
        </ToolBtn>
        <ToolBtn
          active={e.isActive("heading", { level: 3 })}
          onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          H3
        </ToolBtn>

        <Divider />

        {/* Lists */}
        <ToolBtn
          active={e.isActive("bulletList")}
          onClick={() => e.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="1.5" cy="3" r="1.5" />
            <rect x="4" y="2.25" width="8" height="1.5" rx="0.75" />
            <circle cx="1.5" cy="6" r="1.5" />
            <rect x="4" y="5.25" width="8" height="1.5" rx="0.75" />
            <circle cx="1.5" cy="9" r="1.5" />
            <rect x="4" y="8.25" width="8" height="1.5" rx="0.75" />
          </svg>
        </ToolBtn>
        <ToolBtn
          active={e.isActive("orderedList")}
          onClick={() => e.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <text x="0" y="4" fontSize="4" fontFamily="monospace">
              1.
            </text>
            <rect x="4" y="2.25" width="8" height="1.5" rx="0.75" />
            <text x="0" y="7.5" fontSize="4" fontFamily="monospace">
              2.
            </text>
            <rect x="4" y="5.75" width="8" height="1.5" rx="0.75" />
            <text x="0" y="11" fontSize="4" fontFamily="monospace">
              3.
            </text>
            <rect x="4" y="9.25" width="8" height="1.5" rx="0.75" />
          </svg>
        </ToolBtn>

        <Divider />

        {/* Clear formatting */}
        <ToolBtn
          active={false}
          onClick={() => e.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear formatting"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 9l7-7M4 2l5 5M1.5 9.5h5" />
          </svg>
        </ToolBtn>
      </div>

      {/* ── Editor area ── */}
      <EditorContent editor={editor} />
    </div>
  )
}
