"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ClockPlusIcon,
  Search01Icon,
  EyeIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  UserCircleIcon,
  File01Icon,
  TimeScheduleIcon,
  Clock01Icon,
  ArrowTurnBackwardIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/custom/table-pagination"
import { OvertimeBulkAuthorizeDialog } from "@/components/custom/overtime-bulk-authorize-dialog"
import { cn } from "@/lib/utils"
import {
  useAllOvertimeRequests,
  useApproveOvertimeRequest,
  useRejectOvertimeRequest,
  useAuthorizeOvertime,
  useRejectOvertimeAuthorization,
  useReturnOvertimeAuthorization,
  useApproveOvertimeClaim,
  useRejectOvertimeClaim,
  useReturnOvertimeClaim,
} from "@/hooks/use-overtime"
import {
  OT_TYPE_LABEL,
  OT_TYPE_COLOR,
  OT_RATE_MULTIPLIER,
  OT_STATUS_LABEL,
  OT_STATUS_VARIANT,
  type OvertimeRequest,
  type OvertimeStatus,
} from "@/lib/overtime-api"

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT = OT_STATUS_VARIANT
const STATUS_LABEL = OT_STATUS_LABEL

const CLAIM_STATUSES: OvertimeStatus[] = [
  "PENDING_CLAIM",
  "PENDING_EMERGENCY_CLAIM",
]

type Queue = "all" | "authorization" | "claim" | "history"

const QUEUE_TABS: { label: string; value: Queue }[] = [
  { label: "All", value: "all" },
  { label: "Authorizations", value: "authorization" },
  { label: "Claims", value: "claim" },
  { label: "History", value: "history" },
]

