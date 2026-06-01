"use client"

import { useState } from "react"
import Link from "next/link"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Briefcase01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Location01Icon,
  Clock01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { usePublicJobs } from "@/hooks/use-hr"
import { useAuthStore } from "@/store/auth-store"
import type { JobPosting } from "@/lib/hr-api"
import { ApplyModal } from "./careers-page"

const STATUS_VARIANT: Record<string, "green" | "amber" | "blue" | "gray"> = {
  new: "green",
  urgent: "amber",
  open: "blue",
  closed: "gray",
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
  GBP: "£",
  SGD: "S$",
  AUD: "A$",
  JPY: "¥",
}

const PERIOD_LABEL: Record<string, string> = {
  hourly: "hr",
  weekly: "wk",
  "semi-monthly": "semi-mo",
  monthly: "mo",
  "fixed-price": "fixed",
}

const WORK_TYPE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
}

function salaryText(job: JobPosting): string | null {
  const sym = job.salaryCurrency
    ? (CURRENCY_SYMBOLS[job.salaryCurrency] ?? job.salaryCurrency)
    : "₱"
  if (job.salaryGradeFromName) {
    return `${job.salaryGradeFromName}${job.salaryGradeToName ? ` – ${job.salaryGradeToName}` : ""}`
  }
  if (job.salaryFrom != null) {
    return `${sym}${job.salaryFrom.toLocaleString()}${
      job.salaryTo != null ? ` – ${sym}${job.salaryTo.toLocaleString()}` : ""
    }`
  }
  return null
}

/**
 * Job details for a single posting. Reused by the public `/careers/[id]` route and
 * the in-dashboard `/dashboard/careers/[id]` route (pass `embedded`). Resolves the job
 * from the already-cached public jobs list — no extra single-job endpoint required.
 */
export function JobDetails({
  jobId,
  embedded = false,
}: {
  jobId: number
  embedded?: boolean
}) {
  const { data, isLoading, isError } = usePublicJobs({ size: 100 })
  const job = data?.content.find((j) => j.id === jobId)
  const apiRole = useAuthStore((s) => s.apiRole)
  const isApplicant = apiRole?.toUpperCase() === "APPLICANT"
  const [applyOpen, setApplyOpen] = useState(false)

  const backHref = embedded ? "/dashboard/careers" : "/careers"
  // Where a guest is sent after signing in — straight back to this job in the dashboard.
  const loginRedirect = `/auth/login?redirect=${encodeURIComponent(`/dashboard/careers/${jobId}`)}`

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (isError || !job) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-24 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon
            icon={Briefcase01Icon}
            size={24}
            strokeWidth={1.5}
            className="text-muted-foreground/60"
          />
        </div>
        <p className="text-[15px] font-semibold">Position not found</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          This role may have been closed or removed.
        </p>
        <Link href={backHref} className="mt-4">
          <Button variant="outline" size="sm">
            Back to all positions
          </Button>
        </Link>
      </div>
    )
  }

  const salary = salaryText(job)

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      {/* Back */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
        All positions
      </Link>

      {/* Header */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-bold tracking-tight">{job.title}</h1>
          <StatusBadge variant={STATUS_VARIANT[job.status] ?? "gray"}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </StatusBadge>
          {job.workType && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {WORK_TYPE_LABEL[job.workType] ?? job.workType}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Briefcase01Icon} size={13} strokeWidth={1.8} />
            {job.department}
          </span>
          {job.location && (
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Location01Icon} size={13} strokeWidth={1.8} />
              {job.location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Clock01Icon} size={13} strokeWidth={1.8} />
            {job.type}
          </span>
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={UserGroupIcon} size={13} strokeWidth={1.8} />
            {job.applicantsCount} applicant{job.applicantsCount !== 1 ? "s" : ""}
          </span>
        </div>

        {salary && (
          <p className="mt-3 text-[15px] font-semibold text-foreground">
            {salary}
            {job.salaryPeriod && (
              <span className="ml-1 text-[13px] font-normal text-muted-foreground">
                / {PERIOD_LABEL[job.salaryPeriod] ?? job.salaryPeriod}
              </span>
            )}
          </p>
        )}

        {job.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {job.tags.map((t) => (
              <StatusBadge key={t} variant="blue" dot={false}>
                {t}
              </StatusBadge>
            ))}
          </div>
        )}

        {/* Apply */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          {embedded || isApplicant ? (
            <Button onClick={() => setApplyOpen(true)}>
              Apply for this role
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                strokeWidth={2}
                className="ml-1.5"
              />
            </Button>
          ) : (
            <>
              <Link href={loginRedirect}>
                <Button>
                  Sign in to apply
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    strokeWidth={2}
                    className="ml-1.5"
                  />
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setApplyOpen(true)}
                className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                or quick apply without an account →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {job.description ? (
        <div className="mt-5 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-3 text-[15px] font-semibold">About this role</h2>
          <div
            className="rte-content text-[13px] leading-relaxed text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        </div>
      ) : null}

      {applyOpen && (
        <ApplyModal job={job} onClose={() => setApplyOpen(false)} />
      )}
    </div>
  )
}
