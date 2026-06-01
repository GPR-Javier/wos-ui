import type { Metadata } from "next"
import { DashboardOverview } from "@/components/dashboard/overview"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ScreenOnboarding screenKey="dashboard" />
      <DashboardOverview />
    </div>
  )
}
