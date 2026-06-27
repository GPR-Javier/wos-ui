"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { LeaveModal } from "@/components/custom/leave-modal"
import { ObModal } from "@/components/custom/ob-modal"
import { CoeModal } from "@/components/custom/coe-modal"
import { ChangeTimeRequestDialog } from "@/components/custom/change-time-request-dialog"
import { OvertimeModal } from "@/components/custom/overtime-modal"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
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

// ── request history ───────────────────────────────────────────────────────────

type RequestType = "leave" | "ob" | "coe" | "dtr" | "ot"
type RequestStatus = "approved" | "pending" | "declined"

interface RequestRecord {
  type: RequestType
  title: string
  meta: string
  filed: string
  forDate: string
  status: RequestStatus
  remarks: string
}

const REQUEST_HISTORY: RequestRecord[] = [
  {
    type: "leave",
    title: "Vacation leave",
    meta: "Jun 14–16 · 3 days · Family trip",
    filed: "Jun 7",
    forDate: "Jun 14–16",
    status: "approved",
    remarks: "Approved by Sandra R.",
  },
  {
    type: "ob",
    title: "Client meeting — Makati",
    meta: "Full day · off-site",
    filed: "Jun 5",
    forDate: "Jun 6",
    status: "approved",
    remarks: "Approved by Sandra R.",
  },
  {
    type: "coe",
    title: "Certificate of employment",
    meta: "For loan application",
    filed: "May 30",
    forDate: "—",
    status: "pending",
    remarks: "Under HR review",
  },
  {
    type: "dtr",
    title: "Missed clock-out",
    meta: "May 28 · Requested time out: 18:00",
    filed: "May 30",
    forDate: "May 28",
    status: "pending",
    remarks: "Awaiting HR approval",
  },
  {
    type: "leave",
    title: "Sick leave",
    meta: "May 22 · 1 day · Flu",
    filed: "May 22",
    forDate: "May 22",
    status: "approved",
    remarks: "Auto-approved",
  },
  {
    type: "ob",
    title: "Training — BGC",
    meta: "Half day AM",
    filed: "May 10",
    forDate: "May 15",
    status: "declined",
    remarks: "Scheduling conflict",
  },
]

const typeLabel: Record<RequestType, string> = {
  leave: "Leave",
  ob: "Official biz",
  coe: "COE",
  dtr: "DTR change",
  ot: "Overtime",
}

const typeVariant: Record<
  RequestType,
  "blue" | "green" | "purple" | "amber" | "red"
> = {
  leave: "blue",
  ob: "green",
  coe: "purple",
  dtr: "amber",
  ot: "red",
}

const statusVariant: Record<RequestStatus, "green" | "amber" | "red"> = {
  approved: "green",
  pending: "amber",
  declined: "red",
}

// ── main component ────────────────────────────────────────────────────────────

export function RequestSection() {
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [obOpen, setObOpen] = useState(false)
  const [coeOpen, setCoeOpen] = useState(false)
  const [dtrOpen, setDtrOpen] = useState(false)
  const [otOpen, setOtOpen] = useState(false)

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
              14{" "}
              <span className="text-sm font-normal text-muted-foreground">
                days
              </span>
            </>
          }
          meta="8 vacation · 4 sick · 2 emergency"
          accent="blue"
        />
        <StatCard
          title="Pending requests"
          value={<span className="text-warning">2</span>}
          meta="Awaiting HR action"
          accent="amber"
        />
        <StatCard
          title="Approved this year"
          value={<span className="text-success">7</span>}
          meta="Across all types"
          accent="green"
        />
        <StatCard
          title="Declined"
          value={<span className="text-danger">1</span>}
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
          description="File pre-approved overtime hours for compensation"
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
          <p className="text-[12px] text-muted-foreground">All time</p>
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
              {REQUEST_HISTORY.map((r, i) => (
                <TableRow key={i}>
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
                  <TableCell className="text-muted-foreground">
                    {r.filed}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.forDate}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={statusVariant[r.status]}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {r.remarks}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      <LeaveModal open={leaveOpen} onClose={() => setLeaveOpen(false)} />
      <ObModal open={obOpen} onClose={() => setObOpen(false)} />
      <CoeModal open={coeOpen} onClose={() => setCoeOpen(false)} />
      <ChangeTimeRequestDialog
        open={dtrOpen}
        onClose={() => setDtrOpen(false)}
      />
      <OvertimeModal open={otOpen} onClose={() => setOtOpen(false)} />
    </div>
  )
}
