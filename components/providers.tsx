"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { AppToaster } from "@/components/custom/app-toaster"
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingProvider>{children}</OnboardingProvider>
      <AppToaster />
    </QueryClientProvider>
  )
}
