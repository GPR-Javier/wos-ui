"use client"

import { useEffect } from "react"

/**
 * Calls {@code handler} when Escape is pressed — for hand-rolled overlay modals that don't get
 * radix Dialog's built-in Escape-to-close. Listens at the document level while {@code enabled}.
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [handler, enabled])
}
