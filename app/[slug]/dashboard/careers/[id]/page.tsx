import type { Metadata } from "next"
import { JobDetails } from "@/components/careers/job-details"

export const metadata: Metadata = { title: "Job Details" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function DashboardJobDetailsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="animate-in py-2 duration-300 fade-in">
      <JobDetails jobId={Number(id)} embedded />
    </div>
  )
}