const PAGE_SIZE = 20

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function fmtDateTime(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function fmt12(time: string | null) {
  if (!time) return "—"
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

function fmtHours(h: number | null) {
  if (!h) return "—"
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

/** Phase 1 (authorization) requests are reviewed with authorize/return; everything else with claim review. */
function isAuthorizationReview(status: OvertimeStatus) {
  return status === "PENDING_AUTH"
}

// ── Review Modal ─────────────────────────────────────────────────────────────

type ReviewMode = "view" | "approve" | "reject" | "return"

function ReviewModal({
  request,
  mode,
  onClose,
}: {
  request: OvertimeRequest
  mode: ReviewMode
  onClose: () => void
}) {
  const [reviewNote, setReviewNote] = useState("")

  // Phase 1 vs Phase 2 review use different endpoints; the legacy PENDING falls back to the old ones.
  const isAuth = isAuthorizationReview(request.status)
  const isLegacy = request.status === "PENDING"

  const authorize = useAuthorizeOvertime()
  const rejectAuth = useRejectOvertimeAuthorization()
  const returnAuth = useReturnOvertimeAuthorization()
  const approveClaim = useApproveOvertimeClaim()
  const rejectClaim = useRejectOvertimeClaim()
  const returnClaim = useReturnOvertimeClaim()
  const legacyApprove = useApproveOvertimeRequest()
  const legacyReject = useRejectOvertimeRequest()

  const busy =
    authorize.isPending ||
    rejectAuth.isPending ||
    returnAuth.isPending ||
    approveClaim.isPending ||
    rejectClaim.isPending ||
    returnClaim.isPending ||
    legacyApprove.isPending ||
    legacyReject.isPending

  const approveLabel = isAuth ? "Authorize" : "Approve"
  const titleMap: Record<ReviewMode, string> = {
    view: "Overtime Request Details",
    approve: isAuth ? "Authorize Overtime" : "Approve Actual Hours",
    reject: isAuth ? "Reject Authorization" : "Reject Claim",
    return: "Return for Revision",
  }

  const noteRequired = mode === "return"
  const canSubmit = mode === "view" || !noteRequired || reviewNote.trim() !== ""

  function handleSubmit() {
    const note = reviewNote || null
    const args = { id: request.id, reviewNote: note }
    if (mode === "approve") {
      if (isAuth) authorize.mutate(args, { onSuccess: onClose })
      else if (isLegacy) legacyApprove.mutate(args, { onSuccess: onClose })
      else approveClaim.mutate(args, { onSuccess: onClose })
    } else if (mode === "reject") {
      if (isAuth) rejectAuth.mutate(args, { onSuccess: onClose })
      else if (isLegacy) legacyReject.mutate(args, { onSuccess: onClose })
      else rejectClaim.mutate(args, { onSuccess: onClose })
    } else if (mode === "return") {
      const ret = { id: request.id, reviewNote }
      if (isAuth) returnAuth.mutate(ret, { onSuccess: onClose })
      else returnClaim.mutate(ret, { onSuccess: onClose })
    }
  }

  const hasActual = !!request.startTime
  const timeLabel = hasActual ? "Actual Time" : "Planned Time"
  const hoursLabel = request.totalHours ? "Actual Hours" : "Estimated Hours"
  const timeValue = hasActual
    ? `${fmt12(request.startTime)} – ${fmt12(request.endTime)}`
    : `${fmt12(request.plannedStartTime)} – ${fmt12(request.plannedEndTime)}`

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "approve" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={13}
                  strokeWidth={2}
                  className="text-green-600"
                />
              </span>
            )}
            {mode === "reject" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={13}
                  strokeWidth={2}
                  className="text-red-500"
                />
              </span>
            )}
            {mode === "return" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                <HugeiconsIcon
                  icon={ArrowTurnBackwardIcon}
                  size={13}
                  strokeWidth={2}
                  className="text-amber-600"
                />
              </span>
            )}
            {titleMap[mode]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Employee info */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={UserCircleIcon}
                size={16}
                strokeWidth={1.6}
                className="text-muted-foreground"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {request.userName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {request.userEmail}
              </p>
            </div>
            <StatusBadge
              variant={STATUS_VARIANT[request.status]}
              className="shrink-0"
            >
              {STATUS_LABEL[request.status]}
            </StatusBadge>
          </div>

          {request.adminInitiated && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/10 dark:text-blue-300">
              Pre-authorized by management.
            </div>
          )}

          {/* Date + type */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Overtime Date</p>
              <p className="mt-0.5 font-semibold text-foreground tabular-nums">
                {fmtDate(request.overtimeDate)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Type</p>
              <StatusBadge
                variant={OT_TYPE_COLOR[request.overtimeType]}
                className="mt-0.5"
                dot={false}
              >
                {OT_TYPE_LABEL[request.overtimeType]}
              </StatusBadge>
            </div>
          </div>

          {/* Time + hours */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">{timeLabel}</p>
              <p className="mt-0.5 font-semibold text-foreground tabular-nums">
                {timeValue}
              </p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-primary/70">{hoursLabel}</p>
              <p className="mt-0.5 font-bold text-primary tabular-nums">
                {fmtHours(request.totalHours ?? request.plannedHours)}
              </p>
            </div>
          </div>

          {/* OT pay rate */}
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800/40 dark:bg-green-900/10">
            <HugeiconsIcon
              icon={TimeScheduleIcon}
              size={13}
              strokeWidth={1.8}
              className="shrink-0 text-green-600"
            />
            <p className="text-[12px] text-green-700 dark:text-green-400">
              Rate:{" "}
              <span className="font-bold">
                ×{OT_RATE_MULTIPLIER[request.overtimeType].toFixed(2)}
              </span>{" "}
              {isAuth
                ? "· classification confirmed at claim time."
                : "· approval syncs to payroll."}
            </p>
          </div>

          {/* Reason */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Employee Reason
            </p>
            <p className="text-[12px] text-foreground italic">
              &ldquo;{request.reason}&rdquo;
            </p>
          </div>

          {/* Attachments */}
          {request.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments ({request.attachmentUrls.length})
              </p>
              {request.attachmentUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[12px] text-primary hover:bg-muted/40"
                >
                  <HugeiconsIcon
                    icon={File01Icon}
                    size={13}
                    strokeWidth={1.8}
                  />
                  View attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Filed {fmtDateTime(request.createdAt)}
          </p>

          {/* Remarks input for approve/reject/return */}
          {mode !== "view" && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label className="text-[12px]">
                Admin Remarks{" "}
                {noteRequired ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Textarea
                className="min-h-18 resize-none text-[13px]"
                placeholder={
                  mode === "approve"
                    ? "Note to employee…"
                    : mode === "return"
                      ? "What needs to be fixed? (shown to employee)…"
                      : "Reason for rejection (shown to employee)…"
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
          )}

          {/* Existing remarks for view mode */}
          {mode === "view" && request.reviewNote && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                Admin Remarks
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">
                {request.reviewNote}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode === "approve" && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? "Saving…" : approveLabel}
            </Button>
          )}
          {mode === "reject" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? "Rejecting…" : "Reject"}
            </Button>
          )}
          {mode === "return" && (
            <Button
              size="sm"
              disabled={busy || !canSubmit}
              onClick={handleSubmit}
            >
              {busy ? "Returning…" : "Return for revision"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Action buttons for a pending row ─────────────────────────────────────────

function RowActions({
  request,
  onReview,
}: {
  request: OvertimeRequest
  onReview: (mode: ReviewMode) => void
}) {
  const isPending =
    request.status === "PENDING_AUTH" ||
    request.status === "PENDING" ||
    CLAIM_STATUSES.includes(request.status)
  const isAuth = isAuthorizationReview(request.status)
  return (
    <div className="flex justify-end gap-1">
      <Button
        size="icon-xs"
        variant="outline"
        onClick={() => onReview("view")}
        title="View details"
      >
        <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
        <span className="sr-only">View</span>
      </Button>
      {isPending && (
        <>
          <Button
            size="icon-xs"
            variant="outline"
            className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20"
            onClick={() => onReview("approve")}
            title={isAuth ? "Authorize" : "Approve"}
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={12}
              strokeWidth={2}
            />
            <span className="sr-only">Approve</span>
          </Button>
          <Button
            size="icon-xs"
            variant="outline"
            className="border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-900/40 dark:hover:bg-amber-900/20"
            onClick={() => onReview("return")}
            title="Return for revision"
          >
            <HugeiconsIcon
              icon={ArrowTurnBackwardIcon}
              size={12}
              strokeWidth={2}
            />
            <span className="sr-only">Return</span>
          </Button>
          <Button
            size="icon-xs"
            variant="outline"
            className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
            onClick={() => onReview("reject")}
            title="Reject"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
            <span className="sr-only">Reject</span>
          </Button>
        </>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function OvertimeManagementSection() {
  const [queue, setQueue] = useState<Queue>("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<{
    req: OvertimeRequest
    mode: ReviewMode
  } | null>(null)

  // Fetch a wide page once; the lifecycle queues span multiple statuses, so filter client-side.
  const q = useAllOvertimeRequests({ size: 200 })
  const allItems = useMemo(() => q.data?.content ?? [], [q.data])

  const counts = {
    pendingAuth: allItems.filter((r) => r.status === "PENDING_AUTH").length,
    pendingClaim: allItems.filter((r) => CLAIM_STATUSES.includes(r.status))
      .length,
    approved: allItems.filter((r) => r.status === "APPROVED").length,
    approvedHours: allItems
      .filter((r) => r.status === "APPROVED")
      .reduce((s, r) => s + (r.totalHours ?? 0), 0),
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allItems.filter((r) => {
      const inQueue =
        queue === "all"
          ? true
          : queue === "authorization"
            ? r.status === "PENDING_AUTH"
            : queue === "claim"
              ? CLAIM_STATUSES.includes(r.status)
              : !["PENDING_AUTH", ...CLAIM_STATUSES].includes(r.status)
      if (!inQueue) return false
      if (!term) return true
      return (
        r.userName.toLowerCase().includes(term) ||
        r.userEmail.toLowerCase().includes(term)
      )
    })
  }, [allItems, queue, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function selectQueue(next: Queue) {
    setQueue(next)
    setPage(0)
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">
            Overtime Management
          </h1>
          <p className="text-[12px] text-muted-foreground">
            Authorize overtime ahead of time, then approve the actual hours
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setBulkOpen(true)}>
          <HugeiconsIcon icon={UserGroupIcon} size={14} strokeWidth={1.8} />
          Bulk pre-authorize
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Pending authorizations"
          value={<span className="text-warning">{counts.pendingAuth}</span>}
          meta="Permission requests"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Pending claims"
          value={<span className="text-warning">{counts.pendingClaim}</span>}
          meta="Actual hours to approve"
          accent="amber"
          icon={
            <HugeiconsIcon icon={ClockPlusIcon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Approved"
          value={<span className="text-success">{counts.approved}</span>}
          meta="Synced to payroll"
          accent="green"
          icon={
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={16}
              strokeWidth={1.8}
            />
          }
        />
        <StatCard
          title="Approved Hours"
          value={
            <>
              {Math.floor(counts.approvedHours)}
              <span className="text-base font-normal text-muted-foreground">
                h
              </span>
            </>
          }
          meta="Total OT hours approved"
          accent="purple"
          icon={
            <HugeiconsIcon
              icon={TimeScheduleIcon}
              size={16}
              strokeWidth={1.8}
            />
          }
        />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {QUEUE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => selectQueue(t.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  queue === t.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                {t.value === "authorization" && counts.pendingAuth > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {counts.pendingAuth}
                  </span>
                )}
                {t.value === "claim" && counts.pendingClaim > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {counts.pendingClaim}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative ml-auto min-w-48 flex-1 sm:max-w-xs">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              strokeWidth={2}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-9 pl-9 text-[13px]"
              placeholder="Search employee…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Employee",
                "Date",
                "Type",
                "Time",
                "Hours",
                "Rate",
                "Reason",
                "Status",
                "Filed",
                "Actions",
              ].map((h) => (
                <TableHead
                  key={h}
                  className={h === "Actions" ? "text-right" : undefined}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-3 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon
                      icon={ClockPlusIcon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>Nothing in this queue.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((r) => {
                const hasActual = !!r.startTime
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    {/* Employee */}
                    <TableCell>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">
                          {r.userName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.userEmail}
                        </p>
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-[12px] text-foreground tabular-nums">
                      {fmtDate(r.overtimeDate)}
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <StatusBadge
                        variant={OT_TYPE_COLOR[r.overtimeType]}
                        dot={false}
                      >
                        {OT_TYPE_LABEL[r.overtimeType]}
                      </StatusBadge>
                    </TableCell>

                    {/* Time */}
                    <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                      {hasActual
                        ? `${fmt12(r.startTime)} – ${fmt12(r.endTime)}`
                        : `${fmt12(r.plannedStartTime)} – ${fmt12(
                            r.plannedEndTime
                          )}`}
                    </TableCell>

                    {/* Hours */}
                    <TableCell>
                      <span className="text-[13px] font-semibold text-primary tabular-nums">
                        {fmtHours(r.totalHours ?? r.plannedHours)}
                      </span>
                      {!r.totalHours && r.plannedHours ? (
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          est.
                        </span>
                      ) : null}
                    </TableCell>

                    {/* Rate multiplier */}
                    <TableCell>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-bold text-foreground tabular-nums">
                        ×{OT_RATE_MULTIPLIER[r.overtimeType].toFixed(2)}
                      </span>
                    </TableCell>

                    {/* Reason */}
                    <TableCell className="max-w-37.5">
                      <p className="truncate text-[12px] text-muted-foreground">
                        {r.reason}
                      </p>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge variant={STATUS_VARIANT[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </StatusBadge>
                    </TableCell>

                    {/* Filed */}
                    <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                      {fmtDate(r.createdAt.split("T")[0])}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <RowActions
                        request={r}
                        onReview={(mode) => setReviewTarget({ req: r, mode })}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="border-t border-border p-4">
            <TablePagination
              page={page + 1}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              setPage={(p) => setPage(p - 1)}
              setPageSize={() => {}}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {reviewTarget && (
        <ReviewModal
          request={reviewTarget.req}
          mode={reviewTarget.mode}
          onClose={() => setReviewTarget(null)}
        />
      )}
      <OvertimeBulkAuthorizeDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  )
}
