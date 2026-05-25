"use client"

import { useState, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ClockPlusIcon,
  Add01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  File01Icon,
  Delete01Icon,
  DocumentAttachmentIcon,
  InformationCircleIcon,
  Alert01Icon,
  TimeScheduleIcon,
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
  useMyOvertimeRequests,
  useCreateOvertimeRequest,
  useCancelOvertimeRequest,
} from "@/hooks/use-overtime"
import {
  OT_TYPE_LABEL,
  OT_TYPE_COLOR,
  OT_RATE_MULTIPLIER,
  calcHours,
  type OvertimeRequest,
  type OvertimeStatus,
  type OvertimeType,
} from "@/lib/overtime-api"

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  OvertimeStatus,
  "amber" | "green" | "red" | "gray"
> = {
  DRAFT: "gray",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "gray",
}

const STATUS_LABEL: Record<OvertimeStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

const STATUS_FILTERS: { label: string; value?: OvertimeStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Draft", value: "DRAFT" },
]

const OT_TYPES: OvertimeType[] = ["REGULAR", "REST_DAY", "HOLIDAY", "EMERGENCY"]

const OT_TYPE_DESC: Record<OvertimeType, string> = {
  REGULAR: "After regular shift hours",
  REST_DAY: "Scheduled day off work",
  HOLIDAY: "Legal or special holiday",
  EMERGENCY: "Urgent unplanned work",
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

function fmt12(time: string) {
  if (!time) return "—"
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

function fmtHours(h: number) {
  if (!h) return "—"
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

// ── Request Form Dialog ─────────────────────────────────────────────────────

interface RequestFormProps {
  open: boolean
  onClose: () => void
}

function RequestFormDialog({ open, onClose }: RequestFormProps) {
  const today = new Date().toISOString().split("T")[0]

  const [overtimeDate, setOvertimeDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [overtimeType, setOvertimeType] = useState<OvertimeType>("REGULAR")
  const [reason, setReason] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])

  const createMutation = useCreateOvertimeRequest()

  const totalHours = useMemo(
    () => calcHours(startTime, endTime),
    [startTime, endTime]
  )

  const timeError =
    startTime && endTime && totalHours <= 0
      ? "End time must be after start time."
      : null

  function resetForm() {
    setOvertimeDate("")
    setStartTime("")
    setEndTime("")
    setOvertimeType("REGULAR")
    setReason("")
    setAttachments([])
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function handleSubmit(isDraft: boolean) {
    createMutation.mutate(
      {
        overtimeDate,
        startTime,
        endTime,
        totalHours,
        overtimeType,
        reason,
        isDraft,
      },
      { onSuccess: handleClose }
    )
  }

  const canSubmit =
    overtimeDate !== "" &&
    startTime !== "" &&
    endTime !== "" &&
    totalHours > 0 &&
    reason.trim() !== ""

  const multiplier = OT_RATE_MULTIPLIER[overtimeType]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
              <HugeiconsIcon
                icon={ClockPlusIcon}
                size={14}
                strokeWidth={1.8}
                className="text-red-600 dark:text-red-400"
              />
            </div>
            File Overtime Request
          </DialogTitle>
          <DialogDescription>
            Submit an overtime request for supervisor / HR approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overtime date */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Overtime Date</Label>
            <Input
              type="date"
              value={overtimeDate}
              onChange={(e) => setOvertimeDate(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          {/* Time range */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Time Range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
            </div>

            {timeError ? (
              <p className="flex items-center gap-1.5 text-[12px] text-red-500">
                <HugeiconsIcon
                  icon={Alert01Icon}
                  size={12}
                  strokeWidth={2}
                />
                {timeError}
              </p>
            ) : totalHours > 0 ? (
              <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12px]">
                <span className="text-primary">Total Overtime Hours</span>
                <span className="font-bold tabular-nums text-primary">
                  {fmtHours(totalHours)}
                </span>
              </div>
            ) : null}
          </div>

          {/* OT type */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Overtime Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {OT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOvertimeType(type)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-all",
                    overtimeType === type
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <p
                      className={cn(
                        "text-[12px] font-semibold",
                        overtimeType === type
                          ? "text-primary"
                          : "text-foreground"
                      )}
                    >
                      {OT_TYPE_LABEL[type]}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                        overtimeType === type
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      ×{OT_RATE_MULTIPLIER[type].toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {OT_TYPE_DESC[type]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* OT pay preview */}
          {totalHours > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800/40 dark:bg-green-900/10">
              <HugeiconsIcon
                icon={TimeScheduleIcon}
                size={14}
                strokeWidth={1.8}
                className="shrink-0 text-green-600 dark:text-green-400"
              />
              <p className="text-[12px] text-green-700 dark:text-green-400">
                <span className="font-semibold">{fmtHours(totalHours)}</span>{" "}
                of {OT_TYPE_LABEL[overtimeType]} at{" "}
                <span className="font-semibold">×{multiplier.toFixed(2)}</span>{" "}
                rate — eligible for payroll computation upon approval.
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Reason / Task Description{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Describe the work performed or reason for overtime…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[72px] resize-none text-[13px]"
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
                Approval screenshot, task proof, client request
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

          {/* Policy notice */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Overtime must be pre-approved by your supervisor. Unapproved OT
              may be subject to review and will not be paid.
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
              !overtimeDate || !reason.trim() || createMutation.isPending
            }
            onClick={() => handleSubmit(true)}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || !!timeError || createMutation.isPending}
            onClick={() => handleSubmit(false)}
          >
            {createMutation.isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Dialog ───────────────────────────────────────────────────────────

function DetailDialog({
  request,
  onClose,
}: {
  request: OvertimeRequest
  onClose: () => void
}) {
  const cancelMutation = useCancelOvertimeRequest()

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Overtime Request Detail</DialogTitle>
          <DialogDescription>
            {OT_TYPE_LABEL[request.overtimeType]} ·{" "}
            {fmtDate(request.overtimeDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[12px]">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge variant={STATUS_VARIANT[request.status]}>
              {STATUS_LABEL[request.status]}
            </StatusBadge>
          </div>

          {/* Core details grid */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Overtime Date</p>
              <p className="mt-0.5 font-semibold text-foreground">
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
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Time</p>
              <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                {fmt12(request.startTime)} – {fmt12(request.endTime)}
              </p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-primary/70">Total Hours</p>
              <p className="mt-0.5 font-bold tabular-nums text-primary">
                {fmtHours(request.totalHours)}
              </p>
            </div>
          </div>

          {/* Pay rate */}
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
              multiplier ({OT_TYPE_LABEL[request.overtimeType]})
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Reason / Task
            </p>
            <p className="text-[12px] text-foreground">{request.reason}</p>
          </div>

          {/* Admin remarks */}
          {request.reviewNote && (
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

          {/* Attachments */}
          {request.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments
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
                  Attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Filed {fmtDateTime(request.createdAt)}
          </p>
        </div>

        <DialogFooter className="gap-2">
          {request.status === "PENDING" && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
              disabled={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate(request.id, { onSuccess: onClose })
              }
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel Request"}
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

export function MyOvertimeSection() {
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | undefined>(
    undefined
  )
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<OvertimeRequest | null>(null)

  const q = useMyOvertimeRequests({ status: statusFilter, page, size: 20 })
  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const totalApprovedHours = items
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.totalHours, 0)

  const counts = {
    pending: items.filter((r) => r.status === "PENDING").length,
    approved: items.filter((r) => r.status === "APPROVED").length,
    rejected: items.filter((r) => r.status === "REJECTED").length,
    draft: items.filter((r) => r.status === "DRAFT").length,
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">
            Overtime Requests
          </h1>
          <p className="text-[12px] text-muted-foreground">
            File and track your overtime requests
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setFormOpen(true)}
        >
          <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} />
          New Request
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Pending"
          value={<span className="text-warning">{counts.pending}</span>}
          meta="Awaiting approval"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
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
              {Math.floor(totalApprovedHours)}
              <span className="text-base font-normal text-muted-foreground">
                h
              </span>
            </>
          }
          meta="Total OT hours this period"
          accent="blue"
          icon={
            <HugeiconsIcon
              icon={TimeScheduleIcon}
              size={16}
              strokeWidth={1.8}
            />
          }
        />
        <StatCard
          title="Rejected"
          value={<span className="text-danger">{counts.rejected}</span>}
          meta="See remarks for reason"
          accent="red"
          icon={
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
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
                "Date",
                "Type",
                "Time",
                "Hours",
                "Reason",
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
                      icon={ClockPlusIcon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No overtime requests found.</p>
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
                      File a request
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
                  <TableCell className="text-[13px] font-medium tabular-nums">
                    {fmtDate(r.overtimeDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={OT_TYPE_COLOR[r.overtimeType]} dot={false}>
                      {OT_TYPE_LABEL[r.overtimeType]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] tabular-nums text-muted-foreground">
                    {fmt12(r.startTime)} – {fmt12(r.endTime)}
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] font-semibold tabular-nums text-primary">
                      {fmtHours(r.totalHours)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {r.reason}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] tabular-nums text-muted-foreground">
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
        <DetailDialog request={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
