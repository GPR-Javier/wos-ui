"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  File01Icon,
  Search01Icon,
  EyeIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  UserCircleIcon,
  Clock01Icon,
  Alert01Icon,
  DocumentAttachmentIcon,
  InformationCircleIcon,
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
import {
  DateRangeFilter,
  useDateRange,
} from "@/components/custom/date-range-filter"
import { cn } from "@/lib/utils"
import {
  useAllCoeRequests,
  useMarkCoeUnderReview,
  useApproveCoeRequest,
  useRejectCoeRequest,
  useDownloadCoeDocument,
  useMyCoeSignature,
} from "@/hooks/use-coe"
import { SignaturePad } from "@/components/dashboard/applicant/signature-pad"
import {
  COE_PURPOSE_LABEL,
  COE_PURPOSE_COLOR,
  COE_CERT_TYPE_LABEL,
  COE_CERT_TYPE_COLOR,
  COE_RELEASE_METHOD_LABEL,
  COE_DOWNLOADABLE,
  type CoeRequest,
  type CoeStatus,
} from "@/lib/coe-api"

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  CoeStatus,
  "amber" | "green" | "red" | "blue" | "purple" | "gray"
> = {
  DRAFT: "gray",
  SUBMITTED: "amber",
  PENDING_REVIEW: "blue",
  APPROVED: "green",
  REJECTED: "red",
  RELEASED: "purple",
  COMPLETED: "green",
}

const STATUS_LABEL: Record<CoeStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RELEASED: "Released",
  COMPLETED: "Completed",
}

