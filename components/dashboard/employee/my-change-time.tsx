"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Clock01Icon,
  Add01Icon,
  Search01Icon,
  File01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  InformationCircleIcon,
  Delete01Icon,
  DocumentAttachmentIcon,
  PencilEdit02Icon,
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
  useMyChangeTimeRequests,
  useCreateChangeTimeRequest,
  useUpdateChangeTimeRequest,
  useDeleteChangeTimeRequest,
  useCancelChangeTimeRequest,
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

// Statuses an employee can still edit (before it's actioned / finalized).
const EDITABLE_STATUSES = new Set<ChangeTimeStatus>([
  "DRAFT",
  "PENDING",
  "RETURNED",
])

const STATUS_FILTERS: { label: string; value?: ChangeTimeStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Draft", value: "DRAFT" },
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

// ── Request Form Dialog ─────────────────────────────────────────────────────

interface RequestFormProps {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits this request instead of creating a new one. */
  editing?: ChangeTimeRequest | null
}

function RequestFormDialog({ open, onClose, editing }: RequestFormProps) {
  const today = new Date().toISOString().split("T")[0]
  const isEditing = !!editing

  const [attendanceDate, setAttendanceDate] = useState("")
  const [requestType, setRequestType] =
    useState<ChangeTimeRequestType>("TIME_IN")
  const [requestedTimeIn, setRequestedTimeIn] = useState("")
  const [requestedTimeOut, setRequestedTimeOut] = useState("")
  const [reason, setReason] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])

  const createMutation = useCreateChangeTimeRequest()
  const updateMutation = useUpdateChangeTimeRequest()
  const isPending = createMutation.isPending || updateMutation.isPending

  const showTimeIn = requestType === "TIME_IN" || requestType === "BOTH"
  const showTimeOut = requestType === "TIME_OUT" || requestType === "BOTH"

  // Seed the form whenever it opens — from the request being edited, or blank for a new one.
  useEffect(() => {
    if (!open) return
    setAttendanceDate(editing?.attendanceDate ?? "")
    setRequestType(editing?.requestType ?? "TIME_IN")
    setRequestedTimeIn(editing?.requestedTimeIn ?? "")
    setRequestedTimeOut(editing?.requestedTimeOut ?? "")
    setReason(editing?.reason ?? "")
    setAttachments([])
  }, [open, editing])

  function handleSubmit(isDraft: boolean) {
    const body = {
      attendanceDate,
      requestType,
      requestedTimeIn: showTimeIn ? requestedTimeIn || null : null,
      requestedTimeOut: showTimeOut ? requestedTimeOut || null : null,
      reason,
      isDraft,
    }
    if (isEditing && editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: onClose })
    } else {
      createMutation.mutate(body, { onSuccess: onClose })
    }
  }

  const canSubmit =
    attendanceDate !== "" &&
    reason.trim() !== "" &&
    (showTimeIn ? requestedTimeIn !== "" : true) &&
    (showTimeOut ? requestedTimeOut !== "" : true)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={14}
                strokeWidth={1.8}
                className="text-amber-600 dark:text-amber-400"
              />
            </div>
            {isEditing ? "Edit Time Correction" : "Request Time Correction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your time-correction request"
              : "Submit a correction to your daily time record for HR approval"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Attendance date */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Attendance Date</Label>
            <Input
              type="date"
              max={today}
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="h-9 text-[13px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Cannot be a future date.
            </p>
          </div>

          {/* Request type selector */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">What do you want to change?</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "TIME_IN", label: "Time-In", sub: "Clock-in only" },
                  {
                    value: "TIME_OUT",
                    label: "Time-Out",
                    sub: "Clock-out only",
                  },
                  { value: "BOTH", label: "Both", sub: "In & out" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRequestType(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-all",
                    requestType === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <p
                    className={cn(
                      "text-[12px] font-semibold",
                      requestType === opt.value
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Time fields */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Corrected Time
            </p>
            <div
              className={cn(
                "grid gap-3",
                requestType === "BOTH" ? "grid-cols-2" : "grid-cols-1"
              )}
            >
              {showTimeIn && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-primary">
                    Corrected Time-In
                  </Label>
                  <Input
                    type="time"
                    value={requestedTimeIn}
                    onChange={(e) => setRequestedTimeIn(e.target.value)}
                    className="h-9 border-primary/40 text-[13px] focus:ring-primary/30"
                  />
                </div>
              )}
              {showTimeOut && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-primary">
                    Corrected Time-Out
                  </Label>
                  <Input
                    type="time"
                    value={requestedTimeOut}
                    onChange={(e) => setRequestedTimeOut(e.target.value)}
                    className="h-9 border-primary/40 text-[13px] focus:ring-primary/30"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Briefly explain why this correction is needed…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20 resize-none text-[13px]"
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
                Screenshot, medical cert, approval proof
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

          {/* Info notice */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-900/10">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Approved corrections update your attendance record and may affect
              late/undertime calculations.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          {isEditing ? (
            <Button
              size="sm"
              disabled={!canSubmit || isPending}
              onClick={() => handleSubmit(false)}
            >
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!attendanceDate || !reason.trim() || isPending}
                onClick={() => handleSubmit(true)}
              >
                Save as Draft
              </Button>
              <Button
                size="sm"
                disabled={!canSubmit || isPending}
                onClick={() => handleSubmit(false)}
              >
                {isPending ? "Submitting…" : "Submit Request"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail View Dialog ──────────────────────────────────────────────────────

function DetailDialog({
  request,
  onClose,
}: {
  request: ChangeTimeRequest
  onClose: () => void
}) {
  const cancelMutation = useCancelChangeTimeRequest()

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Detail</DialogTitle>
          <DialogDescription>
            {REQUEST_TYPE_LABEL[request.requestType]} ·{" "}
            {fmtDate(request.attendanceDate)}
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

          {/* Corrected time */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Corrected Time
            </p>
            {(request.requestType === "TIME_IN" ||
              request.requestType === "BOTH") && (
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Time-In</span>
                <span className="font-semibold text-primary tabular-nums">
                  {fmt12(request.requestedTimeIn)}
                </span>
              </div>
            )}
            {(request.requestType === "TIME_OUT" ||
              request.requestType === "BOTH") && (
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Time-Out</span>
                <span className="font-semibold text-primary tabular-nums">
                  {fmt12(request.requestedTimeOut)}
                </span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Reason
            </p>
            <p className="text-[12px] text-foreground">{request.reason}</p>
          </div>

          {/* Review note */}
          {request.reviewNote && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                Admin Remarks
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">
                {request.reviewNote}
              </p>
              {request.reviewedByName && (
                <p className="mt-1 text-[11px] text-blue-500 dark:text-blue-400">
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

          {/* Filed at */}
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

export function MyChangeTimeSection() {
  const [statusFilter, setStatusFilter] = useState<
    ChangeTimeStatus | undefined
  >(undefined)
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ChangeTimeRequest | null>(null)
  const [detail, setDetail] = useState<ChangeTimeRequest | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ChangeTimeRequest | null>(
    null
  )

  const deleteMutation = useDeleteChangeTimeRequest()

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(r: ChangeTimeRequest) {
    setEditing(r)
    setFormOpen(true)
  }
  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  const q = useMyChangeTimeRequests({ status: statusFilter, page, size: 20 })
  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

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
            Change Time In / Time Out
          </h1>
          <p className="text-[12px] text-muted-foreground">
            File and track your time correction requests
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} />
          New Request
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Pending"
          value={<span className="text-warning">{counts.pending}</span>}
          meta="Awaiting HR action"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Approved"
          value={<span className="text-success">{counts.approved}</span>}
          meta="Applied to attendance"
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
          value={<span className="text-danger">{counts.rejected}</span>}
          meta="See remarks for reason"
          accent="red"
          icon={
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Drafts"
          value={counts.draft}
          meta="Saved, not yet submitted"
          accent="gray"
          icon={<HugeiconsIcon icon={File01Icon} size={16} strokeWidth={1.8} />}
        />
      </div>

      {/* ── Filter tabs + table ── */}
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
                "Request Type",
                "Corrected Time",
                "Reason",
                "Status",
                "Filed",
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
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
                      icon={Clock01Icon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No requests found.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 gap-1.5"
                      onClick={openCreate}
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
                  className="cursor-pointer"
                  onClick={() => setDetail(r)}
                >
                  <TableCell className="text-[13px] font-medium tabular-nums">
                    {fmtDate(r.attendanceDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant="blue" dot={false}>
                      {REQUEST_TYPE_LABEL[r.requestType]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] tabular-nums">
                    <div className="space-y-0.5 font-medium text-primary">
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
                  <TableCell className="max-w-45">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {r.reason}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {fmtDate(r.createdAt.split("T")[0])}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {EDITABLE_STATUSES.has(r.status) && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Edit"
                          onClick={() => openEdit(r)}
                        >
                          <HugeiconsIcon
                            icon={PencilEdit02Icon}
                            size={13}
                            strokeWidth={2}
                          />
                        </Button>
                      )}
                      {r.status !== "APPROVED" && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Delete"
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() => setConfirmDelete(r)}
                        >
                          <HugeiconsIcon
                            icon={Delete01Icon}
                            size={13}
                            strokeWidth={2}
                          />
                        </Button>
                      )}
                      {r.status === "APPROVED" && (
                        <span className="text-[11px] text-muted-foreground">
                          —
                        </span>
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

      {/* ── Modals ── */}
      <RequestFormDialog
        open={formOpen}
        onClose={closeForm}
        editing={editing}
      />
      {detail && (
        <DetailDialog request={detail} onClose={() => setDetail(null)} />
      )}

      {/* Delete confirmation */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete request?</DialogTitle>
            <DialogDescription>
              This permanently removes your time-correction request
              {confirmDelete
                ? ` for ${fmtDate(confirmDelete.attendanceDate)}`
                : ""}
              . This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!confirmDelete) return
                deleteMutation.mutate(confirmDelete.id, {
                  onSuccess: () => setConfirmDelete(null),
                })
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
