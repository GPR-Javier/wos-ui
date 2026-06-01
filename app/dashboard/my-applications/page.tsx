import type { Metadata } from "next"
import { MyApplicationsScreen } from "@/components/dashboard/applicant/my-applications"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "My Applications" }

export default function MyApplicationsPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ScreenOnboarding screenKey="my-applications" />
      <MyApplicationsScreen />
    </div>
  )
}
