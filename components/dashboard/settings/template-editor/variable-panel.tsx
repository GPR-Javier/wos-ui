"use client"

import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CpuIcon,
  UserIcon,
  AddCircleIcon,
  Copy01Icon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import type { TemplateVariable, VariableSource } from "@/lib/template-types"
import { useEditorStore } from "./editor-store"

const TEXTY = new Set(["heading", "text", "button", "footer"])

export function VariablePanel({ vars }: { vars: TemplateVariable[] }) {
  const layout = useEditorStore((s) => s.layout)
  const selectedId = useEditorStore((s) => s.selectedId)
  const updateContent = useEditorStore((s) => s.updateContent)

  const selected = layout?.blocks.find((b) => b.id === selectedId)
  const canInsert = selected && TEXTY.has(selected.type)

  const onUse = async (v: TemplateVariable) => {
    const token = `{{${v.key}}}`
    if (canInsert && selected) {
      const current = selected.content.text ?? ""
      updateContent(selected.id, {
        text: `${current}${current ? " " : ""}${token}`,
      })
      toast.success(`Inserted ${token}`)
    } else {
      await navigator.clipboard.writeText(token)
      toast.success(`Copied ${token}`, {
        description: "Select a text block to insert it directly.",
      })
    }
  }

  const group = (source: VariableSource) =>
    vars.filter((v) => v.source === source)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[12px] font-semibold">Variables</p>
        <p className="text-[11px] text-muted-foreground">
          {canInsert
            ? "Click to insert into the selected block"
            : "Click to copy — or select a text block to insert"}
        </p>
      </div>

      {(["SYSTEM", "USER"] as VariableSource[]).map((source) => {
        const list = group(source)
        if (list.length === 0) return null
        return (
          <div key={source} className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <HugeiconsIcon
                icon={source === "SYSTEM" ? CpuIcon : UserIcon}
                size={12}
                strokeWidth={1.8}
              />
              {source === "SYSTEM"
                ? "System (auto-filled)"
                : "Recipient / merge fields"}
            </div>
            <div className="space-y-1">
              {list.map((v) => (
                <button
                  key={v.key}
                  onClick={() => onUse(v)}
                  className="group flex w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <code className="truncate text-[11px] font-medium text-primary">
                        {`{{${v.key}}}`}
                      </code>
                      {v.required && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[9px]"
                        >
                          required
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">
                      e.g. {v.sampleValue}
                    </p>
                  </div>
                  <HugeiconsIcon
                    icon={canInsert ? AddCircleIcon : Copy01Icon}
                    size={13}
                    strokeWidth={1.8}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
