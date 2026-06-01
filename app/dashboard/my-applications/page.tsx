import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "My Applications" }

export default function MyApplicationsPage() {
  return (
    <>
      <ScreenOnboarding screenKey="my-applications" />
      <ComingSoon
        title="My Applications"
        description="Track your submitted applications and their status."
      />
    </>
  )
}
