"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/date-range-picker"
import { TablePagination } from "@/components/custom/table-pagination"
import { LeaveModal } from "@/components/custom/leave-modal"
import { ObModal } from "@/components/custom/ob-modal"
import { CoeRequestModal } from "@/components/custom/coe-request-modal"
import { ChangeTimeRequestDialog } from "@/components/custom/change-time-request-dialog"
import { OvertimeAuthorizeDialog } from "@/components/custom/overtime-authorize-dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useSlugHref } from "@/lib/slug"
import { useLeaveBalances } from "@/hooks/use-employee"
import { useMyRequestFeed } from "@/hooks/use-request-feed"
import {
  type RequestSummary,
  type RequestKind,
  type RequestBucket,
} from "@/lib/requests-api"
import {
  LEAVE_TYPE_LABEL,
  LEAVE_STATUS_LABEL,
  type LeaveType,
  type LeaveStatus,
} from "@/lib/leave-api"
import {
  COE_PURPOSE_LABEL,
  COE_CERT_TYPE_LABEL,
  type CoePurpose,
  type CoeCertificateType,
  type CoeStatus,
} from "@/lib/coe-api"
import {
  OT_TYPE_LABEL,
  OT_STATUS_LABEL,
  type OvertimeType,
  type OvertimeStatus,
} from "@/lib/overtime-api"
import {
  type ChangeTimeStatus,
  type ChangeTimeRequestType,
} from "@/lib/change-time-api"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Briefcase01Icon,
  File01Icon,
  Clock01Icon,
  ClockPlusIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

// ── request type cards ────────────────────────────────────────────────────────

type Accent = "primary" | "success" | "violet" | "warning" | "danger"

const accentStyles: Record<
  Accent,
  { card: string; icon: string; iconStroke: string }
> = {
  primary: {
    card: "hover:border-primary/60 hover:bg-primary/5",
    icon: "bg-primary/10",
    iconStroke: "text-primary",
  },
  success: {
    card: "hover:border-success hover:bg-success-light",
    icon: "bg-success-light",
    iconStroke: "text-success",
  },
  violet: {
    card: "hover:border-violet hover:bg-violet-light",
    icon: "bg-violet-light",
    iconStroke: "text-violet",
  },
  warning: {
    card: "hover:border-warning hover:bg-warning-light",
    icon: "bg-warning-light",
    iconStroke: "text-warning",
  },
  danger: {
    card: "hover:border-danger hover:bg-danger-light",
    icon: "bg-danger-light",
    iconStroke: "text-danger",
  },
}

function RequestTypeCard({
  icon,
  title,
  description,
  accent,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  accent: Accent
  onClick: () => void
}) {
  const s = accentStyles[accent]
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-150",
        "hover:-translate-y-0.5 hover:shadow-md",
        s.card
      )}
    >
      <div
        className={cn(
          "mb-2.5 flex size-9 items-center justify-center rounded-lg",
          s.icon,
          s.iconStroke
        )}
      >
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
    </button>
  )
}

// ── feed display mapping ────────────────────────────────────────────────────────

type DisplayType = "leave" | "coe" | "dtr" | "ot"

const typeLabel: Record<DisplayType, string> = {
  leave: "Leave",
  coe: "COE",
  dtr: "Time change",
  ot: "Overtime",
}

const typeVariant: Record<DisplayType, "blue" | "purple" | "amber" | "red"> = {
  leave: "blue",
  coe: "purple",
  dtr: "amber",
  ot: "red",
}

const bucketVariant: Record<RequestBucket, "green" | "amber" | "red" | "gray"> =
  {
    APPROVED: "green",
    PENDING: "amber",
    DECLINED: "red",
    NEUTRAL: "gray",
  }

// Granular status labels not exported by their api modules.
const COE_STATUS_LABEL: Record<CoeStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RELEASED: "Released",
  COMPLETED: "Completed",
}

const CT_STATUS_LABEL: Record<ChangeTimeStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Needs revision",
  CANCELLED: "Cancelled",
}

const CT_TYPE_LABEL: Record<ChangeTimeRequestType, string> = {
  TIME_IN: "Time in",
  TIME_OUT: "Time out",
  BOTH: "Time in & out",
}

const TYPE_FILTERS: { label: string; value?: RequestKind }[] = [
  { label: "All" },
  { label: "Leave", value: "LEAVE" },
  { label: "COE", value: "COE" },
  { label: "Overtime", value: "OVERTIME" },
  { label: "Time change", value: "CHANGE_TIME" },
]

const PAGE_SIZE = 10

