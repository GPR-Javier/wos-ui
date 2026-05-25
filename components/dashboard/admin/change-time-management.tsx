"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Clock01Icon,
  Search01Icon,
  EyeIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  UserCircleIcon,
  File01Icon,
  ArrowLeft02Icon,
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
import { cn } from "@/lib/utils"
import {
  useAllChangeTimeRequests,
  useApproveChangeTimeRequest,
  useRejectChangeTimeRequest,
  useReturnChangeTimeRequest,
} from "@/hooks/use-change-time"
import type {
  ChangeTimeRequest,
  ChangeTimeStatus,
  ChangeTimeRequestType,
} from "@/lib/change-time-api"

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  ChangeTimeStatus,
  "amber" | "green" | "red" | "blue" | "gray" | "purple"
> = {
  DRAFT: "gray",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  RETURNED: "purple",
  CANCELLED: "gray",
}

const STATUS_LABEL: Record<ChangeTimeStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
}

const REQUEST_TYPE_LABEL: Record<ChangeTimeRequestType, string> = {
  TIME_IN: "Change Time-In",
  TIME_OUT: "Change Time-Out",
  BOTH: "Change Both",
}

const REQUEST_TYPE_SHORT: Record<ChangeTimeRequestType, string> = {
  TIME_IN: "Time-In",
  TIME_OUT: "Time-Out",
  BOTH: "Both",
}

const STATUS_FILTERS: { label: string; value?: ChangeTimeStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
]

