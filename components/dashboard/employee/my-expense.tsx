"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Invoice01Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  EyeIcon,
  Delete01Icon,
  DocumentAttachmentIcon,
  Money01Icon,
  Alert01Icon,
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
  useMyExpenses,
  useCreateExpense,
  useCancelExpense,
} from "@/hooks/use-expense"
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_COLOR,
  fmtPeso,
  type ExpenseReport,
  type ExpenseStatus,
  type ExpenseCategory,
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
  { label: "Draft", value: "DRAFT" },
]

const today = new Date().toISOString().split("T")[0]

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  expenseDate: today,
  category: "" as ExpenseCategory | "",
  amount: "" as string,
  description: "",
  businessTripId: "" as string,
  files: [] as File[],
}

function RequestFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [dragOver, setDragOver] = useState(false)
  const create = useCreateExpense()

  function handleFile(files: FileList | null) {
    if (!files) return
    setForm((f) => ({ ...f, files: [...f.files, ...Array.from(files)] }))
  }

  function removeFile(idx: number) {
    setForm((f) => ({ ...f, files: f.files.filter((_, i) => i !== idx) }))
  }

  function isValid() {
    return (
      form.title.trim() &&
      form.expenseDate &&
      form.category &&
      Number(form.amount) > 0 &&
      form.description.trim()
    )
  }

  function submit(isDraft: boolean) {
    if (!form.category || !form.title) return
    create.mutate(
      {
        payload: {
          title: form.title,
          expenseDate: form.expenseDate,
          category: form.category as ExpenseCategory,
          amount: Number(form.amount),
          description: form.description,
          businessTripId: form.businessTripId ? Number(form.businessTripId) : undefined,
          isDraft,
        },
        files: form.files.length > 0 ? form.files : undefined,
      },
      {
        onSuccess: () => {
          setForm({ ...EMPTY_FORM })
          onClose()
        },
      }
    )
  }

  const busy = create.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={Invoice01Icon} size={13} strokeWidth={2} className="text-primary" />
            </span>
            New Expense Report
          </DialogTitle>
          <DialogDescription>
            Submit an expense reimbursement request. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Expense Title <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-9 text-[13px]"
              placeholder="e.g. Cebu Trip Transportation, Hotel Accommodation…"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Expense Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                className="h-9 text-[13px]"
                value={form.expenseDate}
                onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Amount (₱) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-9 text-[13px]"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Category <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c }))}
                  className={cn(
                    "rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                    form.category === c
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  <p className="text-[11px] font-semibold text-foreground leading-snug">
                    {EXPENSE_CATEGORY_LABEL[c]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              className="min-h-18 resize-none text-[13px]"
              placeholder="Describe the expense and its business purpose…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Linked Trip ID (optional) */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Linked Business Trip ID <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="number"
              className="h-9 text-[13px]"
              placeholder="Enter trip ID if this expense is part of an approved trip…"
              value={form.businessTripId}
              onChange={(e) => setForm((f) => ({ ...f, businessTripId: e.target.value }))}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Receipts / Proof of Expense{" "}
              <span className="text-muted-foreground">(recommended — attach official receipts)</span>
            </Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files) }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-5 transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/40"
              )}
              onClick={() => document.getElementById("expense-file-upload")?.click()}
            >
              <HugeiconsIcon icon={DocumentAttachmentIcon} size={20} strokeWidth={1.5} className="text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">
                Drop receipts here or <span className="font-medium text-primary">browse</span>
              </p>
              <input id="expense-file-upload" type="file" multiple className="hidden" onChange={(e) => handleFile(e.target.files)} />
            </div>
            {form.files.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {form.files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                    <HugeiconsIcon icon={Invoice01Icon} size={13} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{file.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-muted-foreground hover:text-danger">
                      <HugeiconsIcon icon={Delete01Icon} size={13} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="outline" size="sm" disabled={busy || !isValid()} onClick={() => submit(true)}>
            Save as Draft
          </Button>
          <Button size="sm" disabled={busy || !isValid()} onClick={() => submit(false)}>
            {busy ? "Submitting…" : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────

function DetailDialog({ expense, onClose }: { expense: ExpenseReport; onClose: () => void }) {
  const cancel = useCancelExpense()
  const canCancel = expense.status === "DRAFT" || expense.status === "SUBMITTED"

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={Invoice01Icon} size={13} strokeWidth={2} className="text-primary" />
            </span>
            Expense Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-[13px] font-semibold text-foreground">{expense.title}</p>
              <p className="text-[11px] text-muted-foreground">{fmtDate(expense.expenseDate)}</p>
            </div>
            <StatusBadge variant={STATUS_VARIANT[expense.status]} className="shrink-0">
              {STATUS_LABEL[expense.status]}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Money01Icon} size={14} strokeWidth={2} className="text-success" />
              <span className="text-[12px] text-muted-foreground">Amount</span>
            </div>
            <span className="text-[18px] font-bold tabular-nums text-foreground">{fmtPeso(expense.amount)}</span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Category</span>
            <StatusBadge variant={EXPENSE_CATEGORY_COLOR[expense.category]} dot={false}>
              {EXPENSE_CATEGORY_LABEL[expense.category]}
            </StatusBadge>
          </div>

          {expense.description && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Description</p>
              <p className="text-[12px] text-foreground">{expense.description}</p>
            </div>
          )}

          {expense.businessTripId && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">Linked Trip</span>
              <span className="font-mono font-semibold text-foreground">Trip #{expense.businessTripId}</span>
            </div>
          )}

          {expense.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Receipts ({expense.attachmentUrls.length})
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
                  View receipt {i + 1}
                </a>
              ))}
            </div>
          )}

          {expense.reimbursedAt && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="text-[12px] font-semibold text-blue-700">
                Reimbursed on {fmtDate(expense.reimbursedAt.split("T")[0])}
              </p>
            </div>
          )}

          {expense.reviewNote && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">Finance Notes</p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">{expense.reviewNote}</p>
              {expense.reviewedByName && (
                <p className="mt-1 text-[11px] text-blue-500">— {expense.reviewedByName}</p>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Filed {new Date(expense.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <DialogFooter className="gap-2">
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(expense.id, { onSuccess: onClose })}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel Report"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MyExpenseSection() {
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<ExpenseReport | null>(null)

  const q = useMyExpenses({ status: statusFilter, page, size: 20 })
  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const summaryQ = useMyExpenses({ size: 200 })
  const all = summaryQ.data?.content ?? []
  const counts = {
    submitted: all.filter((r) => r.status === "SUBMITTED").length,
    approved: all.filter((r) => r.status === "APPROVED").length,
    reimbursed: all.filter((r) => r.status === "REIMBURSED").length,
    totalPending: all
      .filter((r) => r.status === "SUBMITTED" || r.status === "APPROVED")
      .reduce((s, r) => s + r.amount, 0),
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">Expense Reports</h1>
          <p className="text-[12px] text-muted-foreground">Submit and track your expense reimbursements</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} className="mr-1.5" />
          New Report
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          title="Reimbursed"
          value={<span className="text-blue-500">{counts.reimbursed}</span>}
          meta="Payment received"
          accent="blue"
          icon={<HugeiconsIcon icon={Money01Icon} size={16} strokeWidth={1.8} />}
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
          meta="Awaiting reimbursement"
          accent={counts.totalPending > 0 ? "amber" : "green"}
          icon={<HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />}
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
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
              </button>
            ))}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {["Title", "Category", "Amount", "Date", "Status", "Actions"].map((h) => (
                <TableHead key={h} className={h === "Actions" ? "text-right" : undefined}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              [0, 1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5].map((j) => (
                    <TableCell key={j}><Skeleton className="h-3 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-[13px] text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon icon={Invoice01Icon} size={28} strokeWidth={1.3} className="text-muted-foreground/30" />
                    <p>No expense reports found.</p>
                    <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                      File your first report
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(r)}>
                  <TableCell className="max-w-50 truncate text-[13px] font-medium text-foreground">
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
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon-xs"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setSelected(r) }}
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

      {formOpen && <RequestFormDialog open={formOpen} onClose={() => setFormOpen(false)} />}
      {selected && <DetailDialog expense={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
