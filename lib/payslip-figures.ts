// The projection layer between payroll data and the payslip template.
//
// The structural payslip blocks (compensation, overtime, allowances, deductions…) render figures
// rather than authored content, so they need a data source. This module defines that source once
// and provides two producers: sample figures for the template editor, and real figures from a
// payroll run candidate. The editor and the live preview then run through the SAME renderer —
// if they had separate ones they would drift, and a preview that disagrees with the document it
// previews is worse than no preview.
//
// Where payroll only exposes a section's total (allowances and overtime are summed before they
// reach us), the section renders as a single summary row. That's honest about what's known rather
// than inventing a breakdown.

import type {
  PayslipLine,
  PayslipOvertimeLine,
  RunCandidate,
} from "./payroll-api"
import { OT_TYPE_LABEL } from "./overtime-api"

export type FigureRow = { label: string; amount: string }
export type FigureGroup = { label: string; rows: FigureRow[] }

export interface FigureSection {
  rows?: FigureRow[]
  /** Sub-grouped rows, e.g. deductions split into Government / Loans. */
  groups?: FigureGroup[]
  total?: string
  /** True when every figure in the section is zero — the renderer omits it entirely. */
  empty?: boolean
}

export interface PayslipFigures {
  header: FigureRow[]
  compensation: FigureSection
  overtime: FigureSection
  allowances: FigureSection
  grossPay: string
  deductions: FigureSection
  netPay: string
  /** Real values for `{{token}}` interpolation; falls back to each variable's sampleValue. */
  values?: Record<string, string>
}

export function peso(n: number | null | undefined): string {
  if (n == null) return "—"
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Representative figures for the template editor. They reconcile
 * (12,500 + 1,240 + 1,000 = 14,740 gross − 4,060 = 10,680 net) because an admin arranging the
 * layout will add them up, and numbers that don't sum read as a bug in the payslip itself.
 */
export const SAMPLE_FIGURES: PayslipFigures = {
  header: [
    { label: "Employee", amount: "Maria Santos" },
    { label: "Employee ID", amount: "EMP-00142" },
    { label: "Position", amount: "Senior Accountant" },
    { label: "Pay period", amount: "January 1 – January 15, 2026" },
  ],
  compensation: {
    rows: [{ label: "Basic salary (semi-monthly)", amount: "₱12,500.00" }],
  },
  overtime: {
    rows: [
      { label: "Regular overtime · 6.0 hrs", amount: "₱710.00" },
      { label: "Rest day · 4.0 hrs", amount: "₱530.00" },
    ],
    total: "₱1,240.00",
  },
  allowances: {
    rows: [
      { label: "Transportation", amount: "₱600.00" },
      { label: "Meal", amount: "₱400.00" },
    ],
    total: "₱1,000.00",
  },
  grossPay: "₱14,740.00",
  deductions: {
    groups: [
      {
        label: "Government",
        rows: [
          { label: "SSS", amount: "₱675.00" },
          { label: "PhilHealth", amount: "₱312.50" },
          { label: "Pag-IBIG / HDMF", amount: "₱100.00" },
          { label: "Withholding tax (BIR)", amount: "₱1,472.50" },
        ],
      },
      {
        label: "Loans",
        rows: [
          { label: "Salary loan", amount: "₱500.00" },
          { label: "Cash advance", amount: "₱1,000.00" },
        ],
      },
    ],
    total: "₱4,060.00",
  },
  netPay: "₱10,680.00",
}

const nz = (n: number | null | undefined) => n ?? 0

const toRows = (lines: PayslipLine[] | undefined): FigureRow[] =>
  (lines ?? []).map((l) => ({ label: l.label, amount: peso(l.amount) }))

/**
 * Reuses the labels the overtime screens already show, so "REGULAR_HOLIDAY_REST_DAY_OT" reaches an
 * employee as "Reg. Holiday + RD OT" rather than a mangled enum name — and the payslip agrees with
 * the OT screens rather than inventing its own wording.
 */
function overtimeLabel(line: PayslipOvertimeLine): string {
  const name = OT_TYPE_LABEL[line.overtimeType] ?? line.overtimeType
  return line.hours ? `${name} · ${line.hours} hrs` : name
}

/** Real figures for one employee in a payroll run preview. */
export function figuresFromCandidate(
  c: RunCandidate,
  period: { from: string; to: string },
  companyName?: string
): PayslipFigures {
  const deductionGroups: FigureGroup[] = []

  const statutory = toRows(c.statutoryLines)
  if (statutory.length > 0)
    deductionGroups.push({ label: "Government", rows: statutory })

  const named = toRows(c.deductionLines)
  if (named.length > 0)
    deductionGroups.push({ label: "Loans & other", rows: named })

  // Unpaid leave isn't a configured line item — it's derived from approved leave — so it's grouped
  // on its own rather than being passed off as one of the company's deductions.
  if (nz(c.absences) > 0) {
    deductionGroups.push({
      label: "Leave",
      rows: [{ label: "Unpaid leave", amount: peso(c.absences) }],
    })
  }

  // Anything the itemised lines don't account for. Should be zero; if it isn't, showing it beats
  // a breakdown that quietly disagrees with its own total.
  const accounted =
    nz(c.statutoryDeductions) +
    (c.deductionLines ?? []).reduce((t, l) => t + nz(l.amount), 0) +
    nz(c.absences)
  const unexplained =
    Math.round((nz(c.totalDeductions) - accounted) * 100) / 100
  if (unexplained > 0) {
    deductionGroups.push({
      label: "Other",
      rows: [{ label: "Other deductions", amount: peso(unexplained) }],
    })
  }

  const overtimeRows = (c.overtimeLines ?? []).map((l) => ({
    label: overtimeLabel(l),
    amount: peso(l.amount),
  }))
  const allowanceRows = toRows(c.allowanceLines)

  return {
    header: [
      { label: "Employee", amount: c.name ?? c.employeeId ?? "—" },
      { label: "Employee ID", amount: c.employeeId ?? "—" },
      { label: "Position", amount: c.position ?? "—" },
      { label: "Pay period", amount: `${period.from} – ${period.to}` },
    ],
    compensation: {
      rows: [
        {
          label: c.salarySource ? `Basic pay · ${c.salarySource}` : "Basic pay",
          amount: peso(c.basicSalary),
        },
      ],
    },
    overtime: {
      // Falls back to a single summary row if payroll gave a total without the per-type lines,
      // rather than showing a total with an empty breakdown under it.
      rows:
        overtimeRows.length > 0
          ? overtimeRows
          : [{ label: "Overtime & premium pay", amount: peso(c.overtimePay) }],
      total: peso(c.overtimePay),
      empty: nz(c.overtimePay) === 0,
    },
    allowances: {
      rows:
        allowanceRows.length > 0
          ? allowanceRows
          : [{ label: "Allowances", amount: peso(c.allowances) }],
      total: peso(c.allowances),
      empty: nz(c.allowances) === 0,
    },
    grossPay: peso(c.grossPay),
    deductions: {
      groups: deductionGroups,
      total: peso(c.totalDeductions),
      empty: nz(c.totalDeductions) === 0,
    },
    netPay: peso(c.netPay),
    values: {
      // Omitted when unknown rather than set to "", so a caller that resolves the company
      // separately (PayslipDocument does) isn't overridden by a blank from here.
      ...(companyName ? { companyName } : {}),
      employeeName: c.name ?? c.employeeId ?? "",
      employeeId: c.employeeId ?? "",
      position: c.position ?? "",
      periodStart: period.from,
      periodEnd: period.to,
      netPay: peso(c.netPay),
    },
  }
}
