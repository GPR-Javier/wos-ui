"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { EmailTemplatesSection } from "./email-templates"
import { EmailEditor } from "./email-editor/email-editor"

// Renders inside the Config page's "Email templates" tab. The list and the
// drag-and-drop editor are sub-views of the same tab: `?tab=email` shows the list,
// `?tab=email&sub=<key>` opens that template's editor — so the Config side-nav
// stays put (Email highlighted) instead of navigating to a separate full page.
export function EmailConfigPanel() {
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
          <EmailEditor templateKey={sub} />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
            Loading editor…
          </div>
        )}
      </div>
    )
  }

  return <EmailTemplatesSection />
}
