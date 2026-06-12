import type { Metadata } from "next"
import Link from "next/link"
import { PublicHeader } from "@/components/custom/public-header"
import { Button } from "@/components/ui/button"
import { JobDetails } from "@/components/careers/job-details"

export const metadata: Metadata = { title: "Job Details" }

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function PublicJobDetailsPage({ params }: Props) {
  const { slug, id } = await params
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader
        right={
          <Link href={`/${slug}/login`}>
            <Button variant="outline" size="sm" className="text-[13px]">
              Employee login
            </Button>
          </Link>
        }
      />
      <main className="flex-1 py-8">
        <JobDetails jobId={Number(id)} />
      </main>
    </div>
  )
}