// ── date helpers ────────────────────────────────────────────────────────────────

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function fmtDay(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function fmtRange(start: string, end: string) {
  return start === end ? fmtDay(start) : `${fmtDay(start)}–${fmtDay(end)}`
}

interface DisplayRow {
  type: DisplayType
  title: string
  meta: string
  forDate: string
  statusLabel: string
  href: string
}

function describe(r: RequestSummary): DisplayRow {
  switch (r.type) {
    case "LEAVE":
      return {
        type: "leave",
        title: `${LEAVE_TYPE_LABEL[r.leaveType as LeaveType]} leave`,
        meta: `${fmtRange(r.startDate!, r.endDate!)} · ${r.days} day${
          r.days === 1 ? "" : "s"
        }${r.reason ? ` · ${r.reason}` : ""}`,
        forDate: fmtRange(r.startDate!, r.endDate!),
        statusLabel: LEAVE_STATUS_LABEL[r.status as LeaveStatus],
        href: "/dashboard/my-leaves",
      }
    case "COE":
      return {
        type: "coe",
        title: "Certificate of employment",
        meta: `${COE_PURPOSE_LABEL[r.purpose as CoePurpose]} · ${
          COE_CERT_TYPE_LABEL[r.certificateType as CoeCertificateType]
        }`,
        forDate: "—",
        statusLabel: COE_STATUS_LABEL[r.status as CoeStatus],
        href: "/dashboard/my-coe",
      }
    case "OVERTIME":
      return {
        type: "ot",
        title: "Overtime",
        meta: `${fmtDay(r.overtimeDate!)} · ${
          OT_TYPE_LABEL[r.overtimeType as OvertimeType]
        }${r.hours != null ? ` · ${r.hours}h` : ""}`,
        forDate: fmtDay(r.overtimeDate!),
        statusLabel: OT_STATUS_LABEL[r.status as OvertimeStatus],
        href: "/dashboard/my-overtime",
      }
    case "CHANGE_TIME":
      return {
        type: "dtr",
        title: "Time correction",
        meta: `${fmtDay(r.attendanceDate!)} · ${
          CT_TYPE_LABEL[r.requestType as ChangeTimeRequestType]
        }`,
        forDate: fmtDay(r.attendanceDate!),
        statusLabel: CT_STATUS_LABEL[r.status as ChangeTimeStatus],
        href: "/dashboard/my-change-time",
      }
  }
}

// ── main component ────────────────────────────────────────────────────────────

export function RequestSection() {
  const router = useRouter()
  const slugHref = useSlugHref()

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [obOpen, setObOpen] = useState(false)
  const [coeOpen, setCoeOpen] = useState(false)
  const [dtrOpen, setDtrOpen] = useState(false)
  const [otOpen, setOtOpen] = useState(false)

  // ── filters + pagination (server-side) ──
  const [type, setType] = useState<RequestKind | undefined>(undefined)
  const [status, setStatus] = useState<RequestBucket | undefined>(undefined)
  const [range, setRange] = useState<DateRangeValue | null>(null)
  const [page, setPage] = useState(0)

  function resetTo(fn: () => void) {
    fn()
    setPage(0)
  }

  const from = range?.from || undefined
  const to = range?.until || undefined

  const feedQ = useMyRequestFeed({
    type,
    status,
    from,
    to,
    page,
    size: PAGE_SIZE,
  })
  const rows = feedQ.data?.content ?? []
  const total = feedQ.data?.totalElements ?? 0
  const totalPages = feedQ.data?.totalPages ?? 0
  const hasFilters = !!type || !!status || !!range

  // ── stats (lightweight server counts; size 1 → read totalElements) ──
  const yearStart = `${new Date().getFullYear()}-01-01`
  const { data: balances = [] } = useLeaveBalances()
  const pendingQ = useMyRequestFeed({ status: "PENDING", size: 1 })
  const approvedQ = useMyRequestFeed({
    status: "APPROVED",
    from: yearStart,
    size: 1,
  })
  const declinedQ = useMyRequestFeed({
    status: "DECLINED",
    from: yearStart,
    size: 1,
  })

  // Credit pools — a single FLEXI pool when enabled, else the dedicated types.
  const CREDIT_LABEL: Record<string, string> = {
    VACATION: "vacation",
    SICK: "sick",
    EMERGENCY: "emergency",
    FLEXI: "flexible",
  }
  const pools = balances.filter((b) => b.type in CREDIT_LABEL)
  const leaveRemaining = pools.reduce((s, b) => s + b.remaining, 0)
  const leaveMeta =
    pools.length > 0
      ? pools.map((b) => `${b.remaining} ${CREDIT_LABEL[b.type]}`).join(" · ")
      : "No leave credits"

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <p className="text-[15px] font-semibold">Requests</p>
        <p className="text-sm text-muted-foreground">
          File and track all your workplace requests
        </p>
      </div>

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Leave balance"
          value={
            <>
              {leaveRemaining}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                days
              </span>
            </>
          }
          meta={leaveMeta}
          accent="blue"
        />
        <StatCard
          title="Pending requests"
          value={
            <span className="text-warning">
              {pendingQ.data?.totalElements ?? 0}
            </span>
          }
          meta="Awaiting HR action"
          accent="amber"
        />
        <StatCard
          title="Approved this year"
          value={
            <span className="text-success">
              {approvedQ.data?.totalElements ?? 0}
            </span>
          }
          meta="Across all types"
          accent="green"
        />
        <StatCard
          title="Declined"
          value={
            <span className="text-danger">
              {declinedQ.data?.totalElements ?? 0}
            </span>
          }
          meta="This year"
          accent="red"
        />
      </div>

      {/* ── Request type cards ── */}
      <div className="grid grid-cols-5 gap-3">
        <RequestTypeCard
          accent="primary"
          title="Leave request"
          description="Vacation, sick, emergency or maternity/paternity"
          onClick={() => setLeaveOpen(true)}
          icon={
            <HugeiconsIcon icon={Calendar01Icon} size={18} strokeWidth={1.8} />
          }
        />
        <RequestTypeCard
          accent="success"
          title="Official business"
          description="Request time off for work-related activities"
          onClick={() => setObOpen(true)}
          icon={
            <HugeiconsIcon icon={Briefcase01Icon} size={18} strokeWidth={1.8} />
          }
        />
        <RequestTypeCard
          accent="violet"
          title="Certificate of employment"
          description="Request an official COE document"
          onClick={() => setCoeOpen(true)}
          icon={<HugeiconsIcon icon={File01Icon} size={18} strokeWidth={1.8} />}
        />
        <RequestTypeCard
          accent="warning"
          title="Change time in/out"
          description="Request a correction to your DTR record"
          onClick={() => setDtrOpen(true)}
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={18} strokeWidth={1.8} />
          }
        />
        <RequestTypeCard
          accent="danger"
          title="Overtime request"
          description="Pre-authorize overtime hours before you work"
          onClick={() => setOtOpen(true)}
          icon={
            <HugeiconsIcon icon={ClockPlusIcon} size={18} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Request history ── */}
      <Card>
        <CardHeader>
          <CardTitle>Request history</CardTitle>
          <p className="text-[12px] text-muted-foreground">
            Activity across all request types
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type — segmented control */}
            <div className="flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => resetTo(() => setType(f.value))}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                    type === f.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Status + date range + clear — right-aligned */}
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <Select
                value={status ?? "ALL"}
                onValueChange={(v) =>
                  resetTo(() =>
                    setStatus(v === "ALL" ? undefined : (v as RequestBucket))
                  )
                }
              >
                <SelectTrigger className="h-9 w-35 text-[12px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DECLINED">Declined</SelectItem>
                </SelectContent>
              </Select>

              <DateRangePicker
                value={range}
                onChange={(v) => resetTo(() => setRange(v))}
                align="end"
                className="w-62 text-[12px]"
                fromPlaceholder="From"
                untilPlaceholder="To"
              />

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 text-[12px] text-muted-foreground"
                  onClick={() =>
                    resetTo(() => {
                      setType(undefined)
                      setStatus(undefined)
                      setRange(null)
                    })
                  }
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={13}
                    strokeWidth={2}
                  />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Type",
                  "Details",
                  "Date filed",
                  "For date",
                  "Status",
                  "Remarks",
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedQ.isLoading ? (
                [0, 1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    {[0, 1, 2, 3, 4, 5].map((j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-3 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-[13px] text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <HugeiconsIcon
                        icon={File01Icon}
                        size={28}
                        strokeWidth={1.3}
                        className="text-muted-foreground/30"
                      />
                      <p>
                        {hasFilters
                          ? "No requests match these filters."
                          : "No requests yet. File one using the cards above."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const d = describe(r)
                  return (
                    <TableRow
                      key={`${r.type}-${r.id}`}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => router.push(slugHref(d.href))}
                    >
                      <TableCell>
                        <StatusBadge variant={typeVariant[d.type]}>
                          {typeLabel[d.type]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {d.meta}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {fmtShort(r.filedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.forDate}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={bucketVariant[r.bucket]}>
                          {d.statusLabel}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {r.remarks ?? "—"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <TablePagination
              page={page + 1}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              setPage={(p) => setPage(p - 1)}
              setPageSize={() => {}}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      <LeaveModal open={leaveOpen} onClose={() => setLeaveOpen(false)} />
      <ObModal open={obOpen} onClose={() => setObOpen(false)} />
      <CoeRequestModal open={coeOpen} onClose={() => setCoeOpen(false)} />
      <ChangeTimeRequestDialog
        open={dtrOpen}
        onClose={() => setDtrOpen(false)}
      />
      <OvertimeAuthorizeDialog open={otOpen} onClose={() => setOtOpen(false)} />
    </div>
  )
}
