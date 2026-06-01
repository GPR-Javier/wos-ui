"use client"

import { createContext, useContext } from "react"

export interface OnboardingContextValue {
  /** Skip every remaining tour for the active role (the global "skip all"). */
  skipAll: () => void
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(
  null
)

export function useOnboardingContext(): OnboardingContextValue {
  return (
    useContext(OnboardingContext) ?? {
      skipAll: () => {},
    }
  )
}
