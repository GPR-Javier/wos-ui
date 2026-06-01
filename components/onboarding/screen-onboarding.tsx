"use client"

import { useScreenOnboarding } from "@/hooks/use-onboarding"

/**
 * Drop-in marker a page renders once to register its onboarding tour, e.g.
 * `<ScreenOnboarding screenKey="careers" />`. Renders nothing.
 */
export function ScreenOnboarding({ screenKey }: { screenKey: string }) {
  useScreenOnboarding(screenKey)
  return null
}
