"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/custom/stat-card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Coins01Icon,
  Calendar01Icon,
  Award01Icon,
  BarChartIcon,
  Money01Icon,
  CreditCardIcon,
  TimeScheduleIcon,
} from "@hugeicons/core-free-icons"
import { usePayrollRuns } from "@/hooks/use-payroll"

// ── exported config types ──────────────────────────────────────────────────

export type PayType = "fixed" | "daily" | "commission"
export type PayFrequency = "weekly" | "semi-monthly" | "monthly" | "yearly"

export interface CommissionConfig {
  baseSalary: number
  commissionRate: number
  commissionBasis: "per_sale" | "revenue_pct" | "per_unit"
  cap: number
}

export interface PayrollScheduleConfig {
  payType: PayType
  payFrequency: PayFrequency
  overtimeMultiplier: number
  dailyRate: number
  workingDaysPerWeek: number
  // Semi-monthly
  cutoffDay1: number
  payoutDay1: number
  cutoffDay2: number
  payoutDay2: number // 0 = last day
  // Weekly
  weekCutoffDay: number // 0=Sun … 6=Sat
  weekPayoutDay: number
  // Monthly
  monthCutoffDay: number
  monthPayoutDay: number // 0 = last day
  // Yearly
  yearPayoutMonth: number // 1-12
  yearPayoutDay: number
  // Type-specific
  commission: CommissionConfig
}

export const DEFAULT_PAYROLL_CONFIG: PayrollScheduleConfig = {
  payType: "fixed",
  payFrequency: "semi-monthly",
  overtimeMultiplier: 1.3,
  dailyRate: 500,
  workingDaysPerWeek: 5,
  cutoffDay1: 10,
  payoutDay1: 15,
  cutoffDay2: 25,
  payoutDay2: 0,
  weekCutoffDay: 5,
  weekPayoutDay: 1,
  monthCutoffDay: 25,
  monthPayoutDay: 0,
  yearPayoutMonth: 12,
  yearPayoutDay: 20,
  commission: {
    baseSalary: 15_000,
    commissionRate: 5,
    commissionBasis: "per_sale",
    cap: 0,
  },
}

