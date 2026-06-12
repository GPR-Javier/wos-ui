import type { Metadata } from "next"
import { RecruitmentSection } from "@/components/dashboard/hr/recruitment"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "Recruitment" }

export default function RecruitmentPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ScreenOnboarding screenKey="recruitment" />
      <RecruitmentSection />
    </div>
  )
}
