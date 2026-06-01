"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
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
import {
  type JobApplication,
  type ApplicationStatus,
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_VARIANT,
} from "@/lib/application-api"

const TERMINAL: ApplicationStatus[] = ["WITHDRAWN", "HIRED", "REJECTED"]
// Show the assessment CTA only before/while taking it — not once it's submitted for review.
const CAN_ASSESS: ApplicationStatus[] = ["SUBMITTED", "ASSESSMENT"]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function MyApplicationsScreen() {
  const { data: applications = [], isLoading, isError } = useMyApplications()
  const withdrawMut = useWithdrawApplication()
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)

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
          <Link href="/dashboard/careers" className="mt-5">
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
            return (
              <div
                key={app.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between",
                  app.status === "WITHDRAWN" && "opacity-60"
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
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {CAN_ASSESS.includes(app.status) && (
                    <Link href={`/dashboard/assessment/${app.id}`}>
                      <Button size="sm">
                        {app.status === "ASSESSMENT"
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
    </div>
  )
}