// ── constants ──────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
const VARIATION = [0, 0.03, -0.02, 0.01, 0.04, -0.01, 0.02, 0.03]

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`
  return fmt(n)
}

function formatDate(d: Date) {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function lastDayOf(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function weekdayDatesInMonth(
  year: number,
  month: number,
  weekday: number
): number[] {
  const days: number[] = []
  const total = lastDayOf(year, month)
  for (let d = 1; d <= total; d++) {
    if (new Date(year, month, d).getDay() === weekday) days.push(d)
  }
  return days
}

// ── schedule types ─────────────────────────────────────────────────────────

interface ScheduleEntry {
  period: string
  periodStart: Date
  cutoffDate: Date
  payoutDate: Date
  projectedAmount: number
  status: "past" | "current" | "upcoming"
}

interface MonthForecast {
  month: string
  regular: number
  bonuses: number
  thirteenth: number
  total: number
}

// ── schedule generation ────────────────────────────────────────────────────

function buildEntry(
  period: string,
  periodStart: Date,
  cutoffDate: Date,
  payoutDate: Date,
  amount: number,
  today: Date
): ScheduleEntry {
  let status: ScheduleEntry["status"] = "upcoming"
  if (payoutDate < today) status = "past"
  else if (periodStart <= today) status = "current"
  return {
    period,
    periodStart,
    cutoffDate,
    payoutDate,
    projectedAmount: amount,
    status,
  }
}

function generateSemiMonthly(
  avg: number,
  today: Date,
  cfg: PayrollScheduleConfig
): ScheduleEntry[] {
  const { cutoffDay1, payoutDay1, cutoffDay2, payoutDay2 } = cfg
  let y = today.getFullYear()
  let m = today.getMonth()
  let half = today.getDate() <= payoutDay1 ? 1 : 2

  for (let i = 0; i < 2; i++) {
    if (half === 1) {
      half = 2
      m--
      if (m < 0) {
        m = 11
        y--
      }
    } else half = 1
  }

  return Array.from({ length: 8 }, (_, i) => {
    const ld = lastDayOf(y, m)
    let entry: ScheduleEntry

    if (half === 1) {
      entry = buildEntry(
        `${MONTH_NAMES[m]} 1–${payoutDay1}, ${y}`,
        new Date(y, m, 1),
        new Date(y, m, Math.min(cutoffDay1, ld)),
        new Date(y, m, Math.min(payoutDay1, ld)),
        avg * (1 + (VARIATION[i] ?? 0)),
        today
      )
      half = 2
    } else {
      const pd = payoutDay2 === 0 ? ld : Math.min(payoutDay2, ld)
      entry = buildEntry(
        `${MONTH_NAMES[m]} ${payoutDay1 + 1}–${pd}, ${y}`,
        new Date(y, m, payoutDay1 + 1),
        new Date(y, m, Math.min(cutoffDay2, ld)),
        new Date(y, m, pd),
        avg * (1 + (VARIATION[i] ?? 0)),
        today
      )
      half = 1
      m++
      if (m > 11) {
        m = 0
        y++
      }
    }

    return entry
  })
}

function generateWeekly(
  avg: number,
  today: Date,
  cfg: PayrollScheduleConfig
): ScheduleEntry[] {
  const weeklyAmt = (avg * 2) / 4.33
  let cursor = new Date(today)
  while (cursor.getDay() !== cfg.weekCutoffDay)
    cursor.setDate(cursor.getDate() - 1)
  cursor.setDate(cursor.getDate() - 14)

  return Array.from({ length: 8 }, (_, i) => {
    const cutoff = new Date(cursor)
    cutoff.setDate(cursor.getDate() + i * 7)
    const periodStart = new Date(cutoff)
    periodStart.setDate(cutoff.getDate() - 6)
    const payout = new Date(cutoff)
    const daysToNext = (cfg.weekPayoutDay - cutoff.getDay() + 7) % 7 || 7
    payout.setDate(cutoff.getDate() + daysToNext)

    const ps = periodStart
    const label = `${MONTH_SHORT[ps.getMonth()]} ${ps.getDate()} – ${MONTH_SHORT[cutoff.getMonth()]} ${cutoff.getDate()}`
    return buildEntry(
      label,
      periodStart,
      cutoff,
      payout,
      weeklyAmt * (1 + (VARIATION[i] ?? 0)),
      today
    )
  })
}

function generateMonthly(
  avg: number,
  today: Date,
  cfg: PayrollScheduleConfig
): ScheduleEntry[] {
  let y = today.getFullYear()
  let m = today.getMonth() - 1
  if (m < 0) {
    m = 11
    y--
  }

  return Array.from({ length: 6 }, (_, i) => {
    const cm = (m + i) % 12
    const cy = y + Math.floor((m + i) / 12)
    const ld = lastDayOf(cy, cm)
    const pd = cfg.monthPayoutDay === 0 ? ld : Math.min(cfg.monthPayoutDay, ld)
    return buildEntry(
      `${MONTH_NAMES[cm]} ${cy}`,
      new Date(cy, cm, 1),
      new Date(cy, cm, Math.min(cfg.monthCutoffDay, ld)),
      new Date(cy, cm, pd),
      avg * 2 * (1 + (VARIATION[i] ?? 0)),
      today
    )
  })
}

function generateYearly(
  avg: number,
  today: Date,
  cfg: PayrollScheduleConfig
): ScheduleEntry[] {
  const base = today.getFullYear()
  return [base, base + 1].map((y, i) => {
    const pm = cfg.yearPayoutMonth - 1
    const ld = lastDayOf(y, pm)
    const pd = Math.min(cfg.yearPayoutDay, ld)
    return buildEntry(
      `Year ${y}`,
      new Date(y, 0, 1),
      new Date(y, pm === 0 ? 11 : pm - 1, 25),
      new Date(y, pm, pd),
      avg * 24 * (1 + (VARIATION[i] ?? 0)),
      today
    )
  })
}

function generateSchedule(
  avg: number,
  today: Date,
  cfg: PayrollScheduleConfig
): ScheduleEntry[] {
  switch (cfg.payFrequency) {
    case "weekly":
      return generateWeekly(avg, today, cfg)
    case "monthly":
      return generateMonthly(avg, today, cfg)
    case "yearly":
      return generateYearly(avg, today, cfg)
    default:
      return generateSemiMonthly(avg, today, cfg)
  }
}

function generateForecast(
  avgMonthly: number,
  today: Date,
  count = 6
): MonthForecast[] {
  return Array.from({ length: count }, (_, i) => {
    const t = today.getMonth() + i
    const m = t % 12
    const y = today.getFullYear() + Math.floor(t / 12)
    const isDecember = m === 11
    const isQEnd = m === 5 || m === 8 || m === 11
    const regular = avgMonthly
    const thirteenth = isDecember ? avgMonthly * 0.9 : 0
    const bonuses = isQEnd ? avgMonthly * 0.08 : 0
    return {
      month: `${MONTH_SHORT[m]} ${y}`,
      regular,
      bonuses,
      thirteenth,
      total: regular + thirteenth + bonuses,
    }
  })
}

// ── MiniCal ────────────────────────────────────────────────────────────────

function MiniCal({
  month,
  year,
  today,
  cutoffDays,
  payoutDays,
  title,
}: {
  month: number
  year: number
  today: Date
  cutoffDays: number[]
  payoutDays: number[]
  title: string
}) {
  const daysInMonth = lastDayOf(year, month)
  const firstDow = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDay = isThisMonth ? today.getDate() : -1

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[10px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />
          const isToday = day === todayDay
          const isCutoff = cutoffDays.includes(day)
          const isPayout = payoutDays.includes(day)
          return (
            <div
              key={day}
              className={cn(
                "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors",
                isToday && "bg-primary font-bold text-primary-foreground",
                !isToday &&
                  isCutoff &&
                  "bg-amber-100 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                !isToday &&
                  isPayout &&
                  "bg-green-100 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400",
                !isToday && !isCutoff && !isPayout && "text-foreground/80"
              )}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── CompensationBadge ──────────────────────────────────────────────────────

function CompensationInfo({
  config,
  avgMonthly,
}: {
  config: PayrollScheduleConfig
  avgMonthly: number
}) {
  if (config.payType === "fixed") return null

  const rows: { label: string; value: string; highlight?: boolean }[] = []

  if (config.payType === "daily") {
    const monthlyEst = config.dailyRate * config.workingDaysPerWeek * 4.33
    rows.push(
      { label: "Daily rate", value: fmt(config.dailyRate) },
      {
        label: "Working days / week",
        value: `${config.workingDaysPerWeek} days`,
      },
      {
        label: "Est. monthly earnings",
        value: fmtK(monthlyEst),
        highlight: true,
      }
    )
  }

  if (config.payType === "commission") {
    const c = config.commission
    const commissionBasisLabel = {
      per_sale: "Per sale",
      revenue_pct: "% of revenue",
      per_unit: "Per unit",
    }[c.commissionBasis]
    const projCommission = avgMonthly * (c.commissionRate / 100)
    rows.push(
      { label: "Base salary", value: fmt(c.baseSalary) },
      { label: "Commission rate", value: `${c.commissionRate}%` },
      { label: "Commission basis", value: commissionBasisLabel },
      {
        label: "Est. monthly commission",
        value: fmtK(projCommission),
        highlight: true,
      },
      { label: "Commission cap", value: c.cap > 0 ? fmt(c.cap) : "No cap" }
    )
  }

  const typeLabel: Record<PayType, string> = {
    fixed: "Fixed Salary",
    daily: "Daily Rate",
    commission: "Commission-based",
  }

  const typeColor: Record<PayType, string> = {
    fixed: "bg-blue-500",
    daily: "bg-green-500",
    commission: "bg-violet-500",
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            typeColor[config.payType]
          )}
        />
        <h3 className="text-[13px] font-semibold text-foreground">
          Compensation Method — {typeLabel[config.payType]}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">{r.label}</p>
            <p
              className={cn(
                "text-[12px] font-semibold",
                r.highlight ? "text-primary" : "text-foreground"
              )}
            >
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────

interface PayrollScheduleProps {
  config?: PayrollScheduleConfig
}

export function PayrollSchedule({
  config = DEFAULT_PAYROLL_CONFIG,
}: PayrollScheduleProps) {
  const today = useMemo(() => new Date(), [])
  const { data: runsPage } = usePayrollRuns({ size: 20 })

  const avgHalfMonth = useMemo(() => {
    const released = (runsPage?.content ?? []).filter(
      (r) => r.status === "released" && r.totalAmount > 0
    )
    if (released.length === 0) return 450_000
    return released.reduce((s, r) => s + r.totalAmount, 0) / released.length
  }, [runsPage])

  const avgMonthly = avgHalfMonth * 2

  const schedule = useMemo(
    () => generateSchedule(avgHalfMonth, today, config),
    [avgHalfMonth, today, config]
  )
  const forecast = useMemo(
    () => generateForecast(avgMonthly, today),
    [avgMonthly, today]
  )

  const nextPayout = schedule.find(
    (s) => s.status === "upcoming" || s.status === "current"
  )

  // 13th month
  const curMonth = today.getMonth()
  const curYear = today.getFullYear()
  const daysInCur = lastDayOf(curYear, curMonth)
  const monthsElapsed = curMonth + today.getDate() / daysInCur
  const monthlyBasic = avgMonthly * 0.78
  const thirteenthAccrued = (monthlyBasic * monthsElapsed) / 12
  const thirteenthProjected = monthlyBasic
  const thirteenthPct = Math.min(100, Math.round((monthsElapsed / 12) * 100))

  // Calendar dates driven by config
  const nextCalMonth = (curMonth + 1) % 12
  const nextCalYear = curMonth === 11 ? curYear + 1 : curYear

  const calCutoffDays = useMemo(() => {
    if (config.payFrequency === "weekly")
      return weekdayDatesInMonth(curYear, curMonth, config.weekCutoffDay)
    if (config.payFrequency === "semi-monthly")
      return [config.cutoffDay1, config.cutoffDay2]
    if (config.payFrequency === "monthly") return [config.monthCutoffDay]
    return []
  }, [config, curYear, curMonth])

  const calCutoffDaysNext = useMemo(() => {
    if (config.payFrequency === "weekly")
      return weekdayDatesInMonth(
        nextCalYear,
        nextCalMonth,
        config.weekCutoffDay
      )
    if (config.payFrequency === "semi-monthly")
      return [config.cutoffDay1, config.cutoffDay2]
    if (config.payFrequency === "monthly") return [config.monthCutoffDay]
    return []
  }, [config, nextCalYear, nextCalMonth])

  const payoutDaysCur = useMemo(() => {
    if (config.payFrequency === "weekly")
      return weekdayDatesInMonth(curYear, curMonth, config.weekPayoutDay)
    if (config.payFrequency === "semi-monthly")
      return [
        config.payoutDay1,
        config.payoutDay2 === 0
          ? lastDayOf(curYear, curMonth)
          : config.payoutDay2,
      ]
    if (config.payFrequency === "monthly")
      return [
        config.monthPayoutDay === 0
          ? lastDayOf(curYear, curMonth)
          : config.monthPayoutDay,
      ]
    return curMonth === config.yearPayoutMonth - 1 ? [config.yearPayoutDay] : []
  }, [config, curYear, curMonth])

  const payoutDaysNext = useMemo(() => {
    if (config.payFrequency === "weekly")
      return weekdayDatesInMonth(
        nextCalYear,
        nextCalMonth,
        config.weekPayoutDay
      )
    if (config.payFrequency === "semi-monthly")
      return [
        config.payoutDay1,
        config.payoutDay2 === 0
          ? lastDayOf(nextCalYear, nextCalMonth)
          : config.payoutDay2,
      ]
    if (config.payFrequency === "monthly")
      return [
        config.monthPayoutDay === 0
          ? lastDayOf(nextCalYear, nextCalMonth)
          : config.monthPayoutDay,
      ]
    return nextCalMonth === config.yearPayoutMonth - 1
      ? [config.yearPayoutDay]
      : []
  }, [config, nextCalYear, nextCalMonth])

  const maxForecastTotal = Math.max(...forecast.map((f) => f.total), 1)
  const forecastSum = forecast.reduce((s, f) => s + f.total, 0)
  const annualForecast = avgMonthly * 12 + thirteenthProjected

  const freqLabel: Record<PayFrequency, string> = {
    weekly: "Weekly average",
    "semi-monthly": "Semi-monthly average",
    monthly: "Monthly average",
    yearly: "Annual",
  }

  return (
    <div className="space-y-6">
      {/* ── Compensation method info (non-fixed types) ──────────────── */}
      <CompensationInfo config={config} avgMonthly={avgMonthly} />

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Next Payout"
          value={nextPayout ? formatDate(nextPayout.payoutDate) : "—"}
          meta={nextPayout ? fmtK(nextPayout.projectedAmount) : "No upcoming"}
          accent="green"
          icon={
            <HugeiconsIcon icon={Money01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Projected Per Cycle"
          value={fmtK(avgHalfMonth)}
          meta={freqLabel[config.payFrequency]}
          accent="blue"
          icon={
            <HugeiconsIcon icon={Coins01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="13th Month Accrued"
          value={fmtK(thirteenthAccrued)}
          meta={`${thirteenthPct}% of year elapsed`}
          accent="purple"
          icon={
            <HugeiconsIcon icon={Award01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Annual Forecast"
          value={fmtK(annualForecast)}
          meta="Projected total payroll"
          accent="amber"
          icon={
            <HugeiconsIcon icon={BarChartIcon} size={16} strokeWidth={1.8} />
          }
        />
      </div>

      {/* ── Calendar + Schedule ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HugeiconsIcon
              icon={Calendar01Icon}
              size={15}
              strokeWidth={1.8}
              className="text-primary"
            />
            <h3 className="text-[13px] font-semibold text-foreground">
              Monthly Payroll Calendar
            </h3>
          </div>
          <div className="space-y-5">
            <MiniCal
              month={curMonth}
              year={curYear}
              today={today}
              cutoffDays={calCutoffDays}
              payoutDays={payoutDaysCur}
              title={`${MONTH_NAMES[curMonth]} ${curYear}`}
            />
            <MiniCal
              month={nextCalMonth}
              year={nextCalYear}
              today={today}
              cutoffDays={calCutoffDaysNext}
              payoutDays={payoutDaysNext}
              title={`${MONTH_NAMES[nextCalMonth]} ${nextCalYear}`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              Cutoff
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              Payout
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HugeiconsIcon
              icon={TimeScheduleIcon}
              size={15}
              strokeWidth={1.8}
              className="text-primary"
            />
            <h3 className="text-[13px] font-semibold text-foreground">
              Upcoming Pay Periods
            </h3>
          </div>
          <div className="space-y-2">
            {schedule.map((entry) => (
              <div
                key={entry.period}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-[12px] transition-colors",
                  entry.status === "current" &&
                    "border-primary/30 bg-primary/5",
                  entry.status === "past" &&
                    "border-border bg-muted/30 opacity-60",
                  entry.status === "upcoming" && "border-border bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {entry.period}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Cutoff: {formatDate(entry.cutoffDate)} · Payout:{" "}
                      {formatDate(entry.payoutDate)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-foreground tabular-nums">
                      {fmtK(entry.projectedAmount)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {entry.status === "past" && "Released"}
                      {entry.status === "current" && (
                        <span className="font-medium text-primary">Active</span>
                      )}
                      {entry.status === "upcoming" && "Projected"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cash Flow Forecast ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <HugeiconsIcon
            icon={BarChartIcon}
            size={15}
            strokeWidth={1.8}
            className="text-primary"
          />
          <h3 className="text-[13px] font-semibold text-foreground">
            6-Month Cash Flow Forecast
          </h3>
        </div>
        <div className="mb-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-primary" />
            Regular Payroll
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-amber-500" />
            Performance Bonus
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-violet-500" />
            13th Month Pay
          </span>
        </div>
        <div className="space-y-3">
          {forecast.map((f) => {
            const rp = (f.regular / maxForecastTotal) * 65
            const bp = (f.bonuses / maxForecastTotal) * 65
            const tp = (f.thirteenth / maxForecastTotal) * 65
            return (
              <div
                key={f.month}
                className="flex items-center gap-3 text-[12px]"
              >
                <span className="w-12 shrink-0 font-medium text-foreground">
                  {f.month}
                </span>
                <div className="flex flex-1 items-center">
                  <div
                    className="h-2 rounded-l-full bg-primary transition-all"
                    style={{ width: `${rp}%` }}
                  />
                  {f.bonuses > 0 && (
                    <div
                      className="h-2 bg-amber-500 transition-all"
                      style={{ width: `${bp}%` }}
                    />
                  )}
                  {f.thirteenth > 0 && (
                    <div
                      className="h-2 rounded-r-full bg-violet-500 transition-all"
                      style={{ width: `${tp}%` }}
                    />
                  )}
                </div>
                <span className="w-20 shrink-0 text-right font-semibold text-foreground tabular-nums">
                  {fmtK(f.total)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-5 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-[12px]">
          <span className="text-muted-foreground">Projected 6-Month Total</span>
          <span className="font-bold text-foreground tabular-nums">
            {fmtK(forecastSum)}
          </span>
        </div>
      </div>

      {/* ── 13th Month + Bonus ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HugeiconsIcon
              icon={Award01Icon}
              size={15}
              strokeWidth={1.8}
              className="text-violet-500"
            />
            <h3 className="text-[13px] font-semibold text-foreground">
              13th Month Pay Tracker
            </h3>
          </div>
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Accrual Progress</span>
              <span className="font-medium text-foreground">
                {thirteenthPct}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${thirteenthPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {MONTH_NAMES[curMonth]} {today.getDate()}, {curYear} · Month{" "}
              {Math.ceil(monthsElapsed)} of 12
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">Accrued to Date</span>
              <span className="font-semibold text-foreground tabular-nums">
                {fmt(thirteenthAccrued)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">
                Projected Year-End Total
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {fmt(thirteenthProjected)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] dark:border-violet-900/30 dark:bg-violet-900/10">
              <span className="text-violet-700 dark:text-violet-400">
                Expected Payout
              </span>
              <span className="font-semibold text-violet-700 dark:text-violet-400">
                December 20, {curYear}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HugeiconsIcon
              icon={CreditCardIcon}
              size={15}
              strokeWidth={1.8}
              className="text-primary"
            />
            <h3 className="text-[13px] font-semibold text-foreground">
              Bonus & Special Pay
            </h3>
          </div>
          <div className="space-y-2">
            {[
              {
                label: "Q2 Performance Bonus",
                date: `June 30, ${curYear}`,
                amount: avgMonthly * 0.08,
                dot: "bg-amber-500",
              },
              {
                label: "Q3 Performance Bonus",
                date: `September 30, ${curYear}`,
                amount: avgMonthly * 0.08,
                dot: "bg-amber-500",
              },
              {
                label: "Year-End Bonus",
                date: `December 15, ${curYear}`,
                amount: avgMonthly * 0.5,
                dot: "bg-primary",
              },
              {
                label: "13th Month Pay",
                date: `December 20, ${curYear}`,
                amount: thirteenthProjected,
                dot: "bg-violet-500",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-[12px]"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 shrink-0 rounded-full",
                      item.dot
                    )}
                  />
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.date}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-foreground tabular-nums">
                  {fmtK(item.amount)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            * Amounts are projected estimates based on average payroll.
          </p>
        </div>
      </div>
    </div>
  )
}
