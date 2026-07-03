"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Briefcase01Icon,
  Add01Icon,
  File01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Delete01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import {
  DateRangeFilter,
  useDateRange,
  thisYearRange,
} from "@/components/custom/date-range-filter"
import { Button } from "@/components/ui/button"
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
import { ObModal, OB_DURATION_LABEL } from "@/components/custom/ob-modal"
import { cn } from "@/lib/utils"
import { useMyObRequests, useDeleteObRequest, useCancelObRequest } from "@/hooks/use-ob"
import type { ObRequest, ObStatus } from "@/lib/ob-api"

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  ObStatus,
  "amber" | "green" | "red" | "blue" | "gray" | "purple"
> = {
  DRAFT: "gray",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  RETURNED: "purple",
  CANCELLED: "gray",
}

const STATUS_LABEL: Record<ObStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
}

// Statuses an employee can still edit (before it's actioned / finalized).
const EDITABLE_STATUSES = new Set<ObStatus>(["DRAFT", "PENDING", "RETURNED"])

const STATUS_FILTERS: { label: string; value?: ObStatus }[] = [
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

function fmtDuration(r: ObRequest) {
  if (r.duration === "CUSTOM") {
    return `${fmt12(r.customStartTime)} – ${fmt12(r.customEndTime)}`
  }
  return OB_DURATION_LABEL[r.duration]
}

// ── Detail View Dialog ──────────────────────────────────────────────────────

function DetailDialog({
  request,
  onClose,
}: {
  request: ObRequest
  onClose: () => void
}) {
  const cancelMutation = useCancelObRequest()

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Detail</DialogTitle>
          <DialogDescription>
            {OB_DURATION_LABEL[request.duration]} · {fmtDate(request.obDate)}
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

          {/* Duration + location */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Duration</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {fmtDuration(request)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Location</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {request.location}
              </p>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Purpose
            </p>
            <p className="text-[12px] text-foreground">{request.purpose}</p>
          </div>

          {/* Notes */}
          {request.notes && (
            <div className="space-y-1 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Notes
              </p>
              <p className="text-[12px] text-foreground">{request.notes}</p>
            </div>
          )}

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

export function MyObSection() {
  const [statusFilter, setStatusFilter] = useState<ObStatus | undefined>(
    undefined
  )
  const [page, setPage] = useState(0)
  const { range, setRange } = useDateRange(thisYearRange)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ObRequest | null>(null)
  const [detail, setDetail] = useState<ObRequest | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ObRequest | null>(null)

  const deleteMutation = useDeleteObRequest()

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(r: ObRequest) {
    setEditing(r)
    setFormOpen(true)
  }
  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  const q = useMyObRequests({
    status: statusFilter,
    from: range.from,
    to: range.until,
    page,
    size: 20,
  })
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
            Official Business
          </h1>
          <p className="text-[12px] text-muted-foreground">
            File and track your official business requests
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
            <HugeiconsIcon icon={Briefcase01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Approved"
          value={<span className="text-success">{counts.approved}</span>}
          meta="Cleared to proceed"
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
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <DateRangeFilter
            value={range}
            onChange={(v) => {
              setRange(v)
              setPage(0)
            }}
          />
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
                "Duration",
                "Purpose",
                "Location",
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
                      icon={Briefcase01Icon}
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
                    {fmtDate(r.obDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant="blue" dot={false}>
                      {fmtDuration(r)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="max-w-45">
                    <p className="truncate text-[12px] text-foreground">
                      {r.purpose}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-40">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {r.location}
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
      <ObModal open={formOpen} onClose={closeForm} editing={editing} />
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
              This permanently removes your official business request
              {confirmDelete ? ` for ${fmtDate(confirmDelete.obDate)}` : ""}.
              This can&apos;t be undone.
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
