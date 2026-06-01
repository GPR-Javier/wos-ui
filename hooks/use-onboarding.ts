"use client"

import { useEffect } from "react"
import { useNextStep } from "nextstepjs"
import { useAuthStore } from "@/store/auth-store"
import { getScreenDef, tierFromRole, tourId } from "@/lib/onboarding-config"

/**
 * Starts this screen's onboarding tour the first time the active role visits it.
 * Runs once per (role, screen): gated by login state, the master "skip all" flag,
 * the per-screen completion set, and the screen's required authority.
 */
export function useScreenOnboarding(screenKey: string) {
  const { startNextStep, currentTour, isNextStepVisible } = useNextStep()
  const apiRole = useAuthStore((s) => s.apiRole)
  const dashboardRole = useAuthStore((s) => s.dashboardRole)
  const onboarded = useAuthStore((s) => s.onboarded)
  const onboardingDone = useAuthStore((s) => s.onboardingDone)
  const authorities = useAuthStore((s) => s.authorities)

  useEffect(() => {
    if (!apiRole) return // not logged in
    if (onboarded) return // fully done / skipped for this role
    if (onboardingDone.includes(screenKey)) return // already seen this screen
    if (isNextStepVisible || currentTour) return // another tour is running

    const tier = tierFromRole(dashboardRole)
    const def = getScreenDef(tier, screenKey)
    if (!def) return
    if (def.authority && !authorities.includes(def.authority)) return

    // Small delay so the page (and any anchored selectors) have painted.
    const timer = setTimeout(() => startNextStep(tourId(tier, screenKey)), 450)
    return () => clearTimeout(timer)
  }, [
    apiRole,
    dashboardRole,
    onboarded,
    onboardingDone,
    authorities,
    screenKey,
    isNextStepVisible,
    currentTour,
    startNextStep,
  ])
}
