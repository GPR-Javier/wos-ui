import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "Interviews" }

export default function InterviewsPage() {
  return (
    <>
      <ScreenOnboarding screenKey="interviews" />
      <ComingSoon
        title="Interviews"
        description="View your scheduled interviews and confirm attendance."
      />
    </>
  )
}
