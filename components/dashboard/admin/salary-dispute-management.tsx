"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Coins01Icon,
  Search01Icon,
  EyeIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  UserCircleIcon,
  File01Icon,
  Clock01Icon,
  Alert01Icon,
  MessageQuestionIcon,
  ArrowRight01Icon,
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
  useAllSalaryDisputes,
  useMarkDisputeUnderReview,
  useRequestDisputeDocuments,
  useApproveSalaryDispute,
  useRejectSalaryDispute,
  useCloseSalaryDispute,
} from "@/hooks/use-salary-dispute"
import {
  DISPUTE_CATEGORY_LABEL,
  DISPUTE_CATEGORY_COLOR,
  type SalaryDispute,
  type DisputeStatus,
} from "@/lib/salary-dispute-api"

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  DisputeStatus,
  "amber" | "green" | "red" | "blue" | "purple" | "gray"
> = {
  DRAFT: "gray",
  PENDING: "amber",
  UNDER_REVIEW: "blue",
  PENDING_DOCUMENTS: "purple",
  APPROVED: "green",
  REJECTED: "red",
  CLOSED: "gray",
}

const STATUS_LABEL: Record<DisputeStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  PENDING_DOCUMENTS: "Docs Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLOSED: "Closed",
}

const STATUS_FILTERS: { label: string; value?: DisputeStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Docs Requested", value: "PENDING_DOCUMENTS" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
]

type ReviewMode =
  | "view"
  | "review"
  | "request-docs"
  | "approve"
  | "reject"
  | "close"

function fmtPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
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

