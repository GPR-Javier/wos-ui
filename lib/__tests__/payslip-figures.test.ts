import { describe, it, expect } from "vitest"
import {
  SAMPLE_FIGURES,
  figuresFromCandidate,
  peso,
} from "@/lib/payslip-figures"
import type { RunCandidate } from "@/lib/payroll-api"

const PERIOD = { from: "2026-08-01", to: "2026-08-15" }

function candidate(over: Partial<RunCandidate> = {}): RunCandidate {
  return {
    userId: 1,
    employeeId: "EMP-001",
    name: "Gene Paul Javier",
    position: "Software Engineer",
    monthlySalary: 100000,
    salarySource: "Contract (monthly)",
    basicSalary: 50000,
    allowances: 5499,
    allowanceLines: [],
    overtimePay: 0,
    overtimeLines: [],
    grossPay: 55499,
    absences: 0,
    statutoryDeductions: 0,
    statutoryLines: [],
    deductionLines: [],
    totalDeductions: 0,
    netPay: 55499,
    eligible: true,
    reason: null,
    ...over,
  }
}

describe("peso", () => {
  it("always shows two decimals", () => {
    expect(peso(50000)).toBe("₱50,000.00")
    expect(peso(1234.5)).toBe("₱1,234.50")
  })

  it("renders a dash for missing figures rather than ₱0.00", () => {
    // A figure payroll didn't compute is not the same as a figure that is zero.
    expect(peso(null)).toBe("—")
    expect(peso(undefined)).toBe("—")
  })
})

describe("figuresFromCandidate", () => {
  it("itemises deductions into government, named, and leave groups", () => {
    const f = figuresFromCandidate(
      candidate({
        statutoryDeductions: 2560,
        statutoryLines: [
          { label: "SSS", amount: 675 },
          { label: "PhilHealth", amount: 312.5 },
          { label: "Pag-IBIG / HDMF", amount: 100 },
          { label: "Withholding tax (BIR)", amount: 1472.5 },
        ],
        deductionLines: [
          { label: "Salary Loan", amount: 500 },
          { label: "Cash Advance", amount: 1000 },
        ],
        absences: 1000,
        totalDeductions: 5060,
      }),
      PERIOD
    )
    expect(f.deductions.groups!.map((g) => g.label)).toEqual([
      "Government",
      "Loans & other",
      "Leave",
    ])
    expect(f.deductions.groups![1].rows).toEqual([
      { label: "Salary Loan", amount: "₱500.00" },
      { label: "Cash Advance", amount: "₱1,000.00" },
    ])
  })

  it("omits groups that have no lines", () => {
    const f = figuresFromCandidate(
      candidate({
        statutoryDeductions: 2560,
        statutoryLines: [{ label: "SSS", amount: 2560 }],
        totalDeductions: 2560,
      }),
      PERIOD
    )
    expect(f.deductions.groups!.map((g) => g.label)).toEqual(["Government"])
  })

  it("surfaces any amount the itemised lines don't account for", () => {
    // A breakdown that quietly disagrees with its own total is worse than an ugly extra row.
    const f = figuresFromCandidate(
      candidate({
        statutoryDeductions: 1000,
        statutoryLines: [{ label: "SSS", amount: 1000 }],
        deductionLines: [],
        absences: 0,
        totalDeductions: 1750,
      }),
      PERIOD
    )
    const other = f.deductions.groups!.find((g) => g.label === "Other")!
    expect(other.rows).toEqual([
      { label: "Other deductions", amount: "₱750.00" },
    ])
  })

  it("adds no 'other' row when the lines fully explain the total", () => {
    const f = figuresFromCandidate(
      candidate({
        statutoryDeductions: 1000,
        statutoryLines: [{ label: "SSS", amount: 1000 }],
        deductionLines: [{ label: "Salary Loan", amount: 500 }],
        absences: 250,
        totalDeductions: 1750,
      }),
      PERIOD
    )
    expect(f.deductions.groups!.map((g) => g.label)).not.toContain("Other")
  })

  it("itemises allowances and overtime rather than showing one total", () => {
    const f = figuresFromCandidate(
      candidate({
        allowances: 1000,
        allowanceLines: [
          { label: "Transportation", amount: 600 },
          { label: "Meal", amount: 400 },
        ],
        overtimePay: 1240,
        overtimeLines: [
          { overtimeType: "REGULAR", hours: 6, amount: 710 },
          {
            overtimeType: "REGULAR_HOLIDAY_REST_DAY_OT",
            hours: 4,
            amount: 530,
          },
        ],
      }),
      PERIOD
    )
    expect(f.allowances.rows).toEqual([
      { label: "Transportation", amount: "₱600.00" },
      { label: "Meal", amount: "₱400.00" },
    ])
    // Enum names must never reach an employee's payslip — and the wording matches the OT screens.
    expect(f.overtime.rows!.map((r) => r.label)).toEqual([
      "Regular OT · 6 hrs",
      "Reg. Holiday + RD OT · 4 hrs",
    ])
  })

  it("falls back to a summary row when payroll gave a total but no lines", () => {
    const f = figuresFromCandidate(
      candidate({ allowances: 5499, allowanceLines: [] }),
      PERIOD
    )
    expect(f.allowances.rows).toEqual([
      { label: "Allowances", amount: "₱5,499.00" },
    ])
  })

  it("marks zero sections empty so the renderer omits them", () => {
    // The screenshot case: no overtime, no deductions. Printing rows of ₱0.00 is noise.
    const f = figuresFromCandidate(candidate(), PERIOD)
    expect(f.overtime.empty).toBe(true)
    expect(f.deductions.empty).toBe(true)
    expect(f.allowances.empty).toBe(false)
  })

  it("keeps a section when it has any value", () => {
    const f = figuresFromCandidate(candidate({ overtimePay: 1240 }), PERIOD)
    expect(f.overtime.empty).toBe(false)
    expect(f.overtime.total).toBe("₱1,240.00")
  })

  it("shows the salary source next to basic pay", () => {
    // An unexpected basic figure is otherwise untraceable from the preview.
    const f = figuresFromCandidate(candidate(), PERIOD)
    expect(f.compensation.rows![0].label).toBe("Basic pay · Contract (monthly)")
  })

  it("falls back to the employee id when there is no name", () => {
    const f = figuresFromCandidate(candidate({ name: null }), PERIOD)
    expect(f.header[0]).toEqual({ label: "Employee", amount: "EMP-001" })
  })

  it("exposes real values for {{token}} interpolation", () => {
    const f = figuresFromCandidate(candidate(), PERIOD, "Acme Corp")
    expect(f.values).toMatchObject({
      companyName: "Acme Corp",
      employeeName: "Gene Paul Javier",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-15",
      netPay: "₱55,499.00",
    })
  })

  it("survives an all-null candidate without throwing", () => {
    const f = figuresFromCandidate(
      candidate({
        basicSalary: null,
        allowances: null,
        overtimePay: null,
        grossPay: null,
        absences: null,
        statutoryDeductions: null,
        totalDeductions: null,
        netPay: null,
        position: null,
        salarySource: null,
      }),
      PERIOD
    )
    expect(f.netPay).toBe("—")
    expect(f.deductions.empty).toBe(true)
    expect(f.compensation.rows![0].label).toBe("Basic pay")
  })
})

