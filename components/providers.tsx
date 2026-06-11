"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { Toaster } from "@/components/ui/sonner"
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingProvider>{children}</OnboardingProvider>
      <Toaster />
    </QueryClientProvider>
  )
}
