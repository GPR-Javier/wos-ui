import type { Metadata } from "next"
import { ApplicantsReviewSection } from "@/components/dashboard/hr/applicants-review"

export const metadata: Metadata = { title: "Applicants" }

export default function ApplicantsPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ApplicantsReviewSection />
    </div>
  )
}