function fmt12(time: string | null | undefined) {
  if (!time) return "—"
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

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

// ── Review Modal ─────────────────────────────────────────────────────────────

type ReviewMode = "view" | "approve" | "reject" | "return"

function ReviewModal({
  request,
  mode,
  onClose,
}: {
  request: ChangeTimeRequest
  mode: ReviewMode
  onClose: () => void
}) {
  const [reviewNote, setReviewNote] = useState("")
  const approveMutation = useApproveChangeTimeRequest()
  const rejectMutation = useRejectChangeTimeRequest()
  const returnMutation = useReturnChangeTimeRequest()

  const busy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    returnMutation.isPending

  function handleSubmit() {
    if (mode === "approve") {
      approveMutation.mutate(
        { id: request.id, reviewNote: reviewNote || null },
        { onSuccess: onClose }
      )
    } else if (mode === "reject") {
      rejectMutation.mutate(
        { id: request.id, reviewNote: reviewNote || null },
        { onSuccess: onClose }
      )
    } else if (mode === "return") {
      returnMutation.mutate(
        { id: request.id, reviewNote },
        { onSuccess: onClose }
      )
    }
  }

  const titleMap: Record<ReviewMode, string> = {
    view: "Request Details",
    approve: "Approve Request",
    reject: "Reject Request",
    return: "Return for Revision",
  }

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
              <span className="flex size-6 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                <HugeiconsIcon
                  icon={ArrowLeft02Icon}
                  size={13}
                  strokeWidth={2}
                  className="text-purple-500"
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
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {request.userName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {request.userEmail}
              </p>
            </div>
            <StatusBadge
              variant={STATUS_VARIANT[request.status]}
              className="ml-auto shrink-0"
            >
              {STATUS_LABEL[request.status]}
            </StatusBadge>
          </div>

          {/* Request meta */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Attendance Date</p>
              <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                {fmtDate(request.attendanceDate)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Request Type</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {REQUEST_TYPE_LABEL[request.requestType]}
              </p>
            </div>
          </div>

          {/* Time comparison */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Time Comparison
            </p>
            {(request.requestType === "TIME_IN" ||
              request.requestType === "BOTH") && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-[12px]">
                <span className="w-14 text-muted-foreground">Time-In</span>
                <span className="tabular-nums text-foreground">
                  {fmt12(request.currentTimeIn)}
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={12}
                  strokeWidth={2}
                  className="text-muted-foreground"
                />
                <span className="font-bold tabular-nums text-primary">
                  {fmt12(request.requestedTimeIn)}
                </span>
              </div>
            )}
            {(request.requestType === "TIME_OUT" ||
              request.requestType === "BOTH") && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-[12px]">
                <span className="w-14 text-muted-foreground">Time-Out</span>
                <span className="tabular-nums text-foreground">
                  {fmt12(request.currentTimeOut)}
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={12}
                  strokeWidth={2}
                  className="text-muted-foreground"
                />
                <span className="font-bold tabular-nums text-primary">
                  {fmt12(request.requestedTimeOut)}
                </span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Employee Reason
            </p>
            <p className="text-[12px] italic text-foreground">
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

          {/* Filed date */}
          <p className="text-[11px] text-muted-foreground">
            Filed {fmtDateTime(request.createdAt)}
          </p>

          {/* Review note input */}
          {mode !== "view" && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label className="text-[12px]">
                Admin Remarks{" "}
                {mode === "return" ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Textarea
                className="min-h-[72px] resize-none text-[13px]"
                placeholder={
                  mode === "approve"
                    ? "Note to employee (optional)…"
                    : mode === "reject"
                      ? "Reason for rejection (optional)…"
                      : "Explain what needs to be revised (required)…"
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
          )}

          {/* Existing review note (view mode) */}
          {mode === "view" && request.reviewNote && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                Admin Remarks
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">
                {request.reviewNote}
              </p>
              {request.reviewedByName && (
                <p className="mt-1 text-[11px] text-blue-500">
                  — {request.reviewedByName}
                  {request.reviewedAt
                    ? `, ${fmtDateTime(request.reviewedAt)}`
                    : ""}
                </p>
              )}
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
              {busy ? "Approving…" : "Approve"}
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
              className="bg-purple-600 hover:bg-purple-700"
              disabled={busy || !reviewNote.trim()}
              onClick={handleSubmit}
            >
              {busy ? "Returning…" : "Return for Revision"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ChangeTimeManagementSection() {
  const [statusFilter, setStatusFilter] = useState<ChangeTimeStatus | undefined>(
    "PENDING"
  )
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [reviewTarget, setReviewTarget] = useState<{
    req: ChangeTimeRequest
    mode: ReviewMode
  } | null>(null)

  const q = useAllChangeTimeRequests({
    status: statusFilter,
    search: search || undefined,
    page,
    size: 20,
  })

  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const allQ = useAllChangeTimeRequests({ size: 100 })
  const allItems = allQ.data?.content ?? []
  const summaryCounts = {
    total: allItems.length,
    pending: allItems.filter((r) => r.status === "PENDING").length,
    approved: allItems.filter((r) => r.status === "APPROVED").length,
    rejected: allItems.filter((r) => r.status === "REJECTED").length,
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[16px] font-bold text-foreground">
          Change Time In / Time Out
        </h1>
        <p className="text-[12px] text-muted-foreground">
          Review and act on employee time correction requests
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={summaryCounts.total}
          meta="All time"
          accent="blue"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Pending"
          value={<span className="text-warning">{summaryCounts.pending}</span>}
          meta="Awaiting review"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Approved"
          value={
            <span className="text-success">{summaryCounts.approved}</span>
          }
          meta="Attendance updated"
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
          title="Rejected"
          value={
            <span className="text-danger">{summaryCounts.rejected}</span>
          }
          meta="Closed without update"
          accent="red"
          icon={
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative flex-1 min-w-48">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              strokeWidth={2}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-9 pl-9 text-[13px]"
              placeholder="Search by employee name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setStatusFilter(f.value)
                  setPage(0)
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  statusFilter === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                {f.value === "PENDING" && summaryCounts.pending > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {summaryCounts.pending}
                  </span>
                )}
              </button>
            ))}
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
                "Current Time",
                "Requested Time",
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
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-3 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon
                      icon={Clock01Icon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No requests found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
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
                  <TableCell className="text-[12px] tabular-nums text-foreground">
                    {fmtDate(r.attendanceDate)}
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <StatusBadge variant="blue" dot={false}>
                      {REQUEST_TYPE_SHORT[r.requestType]}
                    </StatusBadge>
                  </TableCell>

                  {/* Current time */}
                  <TableCell>
                    <div className="space-y-0.5 text-[12px] text-muted-foreground tabular-nums">
                      {(r.requestType === "TIME_IN" ||
                        r.requestType === "BOTH") && (
                        <p>In: {fmt12(r.currentTimeIn)}</p>
                      )}
                      {(r.requestType === "TIME_OUT" ||
                        r.requestType === "BOTH") && (
                        <p>Out: {fmt12(r.currentTimeOut)}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Requested time */}
                  <TableCell>
                    <div className="space-y-0.5 text-[12px] font-semibold text-primary tabular-nums">
                      {(r.requestType === "TIME_IN" ||
                        r.requestType === "BOTH") && (
                        <p>In: {fmt12(r.requestedTimeIn)}</p>
                      )}
                      {(r.requestType === "TIME_OUT" ||
                        r.requestType === "BOTH") && (
                        <p>Out: {fmt12(r.requestedTimeOut)}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Reason */}
                  <TableCell className="max-w-[160px]">
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
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="outline"
                        onClick={() =>
                          setReviewTarget({ req: r, mode: "view" })
                        }
                        title="View details"
                      >
                        <HugeiconsIcon
                          icon={EyeIcon}
                          size={12}
                          strokeWidth={2}
                        />
                        <span className="sr-only">View</span>
                      </Button>

                      {r.status === "PENDING" && (
                        <>
                          <Button
                            size="icon-xs"
                            variant="outline"
                            className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20"
                            onClick={() =>
                              setReviewTarget({ req: r, mode: "approve" })
                            }
                            title="Approve"
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
                            className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                            onClick={() =>
                              setReviewTarget({ req: r, mode: "reject" })
                            }
                            title="Reject"
                          >
                            <HugeiconsIcon
                              icon={Cancel01Icon}
                              size={12}
                              strokeWidth={2}
                            />
                            <span className="sr-only">Reject</span>
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="outline"
                            className="border-purple-200 text-purple-500 hover:bg-purple-50 dark:border-purple-900/40 dark:hover:bg-purple-900/20"
                            onClick={() =>
                              setReviewTarget({ req: r, mode: "return" })
                            }
                            title="Return for revision"
                          >
                            <HugeiconsIcon
                              icon={ArrowLeft02Icon}
                              size={12}
                              strokeWidth={2}
                            />
                            <span className="sr-only">Return</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="border-t border-border p-4">
            <TablePagination
              page={page + 1}
              totalPages={totalPages}
              total={total}
              pageSize={20}
              setPage={(p) => setPage(p - 1)}
              setPageSize={() => {}}
            />
          </div>
        )}
      </div>

      {/* ── Review Modal ── */}
      {reviewTarget && (
        <ReviewModal
          request={reviewTarget.req}
          mode={reviewTarget.mode}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  )
}
