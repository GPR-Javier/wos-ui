"use client"

import { useCallback, useMemo } from "react"
import { NextStep, NextStepProvider, useNextStep, type Tour } from "nextstepjs"
import { onboardingApi } from "@/lib/auth-api"
import { buildAllTours, screenKeyOf } from "@/lib/onboarding-config"
import { useAuthStore } from "@/store/auth-store"
import { ShadcnTourCard } from "./tour-card"
import { OnboardingContext } from "./onboarding-context"

// All tier/screen tours, built once. NextStep keeps them dormant until one is started.
const TOURS: Tour[] = buildAllTours()

/** Bridges NextStep to the auth store + API: persists per-screen completion and "skip all". */
function OnboardingBridge({ children }: { children: React.ReactNode }) {
  const { closeNextStep } = useNextStep()
  const apiRole = useAuthStore((s) => s.apiRole)
  const setOnboarding = useAuthStore((s) => s.setOnboarding)

  const completeScreen = useCallback(
    (tourName: string | null) => {
      if (!apiRole || !tourName) return
      onboardingApi
        .completeScreen(screenKeyOf(tourName))
        .then((res) => setOnboarding(res.onboarded, res.onboardingDone))
        .catch(() => {
          /* non-blocking: a failed write just means the tour may show again */
        })
    },
    [apiRole, setOnboarding]
  )

  // Skipping a single screen's tour still marks that screen done so it won't reappear.
  const handleSkip = useCallback(
    (_step: number, tourName: string | null) => completeScreen(tourName),
    [completeScreen]
  )

  const skipAll = useCallback(() => {
    closeNextStep()
    if (!apiRole) return
    onboardingApi
      .skipAll()
      .then((res) => setOnboarding(res.onboarded, res.onboardingDone))
      .catch(() => {})
  }, [apiRole, closeNextStep, setOnboarding])

  const ctx = useMemo(() => ({ skipAll }), [skipAll])

  return (
    <OnboardingContext.Provider value={ctx}>
      <NextStep
        steps={TOURS}
        cardComponent={ShadcnTourCard}
        onComplete={completeScreen}
        onSkip={handleSkip}
        disableConsoleLogs
      >
        {children}
      </NextStep>
    </OnboardingContext.Provider>
  )
}

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NextStepProvider>
      <OnboardingBridge>{children}</OnboardingBridge>
    </NextStepProvider>
  )
}
