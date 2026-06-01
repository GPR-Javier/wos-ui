import type { Metadata } from "next"
import { AssessmentShell } from "@/components/dashboard/applicant/assessment-shell"

export const metadata: Metadata = { title: "Assessment" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function AssessmentPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="animate-in py-2 duration-300 fade-in">
      <AssessmentShell applicationId={Number(id)} />
    </div>
  )
}
