"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSlugHref } from "@/lib/slug"
import { Logo } from "@/components/custom/logo"
import { PublicHeader } from "@/components/custom/public-header"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  Briefcase01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Location01Icon,
  Clock01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { useNextStep } from "nextstepjs"
import { useQueryClient } from "@tanstack/react-query"
import { usePublicJobs } from "@/hooks/use-hr"
import { useMyApplications, APPLICATION_KEYS } from "@/hooks/use-applications"
import { useAuthStore } from "@/store/auth-store"
import type { JobPosting } from "@/lib/hr-api"
import type { JobApplication } from "@/lib/application-api"

// ── Types ─────────────────────────────────────────────────────────────────────

type ApplyForm = {
  name: string
  email: string
  phone: string
  message: string
  resume: File | null
}
type ApplyStep = "form" | "success"

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "green" | "amber" | "blue" | "gray"> = {
  new: "green",
  urgent: "amber",
  open: "blue",
  closed: "gray",
}

const EMPTY_FORM: ApplyForm = {
  name: "",
  email: "",
  phone: "",
  message: "",
  resume: null,
}

const ACCEPTED_RESUME_TYPES = ".pdf,.doc,.docx"
const MAX_RESUME_BYTES = 5 * 1024 * 1024 // 5 MB

// ── Apply Modal ───────────────────────────────────────────────────────────────

