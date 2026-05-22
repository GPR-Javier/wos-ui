"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download01Icon,
  Cancel01Icon,
  FileSpreadsheetIcon,
} from "@hugeicons/core-free-icons"
import { payrollApi, type AdminPayslip } from "@/lib/payroll-api"
import { StatusBadge } from "@/components/custom/status-badge"

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Row({
  label,
  value,
  valueClass,
  bold,
}: {
  label: string
  value: string
  valueClass?: string
  bold?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-border py-2.5 last:border-0 ${bold ? "font-semibold" : ""}`}
    >
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={`text-[13px] tabular-nums ${valueClass ?? "text-foreground"} ${bold ? "font-bold" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="-mx-6 bg-muted px-6 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
    </div>
  )
}

interface Props {
  payslip: AdminPayslip | null
  open: boolean
  onClose: () => void
}

export function PayslipDetail({ payslip, open, onClose }: Props) {
  if (!payslip) return null

  const initials =
    payslip.employeeName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  function handlePdf() {
    payrollApi.downloadPdf(
      payslip!.id,
      `payslip_${payslip!.employeeId}_${payslip!.period.replace(/\s/g, "_")}.pdf`
    )
  }

  function handleExcel() {
    payrollApi.downloadExcel(
      payslip!.id,
      `payslip_${payslip!.employeeId}_${payslip!.period.replace(/\s/g, "_")}.xlsx`
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[480px] gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          Payslip — {payslip.employeeName}
        </DialogTitle>

        {/* Header */}
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                Payslip
              </p>
              <p className="mt-1 text-lg font-bold">{payslip.period}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg border border-white/30 bg-white/15 text-xs text-white hover:bg-white/25"
                onClick={handlePdf}
              >
                <HugeiconsIcon icon={Download01Icon} size={13} strokeWidth={2} className="mr-1" />
                PDF
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg border border-white/30 bg-white/15 text-xs text-white hover:bg-white/25"
                onClick={handleExcel}
              >
                <HugeiconsIcon icon={FileSpreadsheetIcon} size={13} strokeWidth={2} className="mr-1" />
                Excel
              </Button>
              <DialogClose asChild>
                <button className="flex size-7 items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25">
                  <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2.5} />
                  <span className="sr-only">Close</span>
                </button>
              </DialogClose>
            </div>
          </div>

          {/* Employee info */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-[12px] font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-[14px] font-semibold">{payslip.employeeName}</p>
              <p className="text-[12px] opacity-75">
                {payslip.position} · {payslip.employeeId}
              </p>
              <p className="text-[11px] opacity-60">
                Team Leader: {payslip.teamLeader}
              </p>
            </div>
            <div className="ml-auto">
              <StatusBadge
                variant={
                  payslip.status === "released"
                    ? "green"
                    : payslip.status === "generated"
                      ? "blue"
                      : "gray"
                }
                dot={false}
                className="border-white/30 bg-white/15 text-white"
              >
                {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
              </StatusBadge>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
          {/* Earnings */}
          <SectionHeader title="Earnings" />
          <Row label="Basic Salary" value={fmt(payslip.basicSalary)} />
          <Row
            label="Incentives"
            value={`+${fmt(payslip.incentives)}`}
            valueClass="text-success"
          />
          <Row
            label="Gross Pay"
            value={fmt(payslip.grossPay)}
            bold
          />

          {/* Deductions */}
          <SectionHeader title="Deductions" />
          <Row
            label="Absences"
            value={payslip.absences > 0 ? `-${fmt(payslip.absences)}` : "—"}
            valueClass={payslip.absences > 0 ? "text-danger" : "text-muted-foreground"}
          />
          <Row
            label="Late Penalties"
            value={payslip.latePenalties > 0 ? `-${fmt(payslip.latePenalties)}` : "—"}
            valueClass={payslip.latePenalties > 0 ? "text-danger" : "text-muted-foreground"}
          />
          <Row
            label="Cash Advances"
            value={payslip.cashAdvances > 0 ? `-${fmt(payslip.cashAdvances)}` : "—"}
            valueClass={payslip.cashAdvances > 0 ? "text-danger" : "text-muted-foreground"}
          />
          <Row
            label="SSS Contribution"
            value={`-${fmt(payslip.sss)}`}
            valueClass="text-danger"
          />
          <Row
            label="PhilHealth"
            value={`-${fmt(payslip.philhealth)}`}
            valueClass="text-danger"
          />
          <Row
            label="Pag-IBIG"
            value={`-${fmt(payslip.pagibig)}`}
            valueClass="text-danger"
          />
          <Row
            label="Withholding Tax"
            value={`-${fmt(payslip.tax)}`}
            valueClass="text-danger"
          />
          <Row
            label="Total Deductions"
            value={`-${fmt(payslip.totalDeductions)}`}
            valueClass="text-danger"
            bold
          />

          {/* Net pay */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted p-4">
            <span className="text-sm font-bold text-foreground">Net Pay</span>
            <span className="text-xl font-bold text-success">
              {fmt(payslip.netPay)}
            </span>
          </div>

          {payslip.releasedAt && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Released on{" "}
              {new Date(payslip.releasedAt).toLocaleDateString("en-PH", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