describe("sample figures", () => {
  it("reconciles, because an admin checking the preview will add them up", () => {
    // 12,500 basic + 1,240 overtime + 1,000 allowances = 14,740 gross
    // 14,740 gross − 4,060 deductions = 10,680 net
    const num = (s: string) => Number(s.replace(/[₱,]/g, ""))
    const sum = (rows: { amount: string }[]) =>
      rows.reduce((t, r) => t + num(r.amount), 0)

    const basic = sum(SAMPLE_FIGURES.compensation.rows!)
    const ot = num(SAMPLE_FIGURES.overtime.total!)
    const allow = num(SAMPLE_FIGURES.allowances.total!)
    const gross = num(SAMPLE_FIGURES.grossPay)
    const ded = num(SAMPLE_FIGURES.deductions.total!)

    expect(basic + ot + allow).toBe(gross)
    expect(gross - ded).toBe(num(SAMPLE_FIGURES.netPay))
  })

  it("keeps each section's rows consistent with its total", () => {
    const num = (s: string) => Number(s.replace(/[₱,]/g, ""))
    const sum = (rows: { amount: string }[]) =>
      rows.reduce((t, r) => t + num(r.amount), 0)

    expect(sum(SAMPLE_FIGURES.overtime.rows!)).toBe(
      num(SAMPLE_FIGURES.overtime.total!)
    )
    expect(sum(SAMPLE_FIGURES.allowances.rows!)).toBe(
      num(SAMPLE_FIGURES.allowances.total!)
    )
    const dedRows = SAMPLE_FIGURES.deductions.groups!.flatMap((g) => g.rows)
    expect(sum(dedRows)).toBe(num(SAMPLE_FIGURES.deductions.total!))
  })
})

describe("company name", () => {
  it("is omitted when unknown, so a resolved value isn't overridden by a blank", () => {
    // PayslipDocument resolves the company itself and merges underneath these values; a ""
    // here would win and print an empty company header.
    const f = figuresFromCandidate(candidate(), PERIOD)
    expect("companyName" in (f.values ?? {})).toBe(false)
  })

  it("is included when the caller supplies it", () => {
    const f = figuresFromCandidate(candidate(), PERIOD, "Acme Corp")
    expect(f.values!.companyName).toBe("Acme Corp")
  })
})
