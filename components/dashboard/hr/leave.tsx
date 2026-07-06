"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  ArrowTurnBackwardIcon,
} from "@hugeicons/core-free-icons"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
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
import { TablePagination } from "@/components/custom/table-pagination"
import {
  DateRangeFilter,
  useDateRange,
} from "@/components/custom/date-range-filter"
import { cn } from "@/lib/utils"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useAllLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useReturnLeaveRequest,
} from "@/hooks/use-leave"
import {
  LEAVE_TYPE_LABEL,
  LEAVE_STATUS_LABEL,
  LEAVE_STATUS_VARIANT,
  type LeaveRequest,
} from "@/lib/leave-api"

const STATUS_FILTERS: { label: string; value?: string }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Returned", value: "RETURNED" },
  { label: "Rejected", value: "REJECTED" },
]

export function LeaveSection() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  )
  const [returnTarget, setReturnTarget] = useState<LeaveRequest | null>(null)
  const [returnNote, setReturnNote] = useState("")
  const { range, setRange } = useDateRange()

  const { data, isLoading, isError } = useAllLeaveRequests({
    status: statusFilter,
    from: range.from,
    to: range.until,
    page: page - 1,
    size: pageSize,
  })
  const approveMutation = useApproveLeaveRequest()
  const rejectMutation = useRejectLeaveRequest()
  const returnMutation = useReturnLeaveRequest()

  const requests = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold">Leave requests</h3>
          <DateRangeFilter
            value={range}
            onChange={(v) => {
              setRange(v)
              setPage(1)
            }}
          />
        </div>
        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setStatusFilter(f.value)
                setPage(1)
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

      {isError && (
        <p className="rounded-lg border border-danger-border bg-danger-light px-4 py-3 text-[13px] text-danger">
          Failed to load leave requests
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Employee",
              "Type",
              "From",
              "To",
              "Days",
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
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : requests.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                No leave requests
              </TableCell>
            </TableRow>
          ) : (
            requests.map((r) => {
              const initials = r.employeeName
                .split(" ")
                .map((n) => n[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase()
              return (
                <TableRow key={r.id} data-testid="leave-mgmt-row">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials}
                      </div>
                      <span className="font-medium">{r.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {LEAVE_TYPE_LABEL[r.leaveType]}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {r.startDate}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {r.endDate}
                  </TableCell>
                  <TableCell className="text-center">{r.days}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {r.filedAt?.split("T")[0]}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={LEAVE_STATUS_VARIANT[r.status]}>
                      {LEAVE_STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "PENDING" && (
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              variant="outline"
                              data-testid="leave-approve"
                              className="border-success-border text-success hover:bg-gbg"
                              disabled={approveMutation.isPending}
                              onClick={() =>
                                approveMutation.mutate({ id: r.id })
                              }
                            >
                              <HugeiconsIcon
                                icon={CheckmarkCircle01Icon}
                                size={12}
                                strokeWidth={2.5}
                              />
                              <span className="sr-only">Approve</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Approve</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              variant="outline"
                              data-testid="leave-return"
                              className="border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-900/40"
                              disabled={returnMutation.isPending}
                              onClick={() => {
                                setReturnNote("")
                                setReturnTarget(r)
                              }}
                            >
                              <HugeiconsIcon
                                icon={ArrowTurnBackwardIcon}
                                size={12}
                                strokeWidth={2.5}
                              />
                              <span className="sr-only">Return</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Return for revision</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              variant="outline"
                              data-testid="leave-reject"
                              className="border-danger-border text-danger hover:bg-rbg"
                              disabled={rejectMutation.isPending}
                              onClick={() =>
                                rejectMutation.mutate({ id: r.id })
                              }
                            >
                              <HugeiconsIcon
                                icon={Cancel01Icon}
                                size={12}
                                strokeWidth={2.5}
                              />
                              <span className="sr-only">Decline</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Decline</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        setPage={setPage}
        setPageSize={setPageSize}
      />

      {/* Return-for-revision dialog — mounted only while a target is selected, so
          `returnTarget` is guaranteed non-null inside (mirrors the OB review modal). */}
      {returnTarget && (
        <Dialog open onOpenChange={(v) => !v && setReturnTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Return for revision</DialogTitle>
              <DialogDescription>
                {`Send ${returnTarget.employeeName}'s leave request back to be revised.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                What needs to be revised?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                className="min-h-20 resize-none text-[13px]"
                placeholder="Shown to the employee…"
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={returnMutation.isPending}
                onClick={() => setReturnTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                data-testid="leave-review-return"
                disabled={!returnNote.trim() || returnMutation.isPending}
                onClick={() =>
                  returnMutation.mutate(
                    { id: returnTarget.id, reviewNote: returnNote.trim() },
                    { onSuccess: () => setReturnTarget(null) }
                  )
                }
              >
                {returnMutation.isPending
                  ? "Returning…"
                  : "Return for revision"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