export function ApplyModal({
  job,
  onClose,
}: {
  job: JobPosting
  onClose: () => void
}) {
  const slugHref = useSlugHref()
  const user = useAuthStore((s) => s.user)
  const apiRole = useAuthStore((s) => s.apiRole)
  const isApplicant = apiRole?.toUpperCase() === "APPLICANT"
  const [form, setForm] = useState<ApplyForm>(() => ({
    ...EMPTY_FORM,
    name: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    email: user?.email ?? "",
  }))
  const [step, setStep] = useState<ApplyStep>("form")
  const [applicationId, setApplicationId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_RESUME_BYTES) {
      setError("Resume must be under 5 MB.")
      return
    }
    setError(null)
    setForm((f) => ({ ...f, resume: file }))
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) return
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append("name", form.name.trim())
      body.append("email", form.email.trim())
      if (form.phone.trim()) body.append("phone", form.phone.trim())
      if (form.message.trim()) body.append("message", form.message.trim())
      if (form.resume) body.append("resume", form.resume)

      const res = await fetch(`/api/hr/jobs/${job.id}/apply`, {
        method: "POST",
        body,
      })
      if (res.ok) {
        try {
          const data = await res.json()
          if (data?.id) setApplicationId(data.id)
        } catch {
          /* no body — fine */
        }
        setStep("success")
      } else {
        // e.g. 409 when a rejected candidate is still within the reapply cooldown.
        let msg = "We couldn't submit your application. Please try again."
        try {
          const err = await res.json()
          if (err?.message) msg = err.message
        } catch {
          /* no JSON body — keep the default */
        }
        setError(msg)
      }
    } catch {
      setStep("success") // optimistic — backend may not be live yet
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-in rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in">
        {step === "success" ? (
          <div className="flex flex-col items-center px-8 py-10 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={32}
                strokeWidth={1.5}
                className="text-green-500"
              />
            </div>
            <h3 className="text-[17px] font-semibold">
              Application submitted!
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Thanks for applying to{" "}
              <span className="font-semibold text-foreground">{job.title}</span>
              .{" "}
              {applicationId && isApplicant
                ? "The next step is your assessment."
                : "We'll review your application and reach out soon."}
            </p>
            {applicationId && isApplicant ? (
              <div className="mt-7 flex w-full flex-col gap-2">
                <Link
                  href={slugHref(`/dashboard/assessment/${applicationId}`)}
                  className="w-full"
                >
                  <Button className="w-full">
                    Proceed to Assessment
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={13}
                      strokeWidth={2}
                      className="ml-1.5"
                    />
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={onClose}>
                  Later
                </Button>
              </div>
            ) : (
              <Button className="mt-7 w-full" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-semibold">
                  Apply — {job.title}
                </h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {job.department} · {job.location} · {job.type}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Description preview */}
            {job.description && (
              <div
                className="rte-content mb-1 max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[12px]"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            )}

            {/* Fields */}
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="apply-name"
                  className="text-[12px] text-muted-foreground"
                >
                  Full Name *
                </Label>
                <Input
                  id="apply-name"
                  autoFocus
                  className="h-9 text-[13px]"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="apply-email"
                    className="text-[12px] text-muted-foreground"
                  >
                    Email *
                  </Label>
                  <Input
                    id="apply-email"
                    type="email"
                    className="h-9 text-[13px]"
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="apply-phone"
                    className="text-[12px] text-muted-foreground"
                  >
                    Phone
                  </Label>
                  <Input
                    id="apply-phone"
                    type="tel"
                    className="h-9 text-[13px]"
                    placeholder="+63 9XX XXX XXXX"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="apply-msg"
                  className="text-[12px] text-muted-foreground"
                >
                  Cover letter / message
                </Label>
                <textarea
                  id="apply-msg"
                  rows={3}
                  placeholder="Tell us a bit about yourself and why you're a great fit…"
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                />
              </div>

              {/* Resume upload */}
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">
                  Resume
                </Label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_RESUME_TYPES}
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />

                {form.resume ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 text-primary"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                      {form.resume.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {(form.resume.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, resume: null }))}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        size={12}
                        strokeWidth={2.5}
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      handleFile(e.dataTransfer.files[0])
                    }}
                    className={cn(
                      "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
                      dragOver
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted-foreground"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">
                        Click to upload{" "}
                        <span className="text-primary">or drag & drop</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        PDF, DOC, DOCX — max 5 MB
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                * Required fields
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  data-tour="apply-submit"
                  size="sm"
                  disabled={!form.name.trim() || !form.email.trim() || busy}
                  onClick={handleSubmit}
                >
                  {busy ? "Submitting…" : "Submit application"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────

// UNDER_REVIEW is assessable too: after a reviewer passes an interview stage, the candidate is in
// "under review" but must be able to re-enter to take the newly-unlocked next stage.
const ASSESSABLE_STATUSES = ["SUBMITTED", "ASSESSMENT", "UNDER_REVIEW"]

function JobCard({
  job,
  onApply,
  onApplyAuth,
  onDetails,
  application = null,
  embedded = false,
}: {
  job: JobPosting
  onApply: () => void
  onApplyAuth: () => void
  onDetails: () => void
  application?: JobApplication | null
  embedded?: boolean
}) {
  const slugHref = useSlugHref()
  // An application is "active" unless it's closed (withdrawn/rejected) — those can reapply.
  const isActive =
    !!application &&
    application.status !== "WITHDRAWN" &&
    application.status !== "REJECTED"
  const canAssess =
    isActive && ASSESSABLE_STATUSES.includes(application!.status)
  // A rejected candidate is blocked until the posting's cooldown elapses.
  const cooldownUntil =
    application?.status === "REJECTED" && application.reapplyAvailableAt
      ? new Date(application.reapplyAvailableAt)
      : null
  const coolingDown = !!cooldownUntil && cooldownUntil.getTime() > Date.now()
  // Closed (rejected/withdrawn) but free to apply again now.
  const canReapply = !isActive && !!application && !coolingDown
  const cooldownLabel = cooldownUntil?.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-semibold">{job.title}</h2>
          <StatusBadge variant={STATUS_VARIANT[job.status] ?? "gray"}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </StatusBadge>
          {isActive && <StatusBadge variant="green">Applied</StatusBadge>}
          {coolingDown && (
            <StatusBadge variant="amber">Reapply {cooldownLabel}</StatusBadge>
          )}
          {canReapply && <StatusBadge variant="gray">Not selected</StatusBadge>}
          {job.workType && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {
                { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" }[
                  job.workType
                ]
              }
            </span>
          )}
          {job.tags.map((t) => (
            <StatusBadge key={t} variant="blue" dot={false}>
              {t}
            </StatusBadge>
          ))}
        </div>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Briefcase01Icon} size={11} strokeWidth={1.8} />
            {job.department}
          </span>
          {job.location && (
            <>
              <span className="hidden size-1 rounded-full bg-border sm:block" />
              <span className="flex items-center gap-1">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={11}
                  strokeWidth={1.8}
                />
                {job.location}
              </span>
            </>
          )}
          <span className="hidden size-1 rounded-full bg-border sm:block" />
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.8} />
            {job.type}
          </span>
          {job.salaryFrom != null &&
            (() => {
              const sym = job.salaryCurrency
                ? ((
                    {
                      PHP: "₱",
                      USD: "$",
                      EUR: "€",
                      GBP: "£",
                      SGD: "S$",
                      AUD: "A$",
                      JPY: "¥",
                    } as Record<string, string>
                  )[job.salaryCurrency] ?? job.salaryCurrency)
                : "₱"
              const amount =
                job.salaryFrom != null
                  ? `${sym}${job.salaryFrom.toLocaleString()}${job.salaryTo != null ? ` – ${sym}${job.salaryTo.toLocaleString()}` : ""}`
                  : null
              const periodLabel = {
                hourly: "hr",
                weekly: "wk",
                "semi-monthly": "semi-mo",
                monthly: "mo",
                "fixed-price": "fixed",
              } as Record<string, string>
              return amount ? (
                <>
                  <span className="hidden size-1 rounded-full bg-border sm:block" />
                  <span className="font-semibold text-foreground">
                    {amount}
                    {job.salaryPeriod && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        / {periodLabel[job.salaryPeriod] ?? job.salaryPeriod}
                      </span>
                    )}
                  </span>
                </>
              ) : null
            })()}
        </div>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-[12px] text-muted-foreground sm:block">
          <HugeiconsIcon
            icon={UserGroupIcon}
            size={12}
            strokeWidth={1.8}
            className="mr-1 inline"
          />
          {job.applicantsCount} applicant{job.applicantsCount !== 1 ? "s" : ""}
        </span>
        <Button
          data-tour="careers-details"
          size="sm"
          variant="ghost"
          onClick={onDetails}
        >
          Details
        </Button>
        {isActive ? (
          canAssess && application ? (
            <Link href={slugHref(`/dashboard/assessment/${application.id}`)}>
              <Button size="sm">
                {application.status === "ASSESSMENT" ||
                application.status === "UNDER_REVIEW"
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
          ) : (
            <span className="flex items-center gap-1 text-[12px] font-medium text-green-600 dark:text-green-400">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={14}
                strokeWidth={2}
              />
              Applied
            </span>
          )
        ) : coolingDown ? (
          <Button size="sm" variant="outline" disabled>
            <HugeiconsIcon
              icon={Clock01Icon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            Reapply {cooldownLabel}
          </Button>
        ) : (
          <>
            {!embedded && (
              <Button size="sm" variant="outline" onClick={onApply}>
                Quick apply
              </Button>
            )}
            <Button data-tour="careers-apply" size="sm" onClick={onApplyAuth}>
              {canReapply ? "Reapply" : "Apply"}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={13}
                strokeWidth={2}
                className="ml-1.5"
              />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sign-up prompt modal ──────────────────────────────────────────────────────

function SignUpPromptModal({
  job,
  onClose,
  onQuickApply,
}: {
  job: JobPosting
  onClose: () => void
  onQuickApply: () => void
}) {
  const slugHref = useSlugHref()
  // After signing in, drop the applicant straight onto this job's details page.
  const redirect = encodeURIComponent(slugHref(`/dashboard/careers/${job.id}`))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
        </button>

        <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <HugeiconsIcon
            icon={Briefcase01Icon}
            size={18}
            strokeWidth={1.8}
            className="text-primary"
          />
        </div>

        <h3 className="mt-3 text-[15px] font-semibold">Apply to {job.title}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Create a free account to track your application, get interview
          updates, and apply to multiple roles.
        </p>

        <div className="mt-5 space-y-2">
          <Link href={`${slugHref("/register")}?redirect=${redirect}`} className="block">
            <Button className="w-full" size="sm">
              Create an account
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={13}
                strokeWidth={2}
                className="ml-1.5"
              />
            </Button>
          </Link>
          <Link href={`${slugHref("/login")}?redirect=${redirect}`} className="block">
            <Button variant="outline" className="w-full" size="sm">
              Sign in to existing account
            </Button>
          </Link>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <button
            type="button"
            onClick={onQuickApply}
            className="w-full text-center text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Continue without an account →{" "}
            <span className="font-medium">Quick apply</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CareersPage({ embedded = false }: { embedded?: boolean } = {}) {
  const slugHref = useSlugHref()
  const { data, isLoading, isError } = usePublicJobs({ size: 100 })
  const allJobs = data?.content ?? []
  const openJobs = allJobs.filter((j) => j.status !== "closed")
  const { apiRole } = useAuthStore()
  const isApplicant = apiRole?.toUpperCase() === "APPLICANT"
  const { currentStep, setCurrentStep, isNextStepVisible } = useNextStep()
  const router = useRouter()
  const queryClient = useQueryClient()
  const detailsHref = (job: JobPosting) =>
    slugHref(embedded ? `/dashboard/careers/${job.id}` : `/careers/${job.id}`)

  // Logged-in applicants: cross-reference their applications so already-applied jobs
  // show their status instead of an Apply button. Never runs for guests (would 401).
  const { data: myApplications = [] } = useMyApplications({
    enabled: embedded && isApplicant,
  })
  const applicationByJob = useMemo(() => {
    // Keep the latest application per job (the list is newest-first, so the first one wins).
    // The card decides what to show from its status — applied, in cooldown, or reapply.
    const map = new Map<number, JobApplication>()
    for (const a of myApplications) {
      if (!map.has(a.jobPostingId)) map.set(a.jobPostingId, a)
    }
    return map
  }, [myApplications])

  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("")
  const [filterType, setFilterType] = useState("")
  const [applyJob, setApplyJob] = useState<JobPosting | null>(null)
  const [promptJob, setPromptJob] = useState<JobPosting | null>(null)

  const departments = useMemo(
    () => [...new Set(openJobs.map((j) => j.department))].sort(),
    [openJobs]
  )
  const types = useMemo(
    () => [...new Set(openJobs.map((j) => j.type))].sort(),
    [openJobs]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return openJobs.filter((j) => {
      const matchSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        (j.location?.toLowerCase().includes(q) ?? false) ||
        j.tags.some((t) => t.toLowerCase().includes(q))
      const matchDept = !filterDept || j.department === filterDept
      const matchType = !filterType || j.type === filterType
      return matchSearch && matchDept && matchType
    })
  }, [openJobs, search, filterDept, filterType])

  const hasFilters = !!search || !!filterDept || !!filterType

  return (
    <div
      className={cn(
        "flex flex-col",
        embedded ? "" : "min-h-screen bg-background"
      )}
    >
      {!embedded && <PublicHeader />}

      {/* ── Embedded heading (dashboard) ── */}
      {embedded && (
        <div className="px-6 pt-6 pb-1">
          <h1 className="text-lg font-semibold">Open Positions</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Browse open roles and apply directly.
            {!isLoading &&
              ` ${openJobs.length} open position${openJobs.length !== 1 ? "s" : ""}.`}
          </p>
        </div>
      )}

      {/* ── Hero ── */}
      {!embedded && (
        <div className="relative overflow-hidden border-b border-border bg-primary/5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="pointer-events-none absolute -top-20 right-0 size-72 rounded-full bg-primary opacity-10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-cyan-400 opacity-10 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-6 py-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[12px] font-semibold text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              We&apos;re hiring
            </div>
            <h1 className="mt-2 text-[38px] font-bold tracking-tight">
              Build your career with us
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Explore open opportunities and find a role where you can grow,
              collaborate, and make an impact.
            </p>
            {!isLoading && (
              <p className="mt-3 text-[13px] font-semibold text-primary">
                {openJobs.length} open position
                {openJobs.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div
        className={cn(
          "z-30 border-b border-border",
          embedded
            ? "bg-card"
            : "sticky top-16.25 bg-background/80 backdrop-blur-md"
        )}
      >
        <div
          className={cn("py-3", embedded ? "px-6" : "mx-auto max-w-6xl px-6")}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div
              data-tour="careers-search"
              className="relative min-w-50 flex-1"
            >
              <HugeiconsIcon
                icon={Search01Icon}
                size={13}
                strokeWidth={2}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="h-9 pl-8 text-[13px]"
                placeholder="Search roles, departments, locations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              data-tour="careers-filters"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setFilterDept("")
                  setFilterType("")
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Job list ── */}
      <main
        className={cn(
          "w-full flex-1 px-6",
          embedded ? "py-6" : "mx-auto max-w-6xl py-10"
        )}
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={Briefcase01Icon}
                size={24}
                strokeWidth={1.5}
                className="text-muted-foreground/60"
              />
            </div>
            <p className="text-[15px] font-semibold">
              Unable to load positions
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Please try again later.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={Briefcase01Icon}
                size={24}
                strokeWidth={1.5}
                className="text-muted-foreground/60"
              />
            </div>
            <p className="text-[15px] font-semibold">
              {hasFilters
                ? "No positions match your filters"
                : "No open positions right now"}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {hasFilters
                ? "Try adjusting your search or filters."
                : "Check back soon — we're always growing."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setFilterDept("")
                  setFilterType("")
                }}
                className="mt-4 text-[13px] font-medium text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[12px] text-muted-foreground">
                {filtered.length} position{filtered.length !== 1 ? "s" : ""}
                {hasFilters && ` matching your filters`}
              </p>
            </div>
            <div className="space-y-3">
              {filtered.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  embedded={embedded}
                  application={applicationByJob.get(job.id) ?? null}
                  onDetails={() => router.push(detailsHref(job))}
                  onApply={() => setApplyJob(job)}
                  onApplyAuth={() => {
                    if (embedded || isApplicant) {
                      setApplyJob(job)
                      // If the onboarding tour is on the Apply step, advance to the
                      // form step once the modal has mounted (the delay lets the
                      // [data-tour="apply-submit"] anchor render first).
                      if (isNextStepVisible) {
                        setCurrentStep(currentStep + 1, 250)
                      }
                    } else {
                      setPromptJob(job)
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      {!embedded && (
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-[12px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <Logo showText={false} size="sm" />
              <span>
                &copy; {new Date().getFullYear()} WorkOS. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-5">
              <Link
                href={slugHref("/login")}
                className="transition-colors hover:text-foreground"
              >
                Employee login
              </Link>
              <a href="#" className="transition-colors hover:text-foreground">
                Privacy
              </a>
              <a href="#" className="transition-colors hover:text-foreground">
                Terms
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* ── Apply modal ── */}
      {applyJob && (
        <ApplyModal
          job={applyJob}
          onClose={() => {
            setApplyJob(null)
            // Refresh the applied-jobs map so the card flips to "Applied".
            queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.mine })
          }}
        />
      )}

      {promptJob && (
        <SignUpPromptModal
          job={promptJob}
          onClose={() => setPromptJob(null)}
          onQuickApply={() => {
            setApplyJob(promptJob)
            setPromptJob(null)
          }}
        />
      )}
    </div>
  )
}
