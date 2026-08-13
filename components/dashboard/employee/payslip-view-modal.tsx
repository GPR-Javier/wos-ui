"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon } from "@hugeicons/core-free-icons"
import { PayslipDocument } from "@/components/dashboard/payroll/payslip-document"
import { figuresFromPayslip, type PayslipRecord } from "@/lib/payslip-figures"
import { payrollApi } from "@/lib/payroll-api"

/**
 * An employee's own payslip, rendered through the company's configured template — the same
 * component the payroll preview uses.
 *
 * <p>Replaces a hand-built layout that showed only the four statutory deductions, so an employee
 * saw a total they could not reconcile against the lines above it: named deductions and allowances
 * existed in the figures but never on the page.
 */
export function PayslipViewModal({
  open,
  onClose,
  payslip,
}: {
  open: boolean
  onClose: () => void
  payslip: PayslipRecord | null
}) {
  if (!payslip) return null

  const period =
    payslip.payrollRun?.period ??
    `${payslip.periodStart ?? ""} – ${payslip.periodEnd ?? ""}`

  const download = () => {
    if (payslip.id == null) return
    payrollApi.downloadPdf(
      payslip.id,
      `payslip-${period.replace(/\s+/g, "-").toLowerCase()}.pdf`
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{period}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            {payslip.periodStart} → {payslip.periodEnd}
          </p>
          {/* The PDF is generated from the same template, so it matches what's shown below. */}
          {payslip.id != null && (
            <Button size="sm" variant="outline" onClick={download}>
              <HugeiconsIcon icon={Download01Icon} size={13} strokeWidth={2} />
              Download PDF
            </Button>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <PayslipDocument figures={figuresFromPayslip(payslip)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
