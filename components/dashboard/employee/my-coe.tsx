"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  File01Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Clock01Icon,
  EyeIcon,
  ArrowRight01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
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
import { CoeRequestModal } from "@/components/custom/coe-request-modal"
import { cn } from "@/lib/utils"
import {
  useMyCoeRequests,
  useCancelCoeRequest,
  useDownloadCoeDocument,
} from "@/hooks/use-coe"
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

// ── Constants ─────────────────────────────────────────────────────────────────

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
  { label: "Approved", value: "APPROVED" },
  { label: "Released", value: "RELEASED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Draft", value: "DRAFT" },
]

// ── Status Timeline ───────────────────────────────────────────────────────────

const TIMELINE_STEPS: { label: string; status: CoeStatus }[] = [
  { label: "Submitted", status: "SUBMITTED" },
  { label: "Under Review", status: "PENDING_REVIEW" },
  { label: "Approved", status: "APPROVED" },
  { label: "Released", status: "RELEASED" },
]

const STATUS_ORDER: CoeStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_REVIEW",
  "APPROVED",
  "RELEASED",
  "COMPLETED",
]

function StatusTimeline({ status }: { status: CoeStatus }) {
  if (status === "REJECTED") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800/30 dark:bg-red-900/10">
        <HugeiconsIcon
          icon={Cancel01Icon}
          size={14}
          strokeWidth={2}
          className="text-red-500"
        />
        <p className="text-[12px] font-medium text-red-600">
          This request has been rejected.
        </p>
      </div>
    )
  }
  if (status === "DRAFT") return null

  const currentIdx = STATUS_ORDER.indexOf(status)

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {TIMELINE_STEPS.map((step, i) => {
        const stepIdx = STATUS_ORDER.indexOf(step.status)
        const isDone = stepIdx < currentIdx
        const isActive = stepIdx === currentIdx

        return (
          <div key={step.status} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
                isDone
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : isActive
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {isDone && (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={10}
                  strokeWidth={2}
                />
              )}
              {step.label}
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={11}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground/50"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Detail Dialog ──────────────────────────────────────────────────────────────

function DetailDialog({
  coe,
  onClose,
}: {
  coe: CoeRequest
  onClose: () => void
}) {
  const cancel = useCancelCoeRequest()
  const download = useDownloadCoeDocument()
  const canCancel = coe.status === "DRAFT" || coe.status === "SUBMITTED"
  const canDownload = COE_DOWNLOADABLE.includes(coe.status)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon
                icon={File01Icon}
                size={13}
                strokeWidth={2}
                className="text-primary"
              />
            </span>
            COE Request Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Reference & status */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-[11px] text-muted-foreground">Reference No.</p>
              <p className="text-[13px] font-semibold text-foreground">
                {coe.referenceNumber ?? "—"}
              </p>
            </div>
            <StatusBadge
              variant={STATUS_VARIANT[coe.status]}
              className="shrink-0"
            >
              {STATUS_LABEL[coe.status]}
            </StatusBadge>
          </div>

          {/* Status timeline */}
          {coe.status !== "DRAFT" && <StatusTimeline status={coe.status} />}

          {/* Fields */}
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

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Certificate Type</span>
            <StatusBadge
              variant={COE_CERT_TYPE_COLOR[coe.certificateType]}
              dot={false}
            >
              {COE_CERT_TYPE_LABEL[coe.certificateType]}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Release Method</span>
            <span className="font-medium text-foreground">
              {COE_RELEASE_METHOD_LABEL[coe.releaseMethod]}
            </span>
          </div>

          {coe.recipientName && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <p className="text-muted-foreground">Recipient / Company</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {coe.recipientName}
              </p>
            </div>
          )}

          {coe.additionalNotes && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Your Notes
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
                    icon={File01Icon}
                    size={13}
                    strokeWidth={1.8}
                  />
                  View attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          {/* Document link (released) */}
          {coe.documentUrl && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800/30 dark:bg-green-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-green-700 uppercase">
                COE Document Ready
              </p>
              <a
                href={coe.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
              >
                Download your Certificate of Employment
              </a>
            </div>
          )}

          {/* HR remarks */}
          {coe.remarks && (
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

          <p className="text-[11px] text-muted-foreground">
            Filed {fmtDate(coe.createdAt)}
          </p>
        </div>

        <DialogFooter className="gap-2">
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(coe.id, { onSuccess: onClose })}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel Request"}
            </Button>
          )}
          {canDownload && (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={download.isPending}
              onClick={() =>
                download.mutate({
                  id: coe.id,
                  filename: `${coe.referenceNumber ?? "coe-" + coe.id}.pdf`,
                })
              }
            >
              <HugeiconsIcon icon={File01Icon} size={13} strokeWidth={2} />
              {download.isPending ? "Preparing…" : "Download COE (PDF)"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MyCOESection() {
  const [statusFilter, setStatusFilter] = useState<CoeStatus | undefined>(
    undefined
  )
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<CoeRequest | null>(null)

  const q = useMyCoeRequests({ status: statusFilter, page, size: 20 })
  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const summaryQ = useMyCoeRequests({ size: 200 })
  const all = summaryQ.data?.content ?? []
  const counts = {
    submitted: all.filter((r) => r.status === "SUBMITTED").length,
    underReview: all.filter((r) => r.status === "PENDING_REVIEW").length,
    released: all.filter(
      (r) => r.status === "RELEASED" || r.status === "COMPLETED"
    ).length,
    total: all.length,
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">
            Certificate of Employment
          </h1>
          <p className="text-[12px] text-muted-foreground">
            Request and track your employment certificates
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={14}
            strokeWidth={2}
            className="mr-1.5"
          />
          New Request
        </Button>
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
          meta="Ready to download"
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
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Purpose",
                "Certificate Type",
                "Release Method",
                "Date Filed",
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
                    {[0, 1, 2, 3, 4, 5].map((j) => (
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
                  colSpan={6}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFormOpen(true)}
                    >
                      File your first request
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelected(r)}
                >
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

                  {/* Date */}
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
                    <Button
                      size="icon-xs"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(r)
                      }}
                      title="View details"
                    >
                      <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                    </Button>
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

      {/* ── Dialogs ── */}
      {formOpen && (
        <CoeRequestModal open={formOpen} onClose={() => setFormOpen(false)} />
      )}
      {selected && (
        <DetailDialog coe={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
