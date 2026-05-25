"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Airplane01Icon,
  Search01Icon,
  EyeIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  UserCircleIcon,
  Clock01Icon,
  Alert01Icon,
  Location01Icon,
  Calendar01Icon,
  DocumentAttachmentIcon,
  Tick01Icon,
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
  useAllBusinessTrips,
  useApproveBusinessTrip,
  useRejectBusinessTrip,
  useCompleteBusinessTrip,
} from "@/hooks/use-business-trip"
import {
  TRIP_PURPOSE_LABEL,
  TRIP_PURPOSE_COLOR,
  TRAVEL_MODE_LABEL,
  TRANSPORT_TYPE_LABEL,
  tripDays,
  type BusinessTrip,
  type TripStatus,
} from "@/lib/business-trip-api"

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  TripStatus,
  "amber" | "green" | "red" | "blue" | "gray"
> = {
  DRAFT: "gray",
  SUBMITTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  COMPLETED: "blue",
  CANCELLED: "gray",
}

const STATUS_LABEL: Record<TripStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const STATUS_FILTERS: { label: string; value?: TripStatus }[] = [
  { label: "All" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Rejected", value: "REJECTED" },
]

type ReviewMode = "view" | "approve" | "reject" | "complete"

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function fmtPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  trip,
  mode,
  onClose,
}: {
  trip: BusinessTrip
  mode: ReviewMode
  onClose: () => void
}) {
  const [note, setNote] = useState(trip.reviewNote ?? "")

  const approve = useApproveBusinessTrip()
  const reject = useRejectBusinessTrip()
  const complete = useCompleteBusinessTrip()

  const busy = approve.isPending || reject.isPending || complete.isPending

  function handleSubmit() {
    const p = { id: trip.id, reviewNote: note || null }
    if (mode === "approve") approve.mutate(p, { onSuccess: onClose })
    else if (mode === "reject") reject.mutate(p, { onSuccess: onClose })
    else if (mode === "complete") complete.mutate(p, { onSuccess: onClose })
  }

  const titleMap: Record<ReviewMode, string> = {
    view: "Trip Details",
    approve: "Approve Trip Request",
    reject: "Reject Trip Request",
    complete: "Mark Trip Completed",
  }

  const days = tripDays(trip.departureDate, trip.returnDate)

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
            {mode === "complete" && (
              <span className="flex size-6 items-center justify-center rounded-full bg-blue-100">
                <HugeiconsIcon icon={Tick01Icon} size={13} strokeWidth={2} className="text-blue-600" />
              </span>
            )}
            {(mode === "view") && (
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={Airplane01Icon} size={13} strokeWidth={2} className="text-primary" />
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
              <p className="truncate text-[13px] font-semibold text-foreground">{trip.userName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{trip.userEmail}</p>
            </div>
            <StatusBadge variant={STATUS_VARIANT[trip.status]} className="shrink-0">
              {STATUS_LABEL[trip.status]}
            </StatusBadge>
          </div>

          {/* Destination + dates */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <HugeiconsIcon icon={Location01Icon} size={13} strokeWidth={2} className="text-primary" />
              {trip.destination}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
              <HugeiconsIcon icon={Calendar01Icon} size={12} strokeWidth={1.8} />
              {fmtDate(trip.departureDate)} → {fmtDate(trip.returnDate)}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                {days} day{days !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Purpose, mode, transport */}
          <div className="grid grid-cols-3 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Purpose</p>
              <p className="mt-0.5 font-semibold text-foreground">{TRIP_PURPOSE_LABEL[trip.purpose]}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Travel Mode</p>
              <p className="mt-0.5 font-semibold text-foreground">{TRAVEL_MODE_LABEL[trip.travelMode]}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Transport</p>
              <p className="mt-0.5 font-semibold text-foreground">{TRANSPORT_TYPE_LABEL[trip.transportType]}</p>
            </div>
          </div>

          {/* Budget */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Total Budget</span>
              <span className="text-[14px] font-bold tabular-nums text-foreground">
                {fmtPeso(trip.estimatedBudget)}
              </span>
            </div>
            {trip.budgetAllocation && (
              <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                {(
                  [
                    { label: "Transportation", value: trip.budgetAllocation.transportation },
                    { label: "Accommodation", value: trip.budgetAllocation.accommodation },
                    { label: "Meals & Per Diem", value: trip.budgetAllocation.meals },
                    { label: "Miscellaneous", value: trip.budgetAllocation.miscellaneous },
                  ] as const
                ).map(
                  ({ label, value }) =>
                    value > 0 && (
                      <div key={label} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="tabular-nums text-foreground">{fmtPeso(value)}</span>
                      </div>
                    )
                )}
              </div>
            )}
          </div>

          {/* Accommodation */}
          {trip.accommodation && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <p className="text-muted-foreground">Accommodation</p>
              <p className="mt-0.5 font-semibold text-foreground">{trip.accommodation}</p>
            </div>
          )}

          {/* Employee remarks */}
          {trip.remarks && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Employee Remarks
              </p>
              <p className="text-[12px] italic text-foreground">&ldquo;{trip.remarks}&rdquo;</p>
            </div>
          )}

          {/* Attachments */}
          {trip.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments ({trip.attachmentUrls.length})
              </p>
              {trip.attachmentUrls.map((url, i) => (
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

          <p className="text-[11px] text-muted-foreground">Filed {fmtDate(trip.createdAt.split("T")[0])}</p>

          {/* Existing review note (view) */}
          {mode === "view" && trip.reviewNote && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                Admin Notes
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">{trip.reviewNote}</p>
              {trip.reviewedByName && (
                <p className="mt-1 text-[11px] text-blue-500">— {trip.reviewedByName}</p>
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
                className="min-h-18 resize-none text-[13px]"
                placeholder={
                  mode === "reject"
                    ? "Reason for rejection (shown to employee)…"
                    : mode === "complete"
                      ? "Trip completion notes…"
                      : "Approval notes or instructions…"
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
              {busy ? "Approving…" : "Approve Trip"}
            </Button>
          )}
          {mode === "reject" && (
            <Button size="sm" variant="destructive" disabled={busy || !note.trim()} onClick={handleSubmit}>
              {busy ? "Rejecting…" : "Reject Trip"}
            </Button>
          )}
          {mode === "complete" && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={busy} onClick={handleSubmit}>
              {busy ? "Updating…" : "Mark Completed"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BusinessTripManagementSection() {
  const [statusFilter, setStatusFilter] = useState<TripStatus | undefined>("SUBMITTED")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [reviewTarget, setReviewTarget] = useState<{
    trip: BusinessTrip
    mode: ReviewMode
  } | null>(null)

  const q = useAllBusinessTrips({ status: statusFilter, search: search || undefined, page, size: 20 })
  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const summaryQ = useAllBusinessTrips({ size: 200 })
  const all = summaryQ.data?.content ?? []
  const counts = {
    total: all.length,
    submitted: all.filter((r) => r.status === "SUBMITTED").length,
    approved: all.filter((r) => r.status === "APPROVED").length,
    totalBudget: all
      .filter((r) => r.status === "APPROVED" || r.status === "SUBMITTED")
      .reduce((s, r) => s + r.estimatedBudget, 0),
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[16px] font-bold text-foreground">Business Trip</h1>
        <p className="text-[12px] text-muted-foreground">
          Review and approve employee business travel requests
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Trips"
          value={counts.total}
          meta="All time"
          accent="blue"
          icon={<HugeiconsIcon icon={Airplane01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Submitted"
          value={<span className="text-warning">{counts.submitted}</span>}
          meta="Awaiting approval"
          accent="amber"
          icon={<HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Approved"
          value={<span className="text-success">{counts.approved}</span>}
          meta="Ongoing / upcoming"
          accent="green"
          icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Open Budget"
          value={
            counts.totalBudget > 0 ? (
              <>
                ₱{(counts.totalBudget / 1000).toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">K</span>
              </>
            ) : (
              <span className="text-success">₱0</span>
            )
          }
          meta="Pending + approved trips"
          accent={counts.totalBudget > 0 ? "amber" : "green"}
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
              </button>
            ))}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {["Employee", "Destination", "Purpose", "Dates", "Budget", "Status", "Actions"].map((h) => (
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
                    <HugeiconsIcon icon={Airplane01Icon} size={28} strokeWidth={1.3} className="text-muted-foreground/30" />
                    <p>No business trip requests found.</p>
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
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                      <HugeiconsIcon icon={Location01Icon} size={12} strokeWidth={2} className="shrink-0 text-muted-foreground" />
                      {r.destination}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{TRAVEL_MODE_LABEL[r.travelMode]}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={TRIP_PURPOSE_COLOR[r.purpose]} dot={false}>
                      {TRIP_PURPOSE_LABEL[r.purpose]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    <p className="tabular-nums">{fmtDate(r.departureDate)}</p>
                    <p className="tabular-nums">→ {fmtDate(r.returnDate)}</p>
                  </TableCell>
                  <TableCell className="text-[13px] font-semibold tabular-nums text-foreground">
                    {fmtPeso(r.estimatedBudget)}
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
                        onClick={() => setReviewTarget({ trip: r, mode: "view" })}
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
                            onClick={() => setReviewTarget({ trip: r, mode: "approve" })}
                            title="Approve"
                          >
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={2} />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="outline"
                            className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                            onClick={() => setReviewTarget({ trip: r, mode: "reject" })}
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
                          onClick={() => setReviewTarget({ trip: r, mode: "complete" })}
                          title="Mark completed"
                        >
                          <HugeiconsIcon icon={Tick01Icon} size={12} strokeWidth={2} />
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
          trip={reviewTarget.trip}
          mode={reviewTarget.mode}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  )
}
