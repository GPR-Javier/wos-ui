"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { TemplateKind } from "@/lib/template-types"
import { TemplateListSection } from "./template-list"
import { TemplateEditor } from "./template-editor/template-editor"

/**
 * Renders inside one of the Config page's Communications tabs. The list and the drag-and-drop
 * editor are sub-views of the same tab: `?tab=<tab>` shows the list, `?tab=<tab>&sub=<key>` opens
 * that template's editor — so the Config side-nav stays put instead of navigating to a separate
 * full page.
 */
export function TemplateConfigPanel({
  kind,
  tab,
  title,
  description,
  toggleable = true,
}: {
  kind: TemplateKind
  tab: string
  title: string
  description: string
  toggleable?: boolean
}) {
  const sub = useSearchParams().get("sub")

  // The editor is a heavy, client-only dnd-kit tree. Mounting it in the SAME commit
  // that unmounts the list raced dnd-kit's DOM setup against React's reconciliation
  // ("Cannot read properties of null (reading 'removeChild')"). Gate the editor on a
  // state that only catches up to `sub` in an effect — so the list unmounts first
  // (placeholder shown), then the editor mounts in a separate, later commit. This also
  // keeps the editor out of SSR/hydration (initial state is null on server + first
  // client render → both show the placeholder).
  const [readyKey, setReadyKey] = useState<string | null>(null)
  useEffect(() => {
    setReadyKey(sub)
  }, [sub])

  if (sub) {
    return (
      <div className="h-[calc(100vh-8.5rem)] min-h-130 overflow-hidden rounded-xl border border-border bg-card">
        {readyKey === sub ? (
          <TemplateEditor templateKey={sub} backTab={tab} />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
            Loading editor…
          </div>
        )}
      </div>
    )
  }

  return (
    <TemplateListSection
      kind={kind}
      tab={tab}
      title={title}
      description={description}
      toggleable={toggleable}
    />
  )
}
