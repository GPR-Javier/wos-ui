import type { Metadata } from "next"
import { CareersPage } from "@/components/careers/careers-page"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "Careers" }

export default function DashboardCareersPage() {
  return (
    <>
      <ScreenOnboarding screenKey="careers" />
      <CareersPage embedded />
    </>
  )
}
