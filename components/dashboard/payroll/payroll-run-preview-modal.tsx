"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert01Icon,
  ArrowLeft01Icon,
  EyeIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { RunCandidate } from "@/lib/payroll-api"
import { figuresFromCandidate, peso as fmt } from "@/lib/payslip-figures"
import { PayslipDocument } from "./payslip-document"

/**
 * Payroll breakdown for a period, before the run exists.
 *
 * <p>Figures come from the same computation the run itself performs, not an estimate — a preview
 * that disagrees with what it previews would be worse than none. The salary source is shown per
 * employee because pay now comes from the employment contract, falling back to the position's
 * salary grade, and an unexpected figure is otherwise untraceable from here.
 */
export function PayrollRunPreviewModal({
  open,
  onClose,
  onConfirm,
  candidates,
  isLoading,
  periodStart,
  periodEnd,
  confirming,
  singleEmployee,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  candidates: RunCandidate[]
  isLoading: boolean
  periodStart?: string
  periodEnd?: string
  confirming?: boolean
  /** One person's breakdown rather than the run's — hides the totals row and the create action. */
  singleEmployee?: boolean
}) {
  // Drill-down from the comparison table into one person's payslip, without closing the modal and
  // hunting for them in the list behind it.
  const [detailUserId, setDetailUserId] = useState<number | null>(null)

  // Cleared on the way out, not in an effect watching `open` — otherwise reopening briefly shows
  // the previous run's employee before the effect catches up.
  const close = () => {
    setDetailUserId(null)
    onClose()
  }

  const skipped = candidates.filter((c) => !c.eligible)
  const payable = candidates.filter((c) => c.eligible)

  const detail = payable.find((c) => c.userId === detailUserId) ?? null
  // Either entry point lands on the same payslip view: the caller's single-employee mode, or a
  // drill-down from the table.
  const shown = singleEmployee ? (payable[0] ?? null) : detail
  const period = { from: periodStart ?? "—", to: periodEnd ?? "—" }

  const sum = (pick: (c: RunCandidate) => number | null) =>
    payable.reduce((t, c) => t + (pick(c) ?? 0), 0)

  const totals = {
    basic: sum((c) => c.basicSalary),
    allowances: sum((c) => c.allowances),
    overtime: sum((c) => c.overtimePay),
    gross: sum((c) => c.grossPay),
    absences: sum((c) => c.absences),
    deductions: sum((c) => c.totalDeductions),
    net: sum((c) => c.netPay),
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-hidden",
          // The `sm:` prefix is required, not cosmetic: DialogContent's base carries `sm:max-w-md`,
          // and a media-query rule beats an unprefixed one — tailwind-merge can't dedupe across
          // variants, so a plain `max-w-4xl` here is silently ignored and the dialog stays 448px.
          //
          // The payslip template is 720px wide, so anything narrower squeezes the document it is
          // supposed to be previewing. The run modal keeps one width across both its states so
          // drilling into a row doesn't resize the dialog under the cursor.
          singleEmployee ? "sm:max-w-3xl" : "sm:max-w-4xl"
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {shown
              ? (shown.name ?? shown.employeeId ?? "Employee breakdown")
              : "Payroll preview"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-[12px] text-muted-foreground">
          {periodStart && periodEnd ? `${periodStart} → ${periodEnd}` : ""}
          {shown
            ? ""
            : ` · ${payable.length} employee${payable.length === 1 ? "" : "s"}`}
        </p>

        {isLoading ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            Calculating…
          </p>
        ) : shown ? (
          <div className="max-h-[70vh] overflow-y-auto">
            {/* Drilled in from the table — offer the way back. The caller's single-employee mode
                has its own Back button and never had a table to return to. */}
            {!singleEmployee && (
              <button
                type="button"
                onClick={() => setDetailUserId(null)}
                className="mb-3 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  size={14}
                  strokeWidth={2}
                />
                All employees
              </button>
            )}
            <PayslipDocument figures={figuresFromCandidate(shown, period)} />
          </div>
        ) : (
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-border">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 border-b border-border bg-card">
                <tr className="text-right text-[10px] tracking-wider text-muted-foreground uppercase">
                  <th className="px-3 py-2 text-left font-semibold">
                    Employee
                  </th>
                  <th className="px-3 py-2 font-semibold">Basic</th>
                  <th className="px-3 py-2 font-semibold">Allowances</th>
                  <th className="px-3 py-2 font-semibold">Overtime</th>
                  <th className="px-3 py-2 font-semibold">Gross</th>
                  <th className="px-3 py-2 font-semibold">Absences</th>
                  <th className="px-3 py-2 font-semibold">Deductions</th>
                  <th className="px-3 py-2 font-semibold">Net</th>
                  <th className="w-9 px-2 py-2">
                    <span className="sr-only">View payslip</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payable.map((c) => (
                  <tr
                    key={c.userId}
                    className="border-b border-border text-right tabular-nums last:border-0"
                  >
                    <td className="px-3 py-2 text-left">
                      <p className="font-medium">{c.name ?? c.employeeId}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.position ?? "—"}
                        {c.salarySource ? ` · ${c.salarySource}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2">{fmt(c.basicSalary)}</td>
                    <td className="px-3 py-2">{fmt(c.allowances)}</td>
                    <td className="px-3 py-2">{fmt(c.overtimePay)}</td>
                    <td className="px-3 py-2">{fmt(c.grossPay)}</td>
                    <td className="px-3 py-2 text-danger">
                      {c.absences ? `-${fmt(c.absences)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-danger">
                      {c.totalDeductions ? `-${fmt(c.totalDeductions)}` : "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">{fmt(c.netPay)}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        title={`View ${c.name ?? "employee"}'s payslip`}
                        aria-label={`View ${c.name ?? "employee"}'s payslip`}
                        onClick={() => setDetailUserId(c.userId)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon
                          icon={EyeIcon}
                          size={14}
                          strokeWidth={2}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* A totals row over a single person would just repeat their row. */}
              <tfoot
                className={cn(
                  "sticky bottom-0 border-t border-border bg-muted/60",
                  singleEmployee && "hidden"
                )}
              >
                <tr className="text-right font-semibold tabular-nums">
                  <td className="px-3 py-2 text-left">Total</td>
                  <td className="px-3 py-2">{fmt(totals.basic)}</td>
                  <td className="px-3 py-2">{fmt(totals.allowances)}</td>
                  <td className="px-3 py-2">{fmt(totals.overtime)}</td>
                  <td className="px-3 py-2">{fmt(totals.gross)}</td>
                  <td className="px-3 py-2 text-danger">
                    {totals.absences ? `-${fmt(totals.absences)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-danger">
                    -{fmt(totals.deductions)}
                  </td>
                  <td className="px-3 py-2">{fmt(totals.net)}</td>
                  {/* Keeps the totals row aligned with the eye column above it. */}
                  <td className="w-9 px-2 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {skipped.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={15}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-amber-500"
            />
            <div className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
              <p className="font-semibold">
                {skipped.length} employee{skipped.length === 1 ? "" : "s"} left
                out
              </p>
              <ul className="mt-1 space-y-0.5">
                {skipped.map((c) => (
                  <li key={c.userId}>
                    {c.name ?? c.employeeId} — {c.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={close}>
            Back
          </Button>
          {/* Hidden while one person's payslip fills the dialog — with their name in the title,
              a "Create run" button reads as creating a run for them, when it would run the whole
              payroll. Backing out to the table restores it. */}
          {!shown && (
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={confirming || payable.length === 0}
            >
              {confirming ? "Creating…" : "Create run"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
