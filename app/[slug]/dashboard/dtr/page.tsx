import type { Metadata } from "next"
import { DTRSection } from "@/components/dashboard/employee/dtr"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "Daily Time Record" }

export default function DTRPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ScreenOnboarding screenKey="dtr" />
      <DTRSection />
    </div>
  )
}
