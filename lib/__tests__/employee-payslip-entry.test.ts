import { describe, it, expect } from "vitest"
import { toPayslipEntry } from "@/lib/employee-api"

/**
 * The employee payslip view reads pre-formatted strings; wos-payroll returns the raw entity. The
 * two silently disagreed until an employee first had a released payslip, and the page crashed on
 * `basic.replace` of undefined. These cover the adapter that now sits between them.
 */

// Shaped from a real /payroll/payslips/me response.
const raw = {
  periodStart: "2026-08-16",
  periodEnd: "2026-08-31",
  payrollRun: { period: "August 2026", status: "released" },
  basicSalary: 50000,
  overtimePay: 0,
  overtimeBreakdown: [],
  grossPay: 55499,
  sss: 1350,
  philhealth: 1250,
  pagibig: 200,
  tax: 5966.75,
  totalDeductions: 32316.75,
  netPay: 23182.25,
  releasedAt: "2026-08-13T19:10:06.868028",
  status: "released",
}

describe("toPayslipEntry", () => {
  it("maps entity fields onto the view's field names", () => {
    const e = toPayslipEntry(raw)
    expect(e.basic).toBe("₱50,000.00")
    expect(e.gross).toBe("₱55,499.00")
    expect(e.net).toBe("₱23,182.25")
    expect(e.deductions).toBe("₱32,316.75")
    expect(e.period).toBe("August 2026")
  })

  it("returns a string for every display field the view will call .replace on", () => {
    // The precise failure that crashed the page. `raw` is excluded deliberately — it's the
    // untouched record the full payslip view reads, not something the summary formats.
    const { raw: _raw, ...display } = toPayslipEntry(raw)
    for (const [key, value] of Object.entries(display)) {
      expect(typeof value, `${key} must be a string`).toBe("string")
    }
  })

  it("renders zero overtime as a dash, so the view can hide the row", () => {
    const e = toPayslipEntry(raw)
    expect(e.ot).toBe("—")
    expect(e.otHrs).toBe("—")
  })

  it("sums overtime hours across the breakdown", () => {
    const e = toPayslipEntry({
      ...raw,
      overtimePay: 1240,
      overtimeBreakdown: [
        { overtimeType: "REGULAR" as const, hours: 6, amount: 710 },
        { overtimeType: "REST_DAY" as const, hours: 4, amount: 530 },
      ],
    })
    expect(e.otHrs).toBe("10")
    expect(e.ot).toBe("₱1,240.00")
  })

  it("falls back to the date span when the run carries no period name", () => {
    const e = toPayslipEntry({ ...raw, payrollRun: null })
    expect(e.period).toBe("2026-08-16 – 2026-08-31")
  })

  it("treats anything not released as upcoming", () => {
    expect(toPayslipEntry({ ...raw, status: "generated" }).status).toBe(
      "upcoming"
    )
    expect(toPayslipEntry(raw).status).toBe("released")
  })

  it("survives an all-null payslip without throwing", () => {
    const e = toPayslipEntry({
      periodStart: null,
      periodEnd: null,
      payrollRun: null,
      basicSalary: null,
      overtimePay: null,
      overtimeBreakdown: null,
      grossPay: null,
      sss: null,
      philhealth: null,
      pagibig: null,
      tax: null,
      totalDeductions: null,
      netPay: null,
      releasedAt: null,
      status: null,
    })
    expect(e.basic).toBe("—")
    expect(e.net).toBe("—")
    expect(e.status).toBe("upcoming")
  })
})
