"use client"

import { useState, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Coins01Icon,
  Add01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  File01Icon,
  Delete01Icon,
  DocumentAttachmentIcon,
  InformationCircleIcon,
  Alert01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  useMySalaryDisputes,
  useCreateSalaryDispute,
  useCancelSalaryDispute,
} from "@/hooks/use-salary-dispute"
import {
  DISPUTE_CATEGORIES,
  DISPUTE_CATEGORY_LABEL,
  DISPUTE_CATEGORY_COLOR,
  type SalaryDispute,
  type DisputeStatus,
  type DisputeCategory,
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
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Draft", value: "DRAFT" },
]

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

// ── Status timeline step indicator ─────────────────────────────────────────

const STATUS_FLOW: DisputeStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "PENDING_DOCUMENTS",
  "APPROVED",
]

function StatusTimeline({ status }: { status: DisputeStatus }) {
  if (status === "DRAFT" || status === "REJECTED" || status === "CLOSED")
    return null
  const currentIdx = STATUS_FLOW.indexOf(status)
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {STATUS_FLOW.map((s, i) => {
        const isPast = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-semibold whitespace-nowrap",
                isCurrent && "bg-primary text-primary-foreground",
                isPast &&
                  "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                !isCurrent && !isPast && "bg-muted text-muted-foreground"
              )}
            >
              {STATUS_LABEL[s]}
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={10}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground/40"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Request Form Dialog ─────────────────────────────────────────────────────

interface RequestFormProps {
  open: boolean
  onClose: () => void
}

function RequestFormDialog({ open, onClose }: RequestFormProps) {
  const today = new Date().toISOString().split("T")[0]

  const [payrollPeriod, setPayrollPeriod] = useState("")
  const [salaryReleaseDate, setSalaryReleaseDate] = useState("")
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory | "">(
    ""
  )
  const [expectedAmount, setExpectedAmount] = useState("")
  const [receivedAmount, setReceivedAmount] = useState("")
  const [reason, setReason] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])

  const createMutation = useCreateSalaryDispute()

  const expectedNum = parseFloat(expectedAmount) || 0
  const receivedNum = parseFloat(receivedAmount) || 0
  const discrepancy = expectedNum - receivedNum

  function resetForm() {
    setPayrollPeriod("")
    setSalaryReleaseDate("")
    setDisputeCategory("")
    setExpectedAmount("")
    setReceivedAmount("")
    setReason("")
    setAttachments([])
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function handleSubmit(isDraft: boolean) {
    if (!disputeCategory) return
    createMutation.mutate(
      {
        payrollPeriod,
        salaryReleaseDate,
        disputeCategory,
        expectedAmount: expectedNum,
        receivedAmount: receivedNum,
        reason,
        isDraft,
      },
      { onSuccess: handleClose }
    )
  }

  const canSubmit =
    payrollPeriod.trim() !== "" &&
    salaryReleaseDate !== "" &&
    disputeCategory !== "" &&
    expectedAmount !== "" &&
    receivedAmount !== "" &&
    reason.trim() !== ""

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
              <HugeiconsIcon
                icon={Coins01Icon}
                size={14}
                strokeWidth={1.8}
                className="text-red-600 dark:text-red-400"
              />
            </div>
            File Salary Dispute
          </DialogTitle>
          <DialogDescription>
            Submit a payroll dispute for HR / Payroll review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payroll period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Payroll Period <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. May 1–15, 2025"
                value={payrollPeriod}
                onChange={(e) => setPayrollPeriod(e.target.value)}
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Salary Release Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                max={today}
                value={salaryReleaseDate}
                onChange={(e) => setSalaryReleaseDate(e.target.value)}
                className="h-9 text-[13px]"
              />
            </div>
          </div>

          {/* Dispute category */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Dispute Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={disputeCategory}
              onValueChange={(v) => setDisputeCategory(v as DisputeCategory)}
            >
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-[13px]">
                    {DISPUTE_CATEGORY_LABEL[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount comparison */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Amount Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">
                  Expected Amount <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-muted-foreground">
                    ₱
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="h-9 pl-6 text-[13px] tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">
                  Received Amount <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-muted-foreground">
                    ₱
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="h-9 pl-6 text-[13px] tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Live discrepancy preview */}
            {expectedNum > 0 && receivedNum > 0 && (
              <div
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-[12px]",
                  discrepancy > 0
                    ? "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/10"
                    : "border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10"
                )}
              >
                <span
                  className={cn(
                    "font-medium",
                    discrepancy > 0 ? "text-red-600" : "text-green-600"
                  )}
                >
                  {discrepancy > 0 ? "Discrepancy" : "No discrepancy"}
                </span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    discrepancy > 0 ? "text-red-600" : "text-green-600"
                  )}
                >
                  {discrepancy > 0
                    ? `−${fmtPeso(discrepancy)}`
                    : "✓ Amounts match"}
                </span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Detailed Explanation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Explain the discrepancy in detail — include relevant dates, amounts, and any references to payslip items…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] resize-none text-[13px]"
            />
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Supporting Documents{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
              <HugeiconsIcon
                icon={DocumentAttachmentIcon}
                size={20}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
              <p className="text-[12px] text-muted-foreground">
                Drop files or{" "}
                <span className="font-medium text-primary">browse</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Payslip, screenshot, attendance proof, OT approval
              </p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files)
                    setAttachments((prev) => [
                      ...prev,
                      ...Array.from(e.target.files!),
                    ])
                }}
              />
            </label>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[12px]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={13}
                        strokeWidth={1.8}
                        className="shrink-0 text-muted-foreground"
                      />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="ml-2 shrink-0 text-muted-foreground hover:text-red-500"
                    >
                      <HugeiconsIcon
                        icon={Delete01Icon}
                        size={12}
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Disputes must be filed within the allowed payroll dispute period.
              Approved adjustments will be reflected in the next payroll cycle.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={createMutation.isPending}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={
              !payrollPeriod.trim() ||
              !reason.trim() ||
              createMutation.isPending
            }
            onClick={() => handleSubmit(true)}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => handleSubmit(false)}
          >
            {createMutation.isPending ? "Submitting…" : "Submit Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Dialog ───────────────────────────────────────────────────────────

function DetailDialog({
  dispute,
  onClose,
}: {
  dispute: SalaryDispute
  onClose: () => void
}) {
  const cancelMutation = useCancelSalaryDispute()
  const canCancel = dispute.status === "PENDING" || dispute.status === "DRAFT"

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dispute Detail</DialogTitle>
          <DialogDescription>
            {DISPUTE_CATEGORY_LABEL[dispute.disputeCategory]} ·{" "}
            {dispute.payrollPeriod}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status + timeline */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">Status</span>
              <StatusBadge variant={STATUS_VARIANT[dispute.status]}>
                {STATUS_LABEL[dispute.status]}
              </StatusBadge>
            </div>
            <StatusTimeline status={dispute.status} />
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
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-[12px]">
            <span className="text-muted-foreground">Category</span>
            <StatusBadge
              variant={DISPUTE_CATEGORY_COLOR[dispute.disputeCategory]}
              dot={false}
            >
              {DISPUTE_CATEGORY_LABEL[dispute.disputeCategory]}
            </StatusBadge>
          </div>

          {/* Amount comparison */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Amount Breakdown
            </p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expected</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fmtPeso(dispute.expectedAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Received</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fmtPeso(dispute.receivedAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 dark:border-red-800/40 dark:bg-red-900/10">
                <span className="font-medium text-red-600">Discrepancy</span>
                <span className="font-bold text-red-600 tabular-nums">
                  {fmtPeso(dispute.discrepancyAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Explanation
            </p>
            <p className="text-[12px] text-foreground">{dispute.reason}</p>
          </div>

          {/* Resolution notes */}
          {dispute.resolutionNotes && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                Payroll / HR Response
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

          {/* Attachments */}
          {dispute.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments
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
                  Attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Filed {fmtDateTime(dispute.createdAt)}
          </p>
        </div>

        <DialogFooter className="gap-2">
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
              disabled={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate(dispute.id, { onSuccess: onClose })
              }
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel Dispute"}
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

// ── Main Component ──────────────────────────────────────────────────────────

export function MySalaryDisputeSection() {
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | undefined>(
    undefined
  )
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<SalaryDispute | null>(null)

  const q = useMySalaryDisputes({ status: statusFilter, page, size: 20 })
  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const counts = {
    pending: items.filter((r) => r.status === "PENDING").length,
    underReview: items.filter((r) => r.status === "UNDER_REVIEW").length,
    approved: items.filter((r) => r.status === "APPROVED").length,
    total: items.length,
  }

  const totalDiscrepancy = items
    .filter((r) => r.status !== "REJECTED" && r.status !== "CLOSED")
    .reduce((s, r) => s + r.discrepancyAmount, 0)

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">
            Salary Disputes
          </h1>
          <p className="text-[12px] text-muted-foreground">
            File and track your payroll dispute requests
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} />
          File Dispute
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Pending"
          value={<span className="text-warning">{counts.pending}</span>}
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
            <HugeiconsIcon icon={Coins01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Approved"
          value={<span className="text-success">{counts.approved}</span>}
          meta="Adjustment applied"
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
          title="Open Discrepancy"
          value={
            totalDiscrepancy > 0 ? (
              <span className="text-lg text-danger">
                ₱{(totalDiscrepancy / 1000).toFixed(1)}K
              </span>
            ) : (
              <span className="text-success">₱0</span>
            )
          }
          meta="Total amount in dispute"
          accent={totalDiscrepancy > 0 ? "red" : "green"}
          icon={
            <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
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
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Payroll Period",
                "Category",
                "Expected",
                "Received",
                "Discrepancy",
                "Status",
                "Filed",
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
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
                        <Skeleton className="h-3 w-20" />
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
                      icon={Coins01Icon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No salary disputes found.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 gap-1.5"
                      onClick={() => setFormOpen(true)}
                    >
                      <HugeiconsIcon
                        icon={Add01Icon}
                        size={12}
                        strokeWidth={2}
                      />
                      File a dispute
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setDetail(r)}
                >
                  <TableCell>
                    <p className="text-[13px] font-medium text-foreground">
                      {r.payrollPeriod}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Released {fmtDate(r.salaryReleaseDate)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={DISPUTE_CATEGORY_COLOR[r.disputeCategory]}
                      dot={false}
                    >
                      {DISPUTE_CATEGORY_LABEL[r.disputeCategory]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-foreground tabular-nums">
                    {fmtPeso(r.expectedAmount)}
                  </TableCell>
                  <TableCell className="text-[12px] text-foreground tabular-nums">
                    {fmtPeso(r.receivedAmount)}
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] font-bold text-danger tabular-nums">
                      {fmtPeso(r.discrepancyAmount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {fmtDate(r.createdAt.split("T")[0])}
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

      {/* ── Modals ── */}
      <RequestFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      {detail && (
        <DetailDialog dispute={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
