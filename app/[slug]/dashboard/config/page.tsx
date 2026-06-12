import { Suspense } from "react"
import type { Metadata } from "next"
import { ConfigSection } from "@/components/dashboard/admin/config"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "Configuration" }

export default function ConfigPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ScreenOnboarding screenKey="config" />
      <Suspense>
        <ConfigSection />
      </Suspense>
    </div>
  )
}
