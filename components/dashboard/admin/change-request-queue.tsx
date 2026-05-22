"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  EyeIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { StatusBadge } from "@/components/custom/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { TablePagination } from "@/components/custom/table-pagination"
import { cn } from "@/lib/utils"
import {
  useAllChangeRequests,
  useApproveChangeRequest,
  useRejectChangeRequest,
} from "@/hooks/use-schedule-change-request"
import type {
  ChangeRequestStatus,
  ScheduleChangeRequest,
} from "@/lib/schedule-change-request-api"

const STATUS_VARIANT: Record<
  ChangeRequestStatus,
  "green" | "red" | "amber" | "gray"
> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "gray",
}

const STATUS_FILTERS: { label: string; value?: ChangeRequestStatus }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
]

const TYPE_LABEL: Record<string, string> = {
  SHIFT_CHANGE: "Shift change",
  DAY_OFF: "Day off",
  PERMANENT_POLICY_CHANGE: "Permanent change",
}

function ReviewModal({
  request,
  mode,
  onClose,
}: {
  request: ScheduleChangeRequest
  mode: "approve" | "reject" | "view"
  onClose: () => void
}) {
  const [note, setNote] = useState("")
  const approve = useApproveChangeRequest()
  const reject = useRejectChangeRequest()
  const submit = () => {
    if (mode === "approve")
      approve.mutate({ id: request.id, note }, { onSuccess: onClose })
    else if (mode === "reject")
      reject.mutate({ id: request.id, note }, { onSuccess: onClose })
  }
  const busy = approve.isPending || reject.isPending
  const p = request.requestedPayload

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "view"
              ? "Schedule change request"
              : mode === "approve"
                ? "Approve request"
                : "Reject request"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Employee</span>
            <span className="font-medium">{request.userName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">
              {TYPE_LABEL[request.type] ?? request.type}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Effective</span>
            <span className="font-medium tabular-nums">
              {request.effectiveFrom}
              {request.effectiveUntil ? ` → ${request.effectiveUntil}` : ""}
            </span>
          </div>
          <div className="border-t border-border pt-2">
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Requested policy
            </p>
            <p className="text-[11px]">
              Clock-in {p.earliestClockIn ?? "—"}–{p.latestClockIn ?? "—"}{" "}
              (grace {p.lateGraceMins ?? 0}m) · {p.requiredHours ?? "—"}h/day ·
              workdays {(p.workdays ?? []).join(", ") || "—"}
            </p>
          </div>
          {request.reason && (
            <div className="border-t border-border pt-2">
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Employee reason
              </p>
              <p className="text-[11px] italic">“{request.reason}”</p>
            </div>
          )}
        </div>

        {mode !== "view" && (
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Admin note (optional, shown to employee)
            </Label>
            <Textarea
              className="min-h-16 resize-none text-[13px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {mode === "approve" && (
            <Button size="sm" disabled={busy} onClick={submit}>
              {busy ? "Approving…" : "Approve"}
            </Button>
          )}
          {mode === "reject" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={submit}
            >
              {busy ? "Rejecting…" : "Reject"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ChangeRequestQueueSection() {
  const [status, setStatus] = useState<ChangeRequestStatus | undefined>(
    "PENDING"
  )
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [reviewTarget, setReviewTarget] = useState<{
    req: ScheduleChangeRequest
    mode: "approve" | "reject" | "view"
  } | null>(null)

  const q = useAllChangeRequests({ status, page, size: 20 })
  const items = q.data?.content ?? []
  const filtered = search
    ? items.filter((r) =>
        `${r.userName} ${r.userEmail} ${r.reason ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : items
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            strokeWidth={2}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-9 pl-9 text-[13px]"
            placeholder="Search by employee or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setStatus(f.value)
                setPage(0)
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                status === f.value
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
            {[
              "Employee",
              "Type",
              "Effective",
              "Status",
              "Reviewed by",
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
              {[0, 1, 2].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-3 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-10 text-center text-[13px] text-muted-foreground"
              >
                No change requests.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="text-[13px] font-medium">{r.userName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.userEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-[12px]">
                  {TYPE_LABEL[r.type] ?? r.type}
                </TableCell>
                <TableCell className="text-[12px] tabular-nums">
                  {r.effectiveFrom}
                  {r.effectiveUntil && ` → ${r.effectiveUntil}`}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={STATUS_VARIANT[r.status]}>
                    {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {r.reviewedByName ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon-xs"
                      variant="outline"
                      onClick={() => setReviewTarget({ req: r, mode: "view" })}
                    >
                      <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                      <span className="sr-only">View</span>
                    </Button>
                    {r.status === "PENDING" && (
                      <>
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20"
                          onClick={() =>
                            setReviewTarget({ req: r, mode: "approve" })
                          }
                        >
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            size={12}
                            strokeWidth={2}
                          />
                          <span className="sr-only">Approve</span>
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="outline"
                          className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                          onClick={() =>
                            setReviewTarget({ req: r, mode: "reject" })
                          }
                        >
                          <HugeiconsIcon
                            icon={Cancel01Icon}
                            size={12}
                            strokeWidth={2}
                          />
                          <span className="sr-only">Reject</span>
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {q.data && totalPages > 1 && (
        <TablePagination
          page={page + 1}
          totalPages={totalPages}
          total={total}
          pageSize={20}
          setPage={(p) => setPage(p - 1)}
          setPageSize={() => {}}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          request={reviewTarget.req}
          mode={reviewTarget.mode}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  )
}
