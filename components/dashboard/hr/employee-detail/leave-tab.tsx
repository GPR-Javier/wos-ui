"use client"

import { useMemo } from "react"
import type { Employee } from "@/lib/types"
import { StatusBadge } from "@/components/custom/status-badge"
import { EmptyState } from "@/components/custom/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { leaveRequests } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { useContracts } from "@/hooks/use-contract"
import { activeLeaveTypes, accruedDays, monthlyRate } from "@/lib/contract-api"

interface Props {
  employee: Employee
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function monthsBetween(a: Date, b: Date): number {
  return (
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  )
}

/** Compact rate text, e.g. 2 or 1.3 (drops trailing .0). */
function fmtNum(r: number): string {
  return r % 1 === 0 ? String(r) : r.toFixed(1)
}

interface AccrualEntry {
  date: Date
  label: string // "Month 2", "Month 4" …
  earned: boolean // past = earned, future = upcoming
  cumulative: number // running total at this point
}

function buildAccrualTimeline(
  startDate: Date,
  intervalMonths: number,
  creditPerInterval: number,
  maxFuture: number = 6
): AccrualEntry[] {
  const now = new Date()
  const entries: AccrualEntry[] = []

  // How many intervals have already elapsed?
  const elapsed = Math.floor(
    Math.max(0, monthsBetween(startDate, now)) / intervalMonths
  )
  const totalToShow = elapsed + maxFuture

  let cumulative = 0

  for (let i = 1; i <= totalToShow; i++) {
    const date = addMonths(startDate, i * intervalMonths)
    const earned = date <= now
    cumulative += creditPerInterval
    entries.push({
      date,
      label: `Month ${i * intervalMonths}`,
      earned,
      cumulative,
    })
  }

  return entries
}

// ── Accrual timeline ───────────────────────────────────────────────────────────

interface AccrualConfig {
  startDate: string // YYYY-MM-DD
  intervalMonths: number
  creditPerInterval: number
}

function AccrualTimeline({ config }: { config: AccrualConfig }) {
  const startDate = useMemo(
    () => new Date(config.startDate + "T00:00:00"),
    [config.startDate]
  )
  const entries = useMemo(
    () =>
      buildAccrualTimeline(
        startDate,
        config.intervalMonths,
        config.creditPerInterval
      ),
    [startDate, config.intervalMonths, config.creditPerInterval]
  )

  const now = new Date()
  const nextEntry = entries.find((e) => !e.earned)
  const totalEarned =
    entries.filter((e) => e.earned).length * config.creditPerInterval

  const daysUntilNext = nextEntry
    ? Math.ceil(
        (nextEntry.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-semibold">Accrual Timeline</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Started {fmtDate(startDate)} · {fmtNum(config.creditPerInterval)}{" "}
            credit/mo (total pool)
          </p>
        </div>
        <div className="flex shrink-0 gap-3 text-right">
          <div>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Total Earned
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {fmtNum(totalEarned)}
            </p>
          </div>
          {daysUntilNext !== null && (
            <div>
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Next Credit
              </p>
              <p className="text-lg font-semibold text-primary tabular-nums">
                {daysUntilNext <= 0 ? "Today" : `${daysUntilNext}d`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline entries */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute top-0 bottom-0 left-2.75 w-px bg-border" />

        <div className="space-y-1">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-start gap-3 pl-0">
              {/* Dot */}
              <div
                className={cn(
                  "relative z-10 mt-2.5 flex size-5.75 shrink-0 items-center justify-center rounded-full border-2",
                  entry.earned
                    ? "border-primary bg-primary text-primary-foreground"
                    : entry === nextEntry
                      ? "border-primary bg-background"
                      : "border-border bg-background"
                )}
              >
                {entry.earned ? (
                  <svg viewBox="0 0 10 10" className="size-2.5 fill-current">
                    <path
                      d="M1.5 5l2.5 2.5 4.5-4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      entry === nextEntry
                        ? "animate-pulse bg-primary"
                        : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "flex flex-1 items-center justify-between rounded-lg border px-3 py-2",
                  entry.earned
                    ? "bg-background"
                    : entry === nextEntry
                      ? "border-primary/30 bg-primary/5"
                      : "bg-muted/20 opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-[12px] font-medium",
                      !entry.earned && "text-muted-foreground"
                    )}
                  >
                    {fmtDate(entry.date)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {entry.label}
                  </span>
                  {entry === nextEntry && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Next
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-[12px] font-semibold tabular-nums",
                      entry.earned ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    +{fmtNum(config.creditPerInterval)}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    = {fmtNum(entry.cumulative)} total
                  </span>
                  <StatusBadge variant={entry.earned ? "green" : "gray"}>
                    {entry.earned ? "Earned" : "Upcoming"}
                  </StatusBadge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function LeaveTab({ employee }: Props) {
  const { data: contracts = [] } = useContracts(Number(employee.id))

  // Source of truth: the employee's ACTIVE contract (fall back to latest on file).
  const active = useMemo(
    () => contracts.find((c) => c.contractStatus === "ACTIVE") ?? contracts[0],
    [contracts]
  )
  const lc = active?.leaveCredits
  const startDate = active?.startDate ?? null
  const accrue = !!lc?.accrueMonthly
  const pools = activeLeaveTypes(lc)
  const hasConfig = !!lc && pools.some((p) => lc[p.key] != null)
  const totalAnnual = pools.reduce((sum, p) => sum + (lc?.[p.key] ?? 0), 0)

  const timelineConfig: AccrualConfig | null =
    accrue && startDate && totalAnnual > 0
      ? { startDate, intervalMonths: 1, creditPerInterval: totalAnnual / 12 }
      : null

  const myRequests = leaveRequests.filter((r) => r.employee === employee.name)

  return (
    <div className="space-y-4">
      {/* Entitlement cards — derived from the active contract */}
      {hasConfig ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pools.map((p) => {
            const annual = lc?.[p.key] ?? 0
            const accrued = accruedDays(annual, startDate, accrue)
            const pct = annual > 0 ? Math.min(100, (accrued / annual) * 100) : 0
            return (
              <div key={p.key} className="rounded-xl border bg-card p-4">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {p.label.replace(" Leave", "")}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {accrue ? fmtNum(accrued) : annual}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {annual}
                  </span>
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {accrue
                    ? `Accrued · ~${fmtNum(monthlyRate(annual))}/mo`
                    : "Granted upfront"}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState title="No leave entitlement configured on an active contract." />
      )}

      {hasConfig && (
        <p className="text-[11px] text-muted-foreground">
          Accrued-to-date is computed from the contract. Used / remaining
          tracking is not yet wired.
        </p>
      )}

      {/* Accrual timeline — only when accruing monthly */}
      {timelineConfig && <AccrualTimeline config={timelineConfig} />}

      {/* Leave history */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-3">
          <h3 className="text-[13px] font-semibold">Leave History</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {["ID", "Type", "From", "To", "Days", "Filed", "Status"].map(
                (h) => (
                  <TableHead key={h}>{h}</TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {myRequests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-[13px] text-muted-foreground"
                >
                  No leave requests found
                </TableCell>
              </TableRow>
            ) : (
              myRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-[12px]">
                    {req.id}
                  </TableCell>
                  <TableCell>{req.type}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {req.from}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {req.to}
                  </TableCell>
                  <TableCell className="tabular-nums">{req.days}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {req.filed}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={
                        req.status === "approved"
                          ? "green"
                          : req.status === "rejected"
                            ? "red"
                            : "amber"
                      }
                    >
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
