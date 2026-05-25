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
  Clock01Icon,
  Alert01Icon,
  DocumentAttachmentIcon,
  Money01Icon,
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
  useAllExpenses,
  useApproveExpense,
  useRejectExpense,
  useReimburseExpense,
} from "@/hooks/use-expense"
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_COLOR,
  fmtPeso,
  type ExpenseReport,
  type ExpenseStatus,
} from "@/lib/expense-api"

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  ExpenseStatus,
  "amber" | "green" | "red" | "blue" | "gray"
> = {
  DRAFT: "gray",
  SUBMITTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  REIMBURSED: "blue",
}

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REIMBURSED: "Reimbursed",
}

const STATUS_FILTERS: { label: string; value?: ExpenseStatus }[] = [
  { label: "All" },
  { label: "Submitted", value: "SUBMITTED" },
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
  expense,
  mode,
  onClose,
}: {
  expense: ExpenseReport
  mode: ReviewMode
  onClose: () => void
}) {
  const [note, setNote] = useState(expense.reviewNote ?? "")

  const approve = useApproveExpense()
  const reject = useRejectExpense()
  const reimburse = useReimburseExpense()

  const busy = approve.isPending || reject.isPending || reimburse.isPending

  function handleSubmit() {
    const p = { id: expense.id, reviewNote: note || null }
    if (mode === "approve") approve.mutate(p, { onSuccess: onClose })
    else if (mode === "reject") reject.mutate(p, { onSuccess: onClose })
    else if (mode === "reimburse") reimburse.mutate(p, { onSuccess: onClose })
  }

  const titleMap: Record<ReviewMode, string> = {
    view: "Expense Report Details",
    approve: "Approve Expense Report",
    reject: "Reject Expense Report",
    reimburse: "Mark as Reimbursed",
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "approve" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-green-100">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} strokeWidth={2} className="text-green-600" />
              </span>
            )}
            {mode === "reject" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-red-100">
                <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} className="text-red-500" />
              </span>
            )}
            {mode === "reimburse" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-100">
                <HugeiconsIcon icon={Money01Icon} size={13} strokeWidth={2} className="text-blue-600" />
              </span>
            )}
            {mode === "view" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={Invoice01Icon} size={13} strokeWidth={2} className="text-primary" />
              </span>
            )}
            {titleMap[mode]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Employee info */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon icon={UserCircleIcon} size={16} strokeWidth={1.6} className="text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">{expense.userName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{expense.userEmail}</p>
            </div>
            <StatusBadge variant={STATUS_VARIANT[expense.status]} className="shrink-0">
              {STATUS_LABEL[expense.status]}
            </StatusBadge>
          </div>

          {/* Title + amount */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-[13px] font-semibold text-foreground">{expense.title}</p>
              <p className="text-[11px] text-muted-foreground">{fmtDate(expense.expenseDate)}</p>
            </div>
            <span className="text-[18px] font-bold tabular-nums text-foreground">
              {fmtPeso(expense.amount)}
            </span>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Category</span>
            <StatusBadge variant={EXPENSE_CATEGORY_COLOR[expense.category]} dot={false}>
              {EXPENSE_CATEGORY_LABEL[expense.category]}
            </StatusBadge>
          </div>

          {/* Description */}
          {expense.description && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Description
              </p>
              <p className="text-[12px] text-foreground">{expense.description}</p>
            </div>
          )}

          {/* Linked trip */}
          {expense.businessTripId && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">Linked Trip</span>
              <span className="font-mono text-[11px] font-semibold text-foreground">
                Trip #{expense.businessTripId}
              </span>
            </div>
          )}

          {/* Attachments */}
          {expense.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Receipts / Attachments ({expense.attachmentUrls.length})
              </p>
              {expense.attachmentUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[12px] text-primary hover:bg-muted/40"
                >
                  <HugeiconsIcon icon={DocumentAttachmentIcon} size={13} strokeWidth={1.8} />
                  View attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Filed {new Date(expense.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>

          {/* Existing review note (view) */}
          {mode === "view" && expense.reviewNote && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                Finance Notes
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">{expense.reviewNote}</p>
              {expense.reviewedByName && (
                <p className="mt-1 text-[11px] text-blue-500">— {expense.reviewedByName}</p>
              )}
            </div>
          )}

          {/* Review note input */}
          {mode !== "view" && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label className="text-[12px]">
                Review Note{" "}
                {mode === "reject" ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Textarea
                className="min-h-[72px] resize-none text-[13px]"
                placeholder={
                  mode === "reject"
                    ? "Reason for rejection (shown to employee)…"
                    : mode === "reimburse"
                      ? "Reimbursement reference or payment details…"
                      : "Approval notes…"
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode === "approve" && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busy} onClick={handleSubmit}>
              {busy ? "Approving…" : "Approve Report"}
            </Button>
          )}
          {mode === "reject" && (
            <Button size="sm" variant="destructive" disabled={busy || !note.trim()} onClick={handleSubmit}>
              {busy ? "Rejecting…" : "Reject Report"}
            </Button>
          )}
          {mode === "reimburse" && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={busy} onClick={handleSubmit}>
              {busy ? "Updating…" : "Mark Reimbursed"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ExpenseManagementSection() {
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | undefined>("SUBMITTED")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [reviewTarget, setReviewTarget] = useState<{
    expense: ExpenseReport
    mode: ReviewMode
  } | null>(null)

  const q = useAllExpenses({ status: statusFilter, search: search || undefined, page, size: 20 })
  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const summaryQ = useAllExpenses({ size: 200 })
  const all = summaryQ.data?.content ?? []
  const counts = {
    total: all.length,
    submitted: all.filter((r) => r.status === "SUBMITTED").length,
    approved: all.filter((r) => r.status === "APPROVED").length,
    totalPending: all
      .filter((r) => r.status === "SUBMITTED" || r.status === "APPROVED")
      .reduce((s, r) => s + r.amount, 0),
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[16px] font-bold text-foreground">Expense Reports</h1>
        <p className="text-[12px] text-muted-foreground">
          Review and process employee expense reimbursement requests
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Reports"
          value={counts.total}
          meta="All time"
          accent="blue"
          icon={<HugeiconsIcon icon={Invoice01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Submitted"
          value={<span className="text-warning">{counts.submitted}</span>}
          meta="Awaiting review"
          accent="amber"
          icon={<HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Approved"
          value={<span className="text-success">{counts.approved}</span>}
          meta="Pending reimbursement"
          accent="green"
          icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Pending Amount"
          value={
            counts.totalPending > 0 ? (
              <>
                ₱{(counts.totalPending / 1000).toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">K</span>
              </>
            ) : (
              <span className="text-success">₱0</span>
            )
          }
          meta="Submitted + approved"
          accent={counts.totalPending > 0 ? "amber" : "green"}
          icon={<HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />}
        />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
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
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <div className="flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => { setStatusFilter(f.value); setPage(0) }}
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
                {f.value === "APPROVED" && counts.approved > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-green-100 px-1 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {counts.approved}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {["Employee", "Title", "Category", "Amount", "Date", "Status", "Actions"].map((h) => (
                <TableHead key={h} className={h === "Actions" ? "text-right" : undefined}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              [0, 1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}><Skeleton className="h-3 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-[13px] text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon icon={Invoice01Icon} size={28} strokeWidth={1.3} className="text-muted-foreground/30" />
                    <p>No expense reports found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{r.userName}</p>
                      <p className="text-[11px] text-muted-foreground">{r.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-foreground max-w-[180px] truncate">
                    {r.title}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={EXPENSE_CATEGORY_COLOR[r.category]} dot={false}>
                      {EXPENSE_CATEGORY_LABEL[r.category]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[13px] font-semibold tabular-nums text-foreground">
                    {fmtPeso(r.amount)}
                  </TableCell>
                  <TableCell className="text-[12px] tabular-nums text-muted-foreground">
                    {fmtDate(r.expenseDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="outline"
                        onClick={() => setReviewTarget({ expense: r, mode: "view" })}
                        title="View details"
                      >
                        <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                      </Button>
                      {r.status === "SUBMITTED" && (
                        <>
                          <Button
                            size="icon-xs"
                            variant="outline"
                            className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20"
                            onClick={() => setReviewTarget({ expense: r, mode: "approve" })}
                            title="Approve"
                          >
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={2} />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="outline"
                            className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                            onClick={() => setReviewTarget({ expense: r, mode: "reject" })}
                            title="Reject"
                          >
                            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                          </Button>
                        </>
                      )}
                      {r.status === "APPROVED" && (
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:hover:bg-blue-900/20"
                          onClick={() => setReviewTarget({ expense: r, mode: "reimburse" })}
                          title="Mark reimbursed"
                        >
                          <HugeiconsIcon icon={Money01Icon} size={12} strokeWidth={2} />
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

      {reviewTarget && (
        <ReviewModal
          expense={reviewTarget.expense}
          mode={reviewTarget.mode}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  )
}
