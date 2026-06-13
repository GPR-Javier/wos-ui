"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Invoice01Icon,
  Search01Icon,
  EyeIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  UserCircleIcon,
  Money01Icon,
  DocumentAttachmentIcon,
  StoreIcon,
} from "@hugeicons/core-free-icons"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  useAllOfficialReceipts,
  useApproveOfficialReceipt,
  useRejectOfficialReceipt,
  useReimburseOfficialReceipt,
} from "@/hooks/use-or"
import {
  OR_CATEGORY_LABEL,
  OR_CATEGORY_COLOR,
  fmtPeso,
  type OfficialReceipt,
  type OfficialReceiptStatus,
} from "@/lib/or-api"

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  OfficialReceiptStatus,
  "amber" | "green" | "red" | "blue"
> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  REIMBURSED: "blue",
}

const STATUS_LABEL: Record<OfficialReceiptStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REIMBURSED: "Reimbursed",
}

const STATUS_FILTERS: { label: string; value?: OfficialReceiptStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Reimbursed", value: "REIMBURSED" },
  { label: "Rejected", value: "REJECTED" },
]

type ReviewMode = "view" | "approve" | "reject" | "reimburse"

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  or: receipt,
  mode,
  onClose,
}: {
  or: OfficialReceipt
  mode: ReviewMode
  onClose: () => void
}) {
  const [note, setNote] = useState(receipt.reviewNote ?? "")

  const approve = useApproveOfficialReceipt()
  const reject = useRejectOfficialReceipt()
  const reimburse = useReimburseOfficialReceipt()

  const busy = approve.isPending || reject.isPending || reimburse.isPending

  function handleSubmit() {
    const p = { id: receipt.id, reviewNote: note || null }
    if (mode === "approve") approve.mutate(p, { onSuccess: onClose })
    else if (mode === "reject") reject.mutate(p, { onSuccess: onClose })
    else if (mode === "reimburse") reimburse.mutate(p, { onSuccess: onClose })
  }

  const titleMap: Record<ReviewMode, string> = {
    view: "Official Receipt Details",
    approve: "Approve Official Receipt",
    reject: "Reject Official Receipt",
    reimburse: "Mark as Reimbursed",
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
            {mode === "reimburse" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-100">
                <HugeiconsIcon
                  icon={Money01Icon}
                  size={13}
                  strokeWidth={2}
                  className="text-blue-600"
                />
              </span>
            )}
            {mode === "view" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon
                  icon={Invoice01Icon}
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
                {receipt.userName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {receipt.userEmail}
              </p>
            </div>
            <StatusBadge
              variant={STATUS_VARIANT[receipt.status]}
              className="shrink-0"
            >
              {STATUS_LABEL[receipt.status]}
            </StatusBadge>
          </div>

          {/* OR number + amount */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                {receipt.purpose}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {receipt.orNumber} · {fmtDate(receipt.receiptDate)}
              </p>
            </div>
            <span className="text-[18px] font-bold text-foreground tabular-nums">
              {fmtPeso(receipt.amount)}
            </span>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Category</span>
            <StatusBadge
              variant={OR_CATEGORY_COLOR[receipt.category]}
              dot={false}
            >
              {OR_CATEGORY_LABEL[receipt.category]}
            </StatusBadge>
          </div>

          {/* Vendor */}
          {receipt.vendorName && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <HugeiconsIcon
                icon={StoreIcon}
                size={13}
                strokeWidth={1.8}
                className="text-muted-foreground"
              />
              <span className="text-muted-foreground">Vendor</span>
              <span className="ml-auto font-medium">{receipt.vendorName}</span>
            </div>
          )}

          {/* Description */}
          {receipt.description && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Description
              </p>
              <p className="text-[12px] text-foreground">
                {receipt.description}
              </p>
            </div>
          )}

          {/* Attachments */}
          {receipt.attachmentUrls.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments ({receipt.attachmentUrls.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {receipt.attachmentUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-muted"
                  >
                    <HugeiconsIcon
                      icon={DocumentAttachmentIcon}
                      size={12}
                      strokeWidth={1.8}
                    />
                    Receipt {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Reviewer info */}
          {receipt.reviewedByName && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">Reviewed by</span>
              <span className="font-medium">{receipt.reviewedByName}</span>
            </div>
          )}

          {/* Prior review note (view mode only) */}
          {mode === "view" && receipt.reviewNote && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Review Note
              </p>
              <p className="text-[12px] text-foreground">
                {receipt.reviewNote}
              </p>
            </div>
          )}

          {/* Note input for action modes */}
          {mode !== "view" && (
            <div className="space-y-1.5">
              <p className="text-[12px] font-medium text-foreground">
                Note{" "}
                {mode === "reject" && <span className="text-red-500">*</span>}
                <span className="ml-1 font-normal text-muted-foreground">
                  (optional)
                </span>
              </p>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === "approve"
                    ? "Add an approval note…"
                    : mode === "reject"
                      ? "Reason for rejection…"
                      : "Add a note…"
                }
                className="resize-none text-[13px]"
              />
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
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleSubmit}
              disabled={busy}
            >
              Approve
            </Button>
          )}
          {mode === "reject" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleSubmit}
              disabled={busy || !note.trim()}
            >
              Reject
            </Button>
          )}
          {mode === "reimburse" && (
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={busy}
            >
              Mark Reimbursed
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OrManagement() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    OfficialReceiptStatus | undefined
  >()
  const [selected, setSelected] = useState<{
    or: OfficialReceipt
    mode: ReviewMode
  } | null>(null)

  const { data, isLoading } = useAllOfficialReceipts({
    status: statusFilter,
    search: search || undefined,
    page,
    size: 20,
  })

  const receipts = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  // Summary counts
  const pending = receipts.filter((r) => r.status === "PENDING").length
  const approved = receipts.filter((r) => r.status === "APPROVED").length
  const reimbursed = receipts.filter((r) => r.status === "REIMBURSED").length
  const totalAmount = receipts
    .filter((r) => r.status !== "REJECTED")
    .reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Pending Review"
          value={String(pending)}
          meta="Awaiting approval"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Invoice01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Approved"
          value={String(approved)}
          meta="Ready for reimbursement"
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
          title="Reimbursed"
          value={String(reimbursed)}
          meta="Completed this period"
          accent="blue"
          icon={
            <HugeiconsIcon icon={Money01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Total Amount"
          value={fmtPeso(totalAmount)}
          meta="Submitted (excl. rejected)"
          accent="purple"
          icon={
            <HugeiconsIcon
              icon={DocumentAttachmentIcon}
              size={16}
              strokeWidth={1.8}
            />
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            strokeWidth={1.8}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search employee or purpose…"
            className="h-9 pl-9 text-[13px]"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => {
              setStatusFilter(f.value)
              setPage(0)
            }}
            className={cn(
              "relative px-3 pb-2 text-[13px] font-medium transition-colors",
              statusFilter === f.value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {statusFilter === f.value && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-primary" />
            )}
          </button>
        ))}
        <span className="ml-auto self-center pb-2 text-[12px] text-muted-foreground">
          {totalElements} total
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Employee",
                "OR Number",
                "Purpose",
                "Category",
                "Amount",
                "Receipt Date",
                "Status",
                "Actions",
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  No official receipts found.
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((r) => {
                const initials = r.userName
                  .split(" ")
                  .map((n) => n[0] ?? "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {initials}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium">
                            {r.userName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {r.userEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">
                      {r.orNumber}
                    </TableCell>
                    <TableCell className="max-w-48">
                      <p className="truncate text-[13px]">{r.purpose}</p>
                      {r.vendorName && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {r.vendorName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={OR_CATEGORY_COLOR[r.category]}
                        dot={false}
                      >
                        {OR_CATEGORY_LABEL[r.category]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-[13px] font-semibold tabular-nums">
                      {fmtPeso(r.amount)}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                      {fmtDate(r.receiptDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={STATUS_VARIANT[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => setSelected({ or: r, mode: "view" })}
                        >
                          <HugeiconsIcon
                            icon={EyeIcon}
                            size={13}
                            strokeWidth={1.8}
                          />
                        </Button>
                        {r.status === "PENDING" && (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-7 border-success-border text-success hover:bg-gbg"
                              onClick={() =>
                                setSelected({ or: r, mode: "approve" })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-7 border-danger-border text-danger hover:bg-rbg"
                              onClick={() =>
                                setSelected({ or: r, mode: "reject" })
                              }
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === "APPROVED" && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            onClick={() =>
                              setSelected({ or: r, mode: "reimburse" })
                            }
                          >
                            Reimburse
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        // Server-paged (0-based) adapted to TablePagination's 1-based API; page size
        // is fixed at 20 by the query, so the size selector is a no-op single option.
        <TablePagination
          page={page + 1}
          totalPages={totalPages}
          total={totalElements}
          pageSize={20}
          setPage={(p) => setPage(p - 1)}
          setPageSize={() => {}}
          pageSizeOptions={[20]}
        />
      )}

      {selected && (
        <ReviewModal
          or={selected.or}
          mode={selected.mode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
