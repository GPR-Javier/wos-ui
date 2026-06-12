"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useSlugHref } from "@/lib/slug"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Briefcase01Icon,
  Clock01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  File01Icon,
} from "@hugeicons/core-free-icons"
import {
  useMyApplications,
  useWithdrawApplication,
} from "@/hooks/use-applications"
import { OfferReviewModal } from "@/components/dashboard/applicant/offer-review-modal"
import {
  type JobApplication,
  type ApplicationStatus,
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_VARIANT,
} from "@/lib/application-api"

const TERMINAL: ApplicationStatus[] = ["WITHDRAWN", "HIRED", "REJECTED"]
// Show the assessment CTA only before/while taking it — not once it's submitted for review.
// UNDER_REVIEW included: after a reviewer passes an interview stage the candidate must re-enter to
// take the newly-unlocked next stage.
const CAN_ASSESS: ApplicationStatus[] = ["SUBMITTED", "ASSESSMENT", "UNDER_REVIEW"]
// Closed applications the candidate can submit again.
const CAN_REAPPLY: ApplicationStatus[] = ["WITHDRAWN", "REJECTED"]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** A rejected application is still cooling down if its reapply date is in the future. */
function cooldownUntil(app: JobApplication): Date | null {
  if (app.status !== "REJECTED" || !app.reapplyAvailableAt) return null
  const until = new Date(app.reapplyAvailableAt)
  return until.getTime() > Date.now() ? until : null
}

export function MyApplicationsScreen() {
  const slugHref = useSlugHref()
  const { data: applications = [], isLoading, isError } = useMyApplications()
  const withdrawMut = useWithdrawApplication()

  // The list is newest-first, so the first row per job is the candidate's current application.
  // Older rows for the same job are history (a prior rejection they've already reapplied past),
  // so only the latest one carries the reapply / cooldown actions.
  const latestIdByJob = new Map<number, number>()
  for (const a of applications) {
    if (!latestIdByJob.has(a.jobPostingId))
      latestIdByJob.set(a.jobPostingId, a.id)
  }
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)
  // Which application's offer is open for review/signing.
  const [offerAppId, setOfferAppId] = useState<number | null>(null)

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleWithdraw(app: JobApplication) {
    if (!confirm(`Withdraw your application for "${app.jobTitle}"?`)) return
    withdrawMut.mutate(app.id, {
      onSuccess: () => showToast("Application withdrawn.", "success"),
      onError: () => showToast("Failed to withdraw.", "error"),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">My Applications</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Track the positions you&apos;ve applied to and their status.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex justify-end">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white shadow-md",
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            )}
          >
            <HugeiconsIcon
              icon={
                toast.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon
              }
              size={14}
              strokeWidth={2}
            />
            {toast.msg}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-[13px] text-muted-foreground">
          Couldn&apos;t load your applications. Please try again.
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              icon={Briefcase01Icon}
              size={22}
              strokeWidth={1.5}
              className="text-muted-foreground/60"
            />
          </div>
          <p className="text-[14px] font-semibold">No applications yet</p>
          <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
            Browse open positions and apply to start tracking your applications
            here.
          </p>
          <Link href={slugHref("/dashboard/careers")} className="mt-5">
            <Button size="sm">
              Browse Careers
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={13}
                strokeWidth={2}
                className="ml-1.5"
              />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const canWithdraw = !TERMINAL.includes(app.status)
            const isLatestForJob = latestIdByJob.get(app.jobPostingId) === app.id
            // Only the current application for a job offers reapply / shows its cooldown;
            // older superseded rows are history.
            const coolingDown = isLatestForJob ? cooldownUntil(app) : null
            // Withdrawn can always reapply; rejected only once the cooldown has elapsed.
            const canReapply =
              isLatestForJob &&
              CAN_REAPPLY.includes(app.status) &&
              !coolingDown
            return (
              <div
                key={app.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between",
                  (app.status === "WITHDRAWN" || !isLatestForJob) && "opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[14px] font-semibold">
                      {app.jobTitle ?? "Position"}
                    </h2>
                    <StatusBadge
                      variant={APPLICATION_STATUS_VARIANT[app.status]}
                    >
                      {APPLICATION_STATUS_LABEL[app.status]}
                    </StatusBadge>
                    {!isLatestForJob && (
                      <span className="text-[11px] text-muted-foreground">
                        · earlier attempt
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    {app.department && (
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon
                          icon={Briefcase01Icon}
                          size={11}
                          strokeWidth={1.8}
                        />
                        {app.department}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={11}
                        strokeWidth={1.8}
                      />
                      Applied {formatDate(app.appliedAt)}
                    </span>
                    {app.resumeFileName && (
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon
                          icon={File01Icon}
                          size={11}
                          strokeWidth={1.8}
                        />
                        {app.resumeFileName}
                      </span>
                    )}
                  </div>

                  {app.status === "REJECTED" && app.rejectionReason && (
                    <div className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                      <p className="mb-1 font-medium text-foreground">
                        Message from the hiring team
                      </p>
                      <div
                        className="rte-content"
                        dangerouslySetInnerHTML={{ __html: app.rejectionReason }}
                      />
                    </div>
                  )}

                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {app.status === "OFFER" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setOfferAppId(app.id)}
                    >
                      Review &amp; sign offer
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={13}
                        strokeWidth={2}
                        className="ml-1.5"
                      />
                    </Button>
                  )}
                  {CAN_ASSESS.includes(app.status) && (
                    <Link href={`/dashboard/assessment/${app.id}`}>
                      <Button size="sm">
                        {app.status === "ASSESSMENT" ||
                        app.status === "UNDER_REVIEW"
                          ? "Continue assessment"
                          : "Take assessment"}
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          size={13}
                          strokeWidth={2}
                          className="ml-1.5"
                        />
                      </Button>
                    </Link>
                  )}
                  {coolingDown ? (
                    <Button size="sm" variant="outline" disabled>
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={13}
                        strokeWidth={2}
                        className="mr-1.5"
                      />
                      Reapply {formatDate(coolingDown.toISOString())}
                    </Button>
                  ) : canReapply ? (
                    <Link href={`/dashboard/careers/${app.jobPostingId}`}>
                      <Button size="sm">
                        Reapply
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          size={13}
                          strokeWidth={2}
                          className="ml-1.5"
                        />
                      </Button>
                    </Link>
                  ) : null}
                  <Link href={`/dashboard/careers/${app.jobPostingId}`}>
                    <Button size="sm" variant="outline">
                      View job
                    </Button>
                  </Link>
                  {canWithdraw && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleWithdraw(app)}
                      disabled={withdrawMut.isPending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {offerAppId != null && (
        <OfferReviewModal
          applicationId={offerAppId}
          onClose={() => setOfferAppId(null)}
        />
      )}
    </div>
  )
}