function ReviewModal({
  dispute,
  mode,
  onClose,
}: {
  dispute: SalaryDispute
  mode: ReviewMode
  onClose: () => void
}) {
  const [notes, setNotes] = useState(dispute.resolutionNotes ?? "")

  const underReviewMutation = useMarkDisputeUnderReview()
  const requestDocsMutation = useRequestDisputeDocuments()
  const approveMutation = useApproveSalaryDispute()
  const rejectMutation = useRejectSalaryDispute()
  const closeMutation = useCloseSalaryDispute()

  const busy =
    underReviewMutation.isPending ||
    requestDocsMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    closeMutation.isPending

  function handleSubmit() {
    const p = { id: dispute.id, resolutionNotes: notes || null }
    if (mode === "review") underReviewMutation.mutate(p, { onSuccess: onClose })
    else if (mode === "request-docs")
      requestDocsMutation.mutate(
        { id: dispute.id, resolutionNotes: notes },
        { onSuccess: onClose }
      )
    else if (mode === "approve")
      approveMutation.mutate(p, { onSuccess: onClose })
    else if (mode === "reject") rejectMutation.mutate(p, { onSuccess: onClose })
    else if (mode === "close") closeMutation.mutate(p, { onSuccess: onClose })
  }

  const titleMap: Record<ReviewMode, string> = {
    view: "Dispute Details",
    review: "Mark Under Review",
    "request-docs": "Request Documents",
    approve: "Approve Dispute",
    reject: "Reject Dispute",
    close: "Close Dispute",
  }

  const notesPlaceholder: Partial<Record<ReviewMode, string>> = {
    review: "Internal notes on the review process…",
    "request-docs": "Specify which documents are required (required)…",
    approve: "Resolution summary and adjustment details…",
    reject: "Reason for rejection (shown to employee)…",
    close: "Closing remarks…",
  }

  const isNotesRequired = mode === "request-docs"

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "approve" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-green-100">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={13}
                  strokeWidth={2}
                  className="text-green-600"
                />
              </span>
            )}
            {mode === "reject" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-red-100">
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={13}
                  strokeWidth={2}
                  className="text-red-500"
                />
              </span>
            )}
            {mode === "request-docs" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-purple-100">
                <HugeiconsIcon
                  icon={MessageQuestionIcon}
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
          {/* Employee + status */}
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
                {dispute.userName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {dispute.userEmail}
              </p>
            </div>
            <StatusBadge
              variant={STATUS_VARIANT[dispute.status]}
              className="shrink-0"
            >
              {STATUS_LABEL[dispute.status]}
            </StatusBadge>
          </div>

          {/* Period + category */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Payroll Period</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {dispute.payrollPeriod}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Release Date</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {fmtDate(dispute.salaryReleaseDate)}
              </p>
            </div>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Category</span>
            <StatusBadge
              variant={DISPUTE_CATEGORY_COLOR[dispute.disputeCategory]}
              dot={false}
            >
              {DISPUTE_CATEGORY_LABEL[dispute.disputeCategory]}
            </StatusBadge>
          </div>

          {/* Amount breakdown */}
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Amount Comparison
            </p>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Expected</span>
              <span className="font-semibold text-foreground tabular-nums">
                {fmtPeso(dispute.expectedAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Received</span>
              <span className="font-semibold text-foreground tabular-nums">
                {fmtPeso(dispute.receivedAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] dark:border-red-800/40 dark:bg-red-900/10">
              <span className="font-medium text-red-600">Discrepancy</span>
              <span className="font-bold text-red-600 tabular-nums">
                {fmtPeso(dispute.discrepancyAmount)}
              </span>
            </div>
          </div>

          {/* Employee reason */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Employee Explanation
            </p>
            <p className="text-[12px] text-foreground italic">
              &ldquo;{dispute.reason}&rdquo;
            </p>
          </div>

          {/* Attachments */}
          {dispute.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments ({dispute.attachmentUrls.length})
              </p>
              {dispute.attachmentUrls.map((url, i) => (
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
            Filed {fmtDateTime(dispute.createdAt)}
          </p>

          {/* Notes input */}
          {mode !== "view" && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label className="text-[12px]">
                Resolution Notes{" "}
                {isNotesRequired ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Textarea
                className="min-h-[72px] resize-none text-[13px]"
                placeholder={notesPlaceholder[mode] ?? "Add notes…"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* Existing notes view mode */}
          {mode === "view" && dispute.resolutionNotes && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                Payroll / HR Notes
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">
                {dispute.resolutionNotes}
              </p>
              {dispute.reviewedByName && (
                <p className="mt-1 text-[11px] text-blue-500">
                  — {dispute.reviewedByName}
                  {dispute.reviewedAt
                    ? `, ${fmtDateTime(dispute.reviewedAt)}`
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
          {mode === "review" && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? "Updating…" : "Mark Under Review"}
            </Button>
          )}
          {mode === "request-docs" && (
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={busy || !notes.trim()}
              onClick={handleSubmit}
            >
              {busy ? "Sending…" : "Request Documents"}
            </Button>
          )}
          {mode === "approve" && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? "Approving…" : "Approve & Create Adjustment"}
            </Button>
          )}
          {mode === "reject" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? "Rejecting…" : "Reject Dispute"}
            </Button>
          )}
          {mode === "close" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? "Closing…" : "Close Dispute"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function SalaryDisputeManagementSection() {
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | undefined>(
    "PENDING"
  )
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [reviewTarget, setReviewTarget] = useState<{
    dispute: SalaryDispute
    mode: ReviewMode
  } | null>(null)

  const q = useAllSalaryDisputes({
    status: statusFilter,
    search: search || undefined,
    page,
    size: 20,
  })

  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const summaryQ = useAllSalaryDisputes({ size: 200 })
  const allItems = summaryQ.data?.content ?? []
  const summaryCounts = {
    total: allItems.length,
    pending: allItems.filter((r) => r.status === "PENDING").length,
    underReview: allItems.filter(
      (r) => r.status === "UNDER_REVIEW" || r.status === "PENDING_DOCUMENTS"
    ).length,
    totalOpenDiscrepancy: allItems
      .filter(
        (r) =>
          r.status !== "REJECTED" &&
          r.status !== "CLOSED" &&
          r.status !== "APPROVED"
      )
      .reduce((s, r) => s + r.discrepancyAmount, 0),
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[16px] font-bold text-foreground">
          Salary Disputes
        </h1>
        <p className="text-[12px] text-muted-foreground">
          Review and resolve employee payroll dispute requests
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Disputes"
          value={summaryCounts.total}
          meta="All time"
          accent="blue"
          icon={
            <HugeiconsIcon icon={Coins01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Pending"
          value={<span className="text-warning">{summaryCounts.pending}</span>}
          meta="Awaiting initial review"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Under Review"
          value={
            <span className="text-blue-500">{summaryCounts.underReview}</span>
          }
          meta="Being processed"
          accent="blue"
          icon={
            <HugeiconsIcon icon={Coins01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Open Discrepancy"
          value={
            summaryCounts.totalOpenDiscrepancy > 0 ? (
              <>
                ₱{(summaryCounts.totalOpenDiscrepancy / 1000).toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">
                  K
                </span>
              </>
            ) : (
              <span className="text-success">₱0</span>
            )
          }
          meta="Total unresolved amount"
          accent={summaryCounts.totalOpenDiscrepancy > 0 ? "red" : "green"}
          icon={
            <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-48 flex-1">
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
          <div className="flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
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
                "Period",
                "Category",
                "Expected",
                "Received",
                "Discrepancy",
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
                        <Skeleton className="h-3 w-16" />
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
                      icon={Coins01Icon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No salary disputes found.</p>
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

                  {/* Period */}
                  <TableCell>
                    <p className="text-[12px] font-medium text-foreground">
                      {r.payrollPeriod}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Released {fmtDate(r.salaryReleaseDate)}
                    </p>
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <StatusBadge
                      variant={DISPUTE_CATEGORY_COLOR[r.disputeCategory]}
                      dot={false}
                    >
                      {DISPUTE_CATEGORY_LABEL[r.disputeCategory]}
                    </StatusBadge>
                  </TableCell>

                  {/* Expected */}
                  <TableCell className="text-[12px] text-foreground tabular-nums">
                    {fmtPeso(r.expectedAmount)}
                  </TableCell>

                  {/* Received */}
                  <TableCell className="text-[12px] text-foreground tabular-nums">
                    {fmtPeso(r.receivedAmount)}
                  </TableCell>

                  {/* Discrepancy */}
                  <TableCell>
                    <span className="text-[13px] font-bold text-danger tabular-nums">
                      {fmtPeso(r.discrepancyAmount)}
                    </span>
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
                      {/* View always available */}
                      <Button
                        size="icon-xs"
                        variant="outline"
                        onClick={() =>
                          setReviewTarget({ dispute: r, mode: "view" })
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

                      {/* Mark under review (from PENDING) */}
                      {r.status === "PENDING" && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:hover:bg-blue-900/20"
                          onClick={() =>
                            setReviewTarget({ dispute: r, mode: "review" })
                          }
                          title="Mark under review"
                        >
                          <HugeiconsIcon
                            icon={Coins01Icon}
                            size={12}
                            strokeWidth={2}
                          />
                          <span className="sr-only">Review</span>
                        </Button>
                      )}

                      {/* Request documents */}
                      {(r.status === "PENDING" ||
                        r.status === "UNDER_REVIEW") && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-purple-200 text-purple-500 hover:bg-purple-50 dark:border-purple-900/40 dark:hover:bg-purple-900/20"
                          onClick={() =>
                            setReviewTarget({
                              dispute: r,
                              mode: "request-docs",
                            })
                          }
                          title="Request documents"
                        >
                          <HugeiconsIcon
                            icon={MessageQuestionIcon}
                            size={12}
                            strokeWidth={2}
                          />
                          <span className="sr-only">Request docs</span>
                        </Button>
                      )}

                      {/* Approve */}
                      {(r.status === "PENDING" ||
                        r.status === "UNDER_REVIEW" ||
                        r.status === "PENDING_DOCUMENTS") && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20"
                          onClick={() =>
                            setReviewTarget({ dispute: r, mode: "approve" })
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
                      )}

                      {/* Reject */}
                      {(r.status === "PENDING" ||
                        r.status === "UNDER_REVIEW" ||
                        r.status === "PENDING_DOCUMENTS") && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                          onClick={() =>
                            setReviewTarget({ dispute: r, mode: "reject" })
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
          dispute={reviewTarget.dispute}
          mode={reviewTarget.mode}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  )
}
