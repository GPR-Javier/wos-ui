"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { RunCandidate } from "@/lib/payroll-api"

function fmt(n: number | null | undefined) {
  if (n == null) return "—"
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
}

function Line({
  label,
  value,
  negative,
  strong,
}: {
  label: string
  value: number | null | undefined
  negative?: boolean
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 text-[12px]",
        strong && "border-t border-border pt-2 font-semibold"
      )}
    >
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className={cn("tabular-nums", negative && "text-danger")}>
        {negative && value ? `-${fmt(value)}` : fmt(value)}
      </span>
    </div>
  )
}

/**
 * One employee laid out as a payslip rather than a table row.
 *
 * The run-level table is right for comparing people, but for a single person it forces horizontal
 * scrolling and reads nothing like the document this becomes. Same figures, payslip shape.
 */
function PayslipPreview({ c }: { c: RunCandidate }) {
  // Named deductions (cash advances, loans) are whatever the total isn't otherwise accounted for.
  const other =
    (c.totalDeductions ?? 0) - (c.statutoryDeductions ?? 0) - (c.absences ?? 0)

  return (
    <div className="rounded-xl border border-border">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[13px] font-semibold">{c.name ?? c.employeeId}</p>
        <p className="text-[11px] text-muted-foreground">
          {c.position ?? "—"}
          {c.salarySource ? ` · ${c.salarySource}` : ""}
          {c.monthlySalary != null ? ` · ${fmt(c.monthlySalary)}/mo` : ""}
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-1 px-4 py-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Earnings
          </p>
          <Line label="Basic pay" value={c.basicSalary} />
          <Line label="Allowances" value={c.allowances} />
          <Line label="Overtime" value={c.overtimePay} />
          <Line label="Gross pay" value={c.grossPay} strong />
        </div>

        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Deductions
          </p>
          <Line
            label="SSS · PhilHealth · Pag-IBIG · Tax"
            value={c.statutoryDeductions}
            negative
          />
          <Line label="Unpaid leave" value={c.absences} negative />
          <Line
            label="Other deductions"
            value={other > 0 ? other : 0}
            negative
          />
          <Line
            label="Total deductions"
            value={c.totalDeductions}
            negative
            strong
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3">
        <span className="text-[13px] font-semibold">Net pay</span>
        <span className="text-[16px] font-bold tabular-nums">
          {fmt(c.netPay)}
        </span>
      </div>
    </div>
  )
}

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
  const skipped = candidates.filter((c) => !c.eligible)
  const payable = candidates.filter((c) => c.eligible)

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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[85vh] overflow-hidden",
          singleEmployee ? "max-w-xl" : "max-w-4xl"
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {singleEmployee
              ? (candidates[0]?.name ?? "Employee breakdown")
              : "Payroll preview"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-[12px] text-muted-foreground">
          {periodStart && periodEnd ? `${periodStart} → ${periodEnd}` : ""}
          {singleEmployee
            ? ""
            : ` · ${payable.length} employee${payable.length === 1 ? "" : "s"}`}
        </p>

        {isLoading ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            Calculating…
          </p>
        ) : singleEmployee ? (
          payable.length > 0 ? (
            <PayslipPreview c={payable[0]} />
          ) : null
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
          <Button variant="outline" size="sm" onClick={onClose}>
            Back
          </Button>
          {/* Creating from a single-employee view would be misleading — it'd run the whole
              payroll, not just this person. */}
          {!singleEmployee && (
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
