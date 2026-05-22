"use client"

import { StatCard } from "@/components/custom/stat-card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Coins01Icon,
  Invoice01Icon,
  MoneyReceive01Icon,
  Award01Icon,
  CreditCardIcon,
} from "@hugeicons/core-free-icons"
import { usePayrollStats } from "@/hooks/use-payroll"

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface BarRowProps {
  label: string
  amount: number
  total: number
  color: string
}

function BarRow({ label, amount, total, color }: BarRowProps) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">
          {fmt(amount)}
          <span className="ml-1.5 text-muted-foreground/60">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function PayrollOverview() {
  const { data: stats, isLoading } = usePayrollStats()

  const totalComponents =
    (stats?.totalBasicSalary ?? 0) +
    (stats?.totalIncentives ?? 0) +
    (stats?.totalAbsences ?? 0) +
    (stats?.totalLatePenalties ?? 0) +
    (stats?.totalCashAdvances ?? 0)

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Payroll"
          value={isLoading ? "—" : fmt(stats?.totalPayrollAmount ?? 0)}
          accent="blue"
          icon={
            <HugeiconsIcon icon={Coins01Icon} size={16} strokeWidth={1.8} />
          }
          meta="Current period"
        />
        <StatCard
          title="Pending Processing"
          value={isLoading ? "—" : String(stats?.pendingProcessing ?? 0)}
          accent="amber"
          icon={
            <HugeiconsIcon icon={Invoice01Icon} size={16} strokeWidth={1.8} />
          }
          meta="Payroll runs"
        />
        <StatCard
          title="Released Payroll"
          value={isLoading ? "—" : fmt(stats?.releasedPayroll ?? 0)}
          accent="green"
          icon={
            <HugeiconsIcon
              icon={MoneyReceive01Icon}
              size={16}
              strokeWidth={1.8}
            />
          }
          meta="This period"
        />
        <StatCard
          title="Incentives Total"
          value={isLoading ? "—" : fmt(stats?.incentivesTotal ?? 0)}
          accent="purple"
          icon={
            <HugeiconsIcon icon={Award01Icon} size={16} strokeWidth={1.8} />
          }
          meta="This period"
        />
      </div>

      {/* Payroll components breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Earnings */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HugeiconsIcon
              icon={CreditCardIcon}
              size={15}
              strokeWidth={1.8}
              className="text-primary"
            />
            <h3 className="text-[13px] font-semibold text-foreground">
              Earnings
            </h3>
          </div>
          <div className="space-y-3">
            <BarRow
              label="Basic Salary"
              amount={stats?.totalBasicSalary ?? 0}
              total={totalComponents}
              color="bg-primary"
            />
            <BarRow
              label="Incentives"
              amount={stats?.totalIncentives ?? 0}
              total={totalComponents}
              color="bg-violet-500"
            />
          </div>
        </div>

        {/* Deductions */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HugeiconsIcon
              icon={Invoice01Icon}
              size={15}
              strokeWidth={1.8}
              className="text-danger"
            />
            <h3 className="text-[13px] font-semibold text-foreground">
              Deductions
            </h3>
          </div>
          <div className="space-y-3">
            <BarRow
              label="Absences"
              amount={stats?.totalAbsences ?? 0}
              total={totalComponents}
              color="bg-red-500"
            />
            <BarRow
              label="Late Penalties"
              amount={stats?.totalLatePenalties ?? 0}
              total={totalComponents}
              color="bg-orange-500"
            />
            <BarRow
              label="Cash Advances"
              amount={stats?.totalCashAdvances ?? 0}
              total={totalComponents}
              color="bg-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
