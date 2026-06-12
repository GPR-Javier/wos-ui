"use client"

import { useState } from "react"
import Link from "next/link"
import { useSlugHref } from "@/lib/slug"
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
  CheckmarkCircle01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons"
import { usePublicJobs } from "@/hooks/use-hr"
import { useMyApplications } from "@/hooks/use-applications"
import { useAuthStore } from "@/store/auth-store"
import type { JobPosting } from "@/lib/hr-api"
import { APPLICATION_STATUS_LABEL } from "@/lib/application-api"
import { ApplicationJourney } from "./application-journey"
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
  const slugHref = useSlugHref()
  const { data, isLoading, isError } = usePublicJobs({ size: 100 })
  const job = data?.content.find((j) => j.id === jobId)
  const apiRole = useAuthStore((s) => s.apiRole)
  const isApplicant = apiRole?.toUpperCase() === "APPLICANT"
  const [applyOpen, setApplyOpen] = useState(false)

  // Only the signed-in applicant has applications to match against — skip the
  // authed call on the public page for guests.
  const { data: myApplications } = useMyApplications({
    enabled: embedded || isApplicant,
  })
  // The candidate's latest application to this job (the list is newest-first). With reapplies
  // there can be several rows; the most recent one decides the current state.
  const latestApplication = myApplications?.find((a) => a.jobPostingId === jobId)
  const hasApplied =
    latestApplication != null &&
    latestApplication.status !== "WITHDRAWN" &&
    latestApplication.status !== "REJECTED"
  // A rejected candidate is blocked until the posting's cooldown elapses.
  const cooldownUntil =
    latestApplication?.status === "REJECTED" &&
    latestApplication.reapplyAvailableAt &&
    new Date(latestApplication.reapplyAvailableAt).getTime() > Date.now()
      ? new Date(latestApplication.reapplyAvailableAt)
      : null

  const backHref = slugHref(embedded ? "/dashboard/careers" : "/careers")
  // Where a guest is sent after signing in — straight back to this job in the dashboard.
  const loginRedirect = `${slugHref("/login")}?redirect=${encodeURIComponent(slugHref(`/dashboard/careers/${jobId}`))}`

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
          {hasApplied && (
            <StatusBadge variant="green" dot={false}>
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={11}
                strokeWidth={2}
              />
              Applied
            </StatusBadge>
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
              <HugeiconsIcon
                icon={Location01Icon}
                size={13}
                strokeWidth={1.8}
              />
              {job.location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Clock01Icon} size={13} strokeWidth={1.8} />
            {job.type}
          </span>
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={UserGroupIcon} size={13} strokeWidth={1.8} />
            {job.applicantsCount} applicant
            {job.applicantsCount !== 1 ? "s" : ""}
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
          {hasApplied ? (
            <>
              <Button variant="outline" disabled>
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={14}
                  strokeWidth={2}
                  className="mr-1.5"
                />
                Applied · {APPLICATION_STATUS_LABEL[latestApplication.status]}
              </Button>
              <Link
                href={slugHref("/dashboard/my-applications")}
                className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Track your application →
              </Link>
            </>
          ) : cooldownUntil ? (
            <Button variant="outline" disabled>
              <HugeiconsIcon
                icon={Clock01Icon}
                size={14}
                strokeWidth={2}
                className="mr-1.5"
              />
              Reapply on{" "}
              {cooldownUntil.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Button>
          ) : embedded || isApplicant ? (
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

      {/* Application status journey — shown once the candidate has applied (incl. rejected). */}
      {latestApplication && (
        <div className="mt-5">
          <ApplicationJourney application={latestApplication} />
        </div>
      )}

      {/* Rejection email — highlighted so the candidate sees why and when they can reapply */}
      {latestApplication?.status === "REJECTED" &&
        latestApplication.rejectionReason && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-at">
            <div className="flex flex-wrap items-center gap-2 border-b border-at bg-abg px-6 py-3.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-abg text-amber">
                <HugeiconsIcon icon={Mail01Icon} size={15} strokeWidth={1.8} />
              </span>
              <h2 className="text-[15px] font-semibold">
                Message from the hiring team
              </h2>
              {cooldownUntil && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-at bg-abg px-2.5 py-1 text-[11px] font-medium text-amber">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    size={11}
                    strokeWidth={2}
                  />
                  Reapply on{" "}
                  {cooldownUntil.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <div
              className="rte-content bg-card px-6 py-5 text-[13px] leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{
                __html: latestApplication.rejectionReason,
              }}
            />
          </div>
        )}

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
