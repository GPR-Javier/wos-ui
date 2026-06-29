"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useMyLeaveRequests } from "@/hooks/use-leave"
import { useMyCoeRequests } from "@/hooks/use-coe"
import { useMyOvertimeRequests } from "@/hooks/use-overtime"
import { useMyChangeTimeRequests } from "@/hooks/use-change-time"
import { useLeaveBalances } from "@/hooks/use-employee"
import {
  LEAVE_TYPE_LABEL,
  LEAVE_STATUS_LABEL,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/leave-api"
import {
  COE_PURPOSE_LABEL,
  COE_CERT_TYPE_LABEL,
  type CoeRequest,
  type CoeStatus,
} from "@/lib/coe-api"
import {
  OT_TYPE_LABEL,
  OT_STATUS_LABEL,
  type OvertimeRequest,
  type OvertimeStatus,
} from "@/lib/overtime-api"
import {
  type ChangeTimeRequest,
  type ChangeTimeStatus,
} from "@/lib/change-time-api"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Briefcase01Icon,
  File01Icon,
  Clock01Icon,
  ClockPlusIcon,
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

// ── unified request feed ────────────────────────────────────────────────────────

type RequestType = "leave" | "coe" | "dtr" | "ot"
type Bucket = "approved" | "pending" | "declined" | "neutral"

interface FeedRow {
  key: string
  type: RequestType
  title: string
  meta: string
  /** ISO timestamp used for sorting (most recent first). */
  filedAt: string
  forDate: string
  bucket: Bucket
  statusLabel: string
  remarks: string
  href: string
}

const typeLabel: Record<RequestType, string> = {
  leave: "Leave",
  coe: "COE",
  dtr: "Time change",
  ot: "Overtime",
}

const typeVariant: Record<RequestType, "blue" | "purple" | "amber" | "red"> = {
  leave: "blue",
  coe: "purple",
  dtr: "amber",
  ot: "red",
}

const bucketVariant: Record<Bucket, "green" | "amber" | "red" | "gray"> = {
  approved: "green",
  pending: "amber",
  declined: "red",
  neutral: "gray",
}

// ── status → bucket maps (color + stat grouping; granular label kept for the badge) ──

const LEAVE_BUCKET: Record<LeaveStatus, Bucket> = {
  DRAFT: "neutral",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "declined",
  RETURNED: "pending",
  CANCELLED: "neutral",
}

const COE_BUCKET: Record<CoeStatus, Bucket> = {
  DRAFT: "neutral",
  SUBMITTED: "pending",
  PENDING_REVIEW: "pending",
  APPROVED: "approved",
  REJECTED: "declined",
  RELEASED: "approved",
  COMPLETED: "approved",
}

const OT_BUCKET: Record<OvertimeStatus, Bucket> = {
  DRAFT: "neutral",
  PENDING_AUTH: "pending",
  AUTHORIZED: "pending",
  AUTH_REJECTED: "declined",
  PENDING_CLAIM: "pending",
  APPROVED: "approved",
  REJECTED: "declined",
  RETURNED: "pending",
  DECLINED: "declined",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  PENDING_EMERGENCY_CLAIM: "pending",
  PENDING: "pending",
}

const CT_BUCKET: Record<ChangeTimeStatus, Bucket> = {
  DRAFT: "neutral",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "declined",
  RETURNED: "pending",
  CANCELLED: "neutral",
}

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

const CT_TYPE_LABEL: Record<ChangeTimeRequest["requestType"], string> = {
  TIME_IN: "Time in",
  TIME_OUT: "Time out",
  BOTH: "Time in & out",
}

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

// ── normalizers ───────────────────────────────────────────────────────────────

function leaveRow(r: LeaveRequest): FeedRow {
  return {
    key: `leave-${r.id}`,
    type: "leave",
    title: `${LEAVE_TYPE_LABEL[r.leaveType]} leave`,
    meta: `${fmtRange(r.startDate, r.endDate)} · ${r.days} day${
      r.days === 1 ? "" : "s"
    }${r.reason ? ` · ${r.reason}` : ""}`,
    filedAt: r.filedAt,
    forDate: fmtRange(r.startDate, r.endDate),
    bucket: LEAVE_BUCKET[r.status],
    statusLabel: LEAVE_STATUS_LABEL[r.status],
    remarks:
      r.reviewNote ??
      (r.reviewedByName ? `Reviewed by ${r.reviewedByName}` : "—"),
    href: "/dashboard/my-leaves",
  }
}

function coeRow(r: CoeRequest): FeedRow {
  return {
    key: `coe-${r.id}`,
    type: "coe",
    title: "Certificate of employment",
    meta: `${COE_PURPOSE_LABEL[r.purpose]} · ${
      COE_CERT_TYPE_LABEL[r.certificateType]
    }`,
    filedAt: r.createdAt,
    forDate: "—",
    bucket: COE_BUCKET[r.status],
    statusLabel: COE_STATUS_LABEL[r.status],
    remarks:
      r.remarks ?? (r.approvedByName ? `Handled by ${r.approvedByName}` : "—"),
    href: "/dashboard/my-coe",
  }
}

function otRow(r: OvertimeRequest): FeedRow {
  const hours = r.totalHours ?? r.plannedHours
  return {
    key: `ot-${r.id}`,
    type: "ot",
    title: "Overtime",
    meta: `${fmtDay(r.overtimeDate)} · ${OT_TYPE_LABEL[r.overtimeType]}${
      hours != null ? ` · ${hours}h` : ""
    }`,
    filedAt: r.createdAt,
    forDate: fmtDay(r.overtimeDate),
    bucket: OT_BUCKET[r.status],
    statusLabel: OT_STATUS_LABEL[r.status],
    remarks: r.reviewNote ?? r.declineReason ?? "—",
    href: "/dashboard/my-overtime",
  }
}

function ctRow(r: ChangeTimeRequest): FeedRow {
  return {
    key: `ct-${r.id}`,
    type: "dtr",
    title: "Time correction",
    meta: `${fmtDay(r.attendanceDate)} · ${CT_TYPE_LABEL[r.requestType]}`,
    filedAt: r.createdAt,
    forDate: fmtDay(r.attendanceDate),
    bucket: CT_BUCKET[r.status],
    statusLabel: CT_STATUS_LABEL[r.status],
    remarks: r.reviewNote ?? "—",
    href: "/dashboard/my-change-time",
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

  // Live feeds — pull a generous page of each so the merged history + stats are accurate.
  const leaveQ = useMyLeaveRequests({ size: 50 })
  const coeQ = useMyCoeRequests({ size: 50 })
  const otQ = useMyOvertimeRequests({ size: 50 })
  const ctQ = useMyChangeTimeRequests({ size: 50 })
  const { data: balances = [] } = useLeaveBalances()

  const loading =
    leaveQ.isLoading || coeQ.isLoading || otQ.isLoading || ctQ.isLoading

  const rows = useMemo<FeedRow[]>(() => {
    const merged: FeedRow[] = [
      ...(leaveQ.data?.content ?? []).map(leaveRow),
      ...(coeQ.data?.content ?? []).map(coeRow),
      ...(otQ.data?.content ?? []).map(otRow),
      ...(ctQ.data?.content ?? []).map(ctRow),
    ]
    return merged.sort((a, b) => b.filedAt.localeCompare(a.filedAt))
  }, [leaveQ.data, coeQ.data, otQ.data, ctQ.data])

  // ── stats ──
  const thisYear = new Date().getFullYear()
  const stats = useMemo(() => {
    let pending = 0
    let approved = 0
    let declined = 0
    for (const r of rows) {
      const inYear = new Date(r.filedAt).getFullYear() === thisYear
      if (r.bucket === "pending") pending++
      else if (r.bucket === "approved" && inYear) approved++
      else if (r.bucket === "declined" && inYear) declined++
    }
    return { pending, approved, declined }
  }, [rows, thisYear])

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
          value={<span className="text-warning">{stats.pending}</span>}
          meta="Awaiting HR action"
          accent="amber"
        />
        <StatCard
          title="Approved this year"
          value={<span className="text-success">{stats.approved}</span>}
          meta="Across all types"
          accent="green"
        />
        <StatCard
          title="Declined"
          value={<span className="text-danger">{stats.declined}</span>}
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
            Latest activity across all request types
          </p>
        </CardHeader>
        <CardContent>
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
              {loading ? (
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
                      <p>No requests yet. File one using the cards above.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.slice(0, 15).map((r) => (
                  <TableRow
                    key={r.key}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(slugHref(r.href))}
                  >
                    <TableCell>
                      <StatusBadge variant={typeVariant[r.type]}>
                        {typeLabel[r.type]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {r.meta}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {fmtShort(r.filedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.forDate}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={bucketVariant[r.bucket]}>
                        {r.statusLabel}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {r.remarks}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