const STATUS_FILTERS: { label: string; value?: CoeStatus }[] = [
  { label: "All" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Under Review", value: "PENDING_REVIEW" },
  { label: "Released", value: "RELEASED" },
  { label: "Rejected", value: "REJECTED" },
]

type ReviewMode = "view" | "review" | "approve" | "reject"

function fmtDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  coe,
  mode,
  onClose,
}: {
  coe: CoeRequest
  mode: ReviewMode
  onClose: () => void
}) {
  const [remarks, setRemarks] = useState(coe.remarks ?? "")
  const [drawnSig, setDrawnSig] = useState<string | null>(null)

  const underReview = useMarkCoeUnderReview()
  const approve = useApproveCoeRequest()
  const reject = useRejectCoeRequest()
  const download = useDownloadCoeDocument()
  // Only the approver needs a signature — fetch their stored one when approving.
  const sigQuery = useMyCoeSignature(mode === "approve")
  const needsSignature =
    mode === "approve" && !sigQuery.isLoading && !sigQuery.data

  const busy = underReview.isPending || approve.isPending || reject.isPending

  function handleSubmit() {
    if (mode === "review")
      underReview.mutate(
        { id: coe.id, remarks: remarks || null },
        { onSuccess: onClose }
      )
    else if (mode === "approve")
      approve.mutate(
        {
          id: coe.id,
          remarks: remarks || null,
          signature: drawnSig ?? undefined,
        },
        { onSuccess: onClose }
      )
    else if (mode === "reject")
      reject.mutate(
        { id: coe.id, remarks: remarks || null },
        { onSuccess: onClose }
      )
  }

  const titleMap: Record<ReviewMode, string> = {
    view: "COE Request Details",
    review: "Mark Under Review",
    approve: "Approve & Release COE",
    reject: "Reject COE Request",
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
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
            {(mode === "view" || mode === "review") && (
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon
                  icon={File01Icon}
                  size={13}
                  strokeWidth={2}
                  className="text-primary"
                />
              </span>
            )}
            {titleMap[mode]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Employee info + status */}
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
                {coe.userName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {coe.userEmail}
              </p>
            </div>
            <StatusBadge
              variant={STATUS_VARIANT[coe.status]}
              className="shrink-0"
            >
              {STATUS_LABEL[coe.status]}
            </StatusBadge>
          </div>

          {/* Reference number */}
          {coe.referenceNumber && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">Reference No.</span>
              <span className="font-mono font-semibold text-foreground">
                {coe.referenceNumber}
              </span>
            </div>
          )}

          {/* Purpose + employment status */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Purpose</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {COE_PURPOSE_LABEL[coe.purpose]}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Employment Status</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {coe.employmentStatus === "CURRENT_EMPLOYEE"
                  ? "Current Employee"
                  : "Former Employee"}
              </p>
            </div>
          </div>

          {/* Certificate type */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Certificate Type</span>
            <StatusBadge
              variant={COE_CERT_TYPE_COLOR[coe.certificateType]}
              dot={false}
            >
              {COE_CERT_TYPE_LABEL[coe.certificateType]}
            </StatusBadge>
          </div>

          {/* Release method */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Release Method</span>
            <span className="font-medium text-foreground">
              {COE_RELEASE_METHOD_LABEL[coe.releaseMethod]}
            </span>
          </div>

          {/* Recipient */}
          {coe.recipientName && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <p className="text-muted-foreground">Recipient / Company</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {coe.recipientName}
              </p>
            </div>
          )}

          {/* Additional notes from employee */}
          {coe.additionalNotes && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Employee Notes
              </p>
              <p className="text-[12px] text-foreground italic">
                &ldquo;{coe.additionalNotes}&rdquo;
              </p>
            </div>
          )}

          {/* Attachments */}
          {coe.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments ({coe.attachmentUrls.length})
              </p>
              {coe.attachmentUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[12px] text-primary hover:bg-muted/40"
                >
                  <HugeiconsIcon
                    icon={DocumentAttachmentIcon}
                    size={13}
                    strokeWidth={1.8}
                  />
                  View attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Filed {fmtDate(coe.createdAt)}
          </p>

          {/* Salary warning for view/approve */}
          {(mode === "view" || mode === "approve" || mode === "review") &&
            (coe.certificateType === "COE_WITH_SALARY" ||
              coe.certificateType === "COE_WITH_COMPENSATION_DETAILS") && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/30 dark:bg-amber-900/10">
                <HugeiconsIcon
                  icon={InformationCircleIcon}
                  size={13}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-amber-600"
                />
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  This request includes salary information — ensure proper
                  authorization before approving.
                </p>
              </div>
            )}

          {/* Existing remarks (view mode) */}
          {mode === "view" && coe.remarks && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                HR / Admin Remarks
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">
                {coe.remarks}
              </p>
              {coe.approvedByName && (
                <p className="mt-1 text-[11px] text-blue-500">
                  — {coe.approvedByName}
                  {coe.approvedAt ? `, ${fmtDate(coe.approvedAt)}` : ""}
                </p>
              )}
            </div>
          )}

          {/* Approver signature capture — only when the reviewer has none on file yet */}
          {mode === "approve" && needsSignature && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label className="text-[12px]">
                Your signature <span className="text-red-500">*</span>
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Draw your signature — it will be saved for reuse and printed on
                the certificate.
              </p>
              <SignaturePad onChange={setDrawnSig} />
            </div>
          )}

          {/* Remarks input (non-view) */}
          {mode !== "view" && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label className="text-[12px]">
                Remarks{" "}
                {mode === "reject" ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Textarea
                className="min-h-18 resize-none text-[13px]"
                placeholder={
                  mode === "reject"
                    ? "Reason for rejection (shown to employee)…"
                    : mode === "approve"
                      ? "Approval notes or instructions for employee…"
                      : "Internal review notes…"
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
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

          {mode === "approve" && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={busy || (needsSignature && !drawnSig)}
              onClick={handleSubmit}
            >
              {busy ? "Approving…" : "Approve & Release"}
            </Button>
          )}

          {mode === "reject" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !remarks.trim()}
              onClick={handleSubmit}
            >
              {busy ? "Rejecting…" : "Reject Request"}
            </Button>
          )}

          {COE_DOWNLOADABLE.includes(coe.status) && (
            <Button
              variant="outline"
              size="sm"
              disabled={download.isPending}
              onClick={() =>
                download.mutate({
                  id: coe.id,
                  filename: `${coe.referenceNumber ?? "coe-" + coe.id}.pdf`,
                })
              }
            >
              {download.isPending ? "Preparing…" : "Download COE (PDF)"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function CoeManagementSection() {
  const [statusFilter, setStatusFilter] = useState<CoeStatus | undefined>(
    undefined
  )
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const { range, setRange } = useDateRange()
  const [reviewTarget, setReviewTarget] = useState<{
    coe: CoeRequest
    mode: ReviewMode
  } | null>(null)

  const q = useAllCoeRequests({
    status: statusFilter,
    search: search || undefined,
    from: range.from,
    to: range.until,
    page,
    size: 20,
  })

  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const summaryQ = useAllCoeRequests({
    from: range.from,
    to: range.until,
    size: 200,
  })
  const all = summaryQ.data?.content ?? []
  const counts = {
    total: all.length,
    submitted: all.filter((r) => r.status === "SUBMITTED").length,
    underReview: all.filter((r) => r.status === "PENDING_REVIEW").length,
    released: all.filter(
      (r) => r.status === "RELEASED" || r.status === "COMPLETED"
    ).length,
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[16px] font-bold text-foreground">COE Requests</h1>
        <p className="text-[12px] text-muted-foreground">
          Review and process employee certificate of employment requests
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={counts.total}
          meta="All time"
          accent="blue"
          icon={<HugeiconsIcon icon={File01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Submitted"
          value={<span className="text-warning">{counts.submitted}</span>}
          meta="Awaiting review"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Under Review"
          value={<span className="text-blue-500">{counts.underReview}</span>}
          meta="Being processed"
          accent="blue"
          icon={
            <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Released"
          value={<span className="text-success">{counts.released}</span>}
          meta="Approved & ready to download"
          accent="green"
          icon={
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
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
          <DateRangeFilter
            value={range}
            onChange={(v) => {
              setRange(v)
              setPage(0)
            }}
          />
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
                {f.value === "SUBMITTED" && counts.submitted > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {counts.submitted}
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
                "Purpose",
                "Certificate Type",
                "Release Method",
                "Filed",
                "Status",
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
                    {[0, 1, 2, 3, 4, 5, 6].map((j) => (
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
                  colSpan={7}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon
                      icon={File01Icon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No COE requests found.</p>
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

                  {/* Purpose */}
                  <TableCell>
                    <StatusBadge
                      variant={COE_PURPOSE_COLOR[r.purpose]}
                      dot={false}
                    >
                      {COE_PURPOSE_LABEL[r.purpose]}
                    </StatusBadge>
                  </TableCell>

                  {/* Certificate Type */}
                  <TableCell>
                    <StatusBadge
                      variant={COE_CERT_TYPE_COLOR[r.certificateType]}
                      dot={false}
                    >
                      {COE_CERT_TYPE_LABEL[r.certificateType]}
                    </StatusBadge>
                  </TableCell>

                  {/* Release Method */}
                  <TableCell className="text-[12px] text-muted-foreground">
                    {COE_RELEASE_METHOD_LABEL[r.releaseMethod]}
                  </TableCell>

                  {/* Filed */}
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {fmtDate(r.createdAt)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="outline"
                        onClick={() =>
                          setReviewTarget({ coe: r, mode: "view" })
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

                      {/* Mark Under Review (from SUBMITTED) */}
                      {r.status === "SUBMITTED" && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:hover:bg-blue-900/20"
                          onClick={() =>
                            setReviewTarget({ coe: r, mode: "review" })
                          }
                          title="Mark under review"
                        >
                          <HugeiconsIcon
                            icon={File01Icon}
                            size={12}
                            strokeWidth={2}
                          />
                          <span className="sr-only">Review</span>
                        </Button>
                      )}

                      {/* Approve (from SUBMITTED or PENDING_REVIEW) */}
                      {(r.status === "SUBMITTED" ||
                        r.status === "PENDING_REVIEW") && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20"
                          onClick={() =>
                            setReviewTarget({ coe: r, mode: "approve" })
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

                      {/* Reject (from SUBMITTED or PENDING_REVIEW) */}
                      {(r.status === "SUBMITTED" ||
                        r.status === "PENDING_REVIEW") && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                          onClick={() =>
                            setReviewTarget({ coe: r, mode: "reject" })
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
          coe={reviewTarget.coe}
          mode={reviewTarget.mode}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  )
}
