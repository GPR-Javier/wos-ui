"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon, EyeIcon } from "@hugeicons/core-free-icons"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { PayslipViewModal } from "./payslip-view-modal"
import { figuresFromPayslip, type PayslipRecord } from "@/lib/payslip-figures"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { TablePagination } from "@/components/custom/table-pagination"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"
import { usePayslips } from "@/hooks/use-employee"
import type { PayslipEntry } from "@/lib/employee-api"

// ── helpers ──────────────────────────────────────────────────────────────────

function parseAmt(s: string): number {
  return parseFloat(s.replace(/[₱,]/g, "")) || 0
}

const DownloadIcon = ({ className }: { className?: string }) => (
  <HugeiconsIcon
    icon={Download01Icon}
    size={13}
    strokeWidth={2}
    className={className}
  />
)

// ── sub-components ────────────────────────────────────────────────────────────

function SectionBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 bg-muted px-6 py-2">
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {children}
      </p>
    </div>
  )
}

function SlipRow({
  label,
  value,
  labelClass,
  valueClass,
}: {
  label: string
  value: string
  labelClass?: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <span className={cn("text-[13px]", labelClass ?? "text-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "text-[13px] font-medium tabular-nums",
          valueClass ?? "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function BreakdownBar({
  label,
  value,
  pct,
  indicatorClassName,
  valueClass,
}: {
  label: string
  value: string
  pct: number
  indicatorClassName: string
  valueClass?: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px]">{label}</span>
        <span
          className={cn("text-[13px] font-semibold tabular-nums", valueClass)}
        >
          {value}
        </span>
      </div>
      <Progress
        value={pct}
        className="h-1.5"
        indicatorClassName={indicatorClassName}
      />
    </div>
  )
}

function YtdCard({
  label,
  value,
  meta,
  valueClass,
}: {
  label: string
  value: string
  meta?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", valueClass)}>
        {value}
      </p>
      {meta && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function PayrollSection() {
  // The raw record, not the formatted summary: the modal renders the full template, which needs
  // the allowance and deduction lines the summary strings drop.
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRecord | null>(
    null
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { user } = useAuthStore()
  const { data, isLoading, isError } = usePayslips({
    page: page - 1,
    size: pageSize,
  })

  const payslips = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  const latest = payslips.find((p) => p.status === "released") ?? payslips[0]

  const basicAmt = latest ? parseAmt(latest.basic) : 0
  const otAmt = latest ? parseAmt(latest.ot) : 0
  const grossAmt = latest ? parseAmt(latest.gross) : 0
  const ssAmt = latest ? parseAmt(latest.sss) : 0
  const phAmt = latest ? parseAmt(latest.philhealth) : 0
  const taxAmt = latest ? parseAmt(latest.tax) : 0
  const dedAmt = latest ? parseAmt(latest.deductions) : 0

  // Flattened from the same projection the template and PDF use, so the card, the modal and the
  // downloaded payslip can't disagree about what was earned or deducted.
  const figures = latest ? figuresFromPayslip(latest.raw) : null
  const allowanceRows = figures?.allowances.empty
    ? []
    : (figures?.allowances.rows ?? [])
  const deductionRows = (figures?.deductions.groups ?? []).flatMap(
    (g) => g.rows
  )

  const month = latest?.period.split(" ")[0] ?? "—"
  const fullName = user ? `${user.firstName} ${user.lastName}` : "—"
  const empId = user?.employeeId ?? "—"

  return (
    <div className="space-y-5">
      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Basic salary"
          value={latest?.basic.replace(/\.00$/, "") ?? "—"}
          meta="Monthly base"
          accent="blue"
        />
        <StatCard
          title={`Total earnings (${month})`}
          value={latest?.gross ?? "—"}
          delta={
            latest?.otHrs !== "—"
              ? `Incl. ${latest?.otHrs} hrs overtime`
              : "No overtime"
          }
          deltaUp={true}
          accent="green"
        />
        <StatCard
          title="Total deductions"
          value={
            <span className="text-danger">{latest?.deductions ?? "—"}</span>
          }
          // Named the actual groups present rather than a fixed list that omitted loans.
          meta={
            (figures?.deductions.groups ?? [])
              .map((g) => g.label)
              .join(" · ") || "—"
          }
          accent="red"
        />
        <StatCard
          title={`Net pay (${month})`}
          value={<span className="text-success">{latest?.net ?? "—"}</span>}
          accent="green"
        />
      </div>

      {/* ── Latest payslip + Pay breakdown ── */}
      {isLoading ? (
        <p className="text-[13px] text-muted-foreground">
          Loading payroll data…
        </p>
      ) : isError ? (
        <p className="rounded-lg border border-danger-border bg-danger-light px-4 py-3 text-[13px] text-danger">
          Failed to load payroll data
        </p>
      ) : latest ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Latest payslip */}
          <div className="overflow-hidden rounded-xl border border-border shadow-sm">
            <div className="bg-primary px-6 py-5 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase opacity-70">
                    Latest payslip
                  </p>
                  <p className="mt-0.5 text-xl font-bold">{latest.period}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white"
                  onClick={() => setSelectedPayslip(latest.raw)}
                >
                  <DownloadIcon className="mr-1" />
                  Download PDF
                </Button>
              </div>
              <p className="mt-2.5 text-[13px] opacity-80">
                {fullName} · {empId}
              </p>
            </div>

            <div className="px-6 pb-4">
              {/* Every line, not just the statutory four. Listing a subset under a total that
                  includes the rest leaves an employee unable to reconcile their own payslip. */}
              <SectionBand>Earnings</SectionBand>
              <SlipRow label="Basic salary" value={latest.basic} />
              {allowanceRows.map((r) => (
                <SlipRow
                  key={r.label}
                  label={r.label}
                  value={`+${r.amount}`}
                  labelClass="text-muted-foreground"
                  valueClass="text-success"
                />
              ))}
              {latest.ot !== "—" && (
                <SlipRow
                  label={`Overtime — ${latest.otHrs} hrs`}
                  value={`+${latest.ot}`}
                  labelClass="text-muted-foreground"
                  valueClass="text-success"
                />
              )}
              <SectionBand>Deductions</SectionBand>
              {deductionRows.map((r) => (
                <SlipRow
                  key={r.label}
                  label={r.label}
                  value={`-${r.amount}`}
                  labelClass="text-muted-foreground"
                  valueClass="text-danger"
                />
              ))}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <span className="text-[13px] font-bold">Net pay</span>
                <span className="text-lg font-bold text-success">
                  {latest.net}
                </span>
              </div>
            </div>
          </div>

          {/* Pay breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Pay breakdown</CardTitle>
              <CardDescription>{latest.period} composition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BreakdownBar
                label="Basic salary"
                value={latest.basic.replace(".00", "")}
                pct={grossAmt > 0 ? (basicAmt / grossAmt) * 100 : 0}
                indicatorClassName="bg-primary"
              />
              {latest.ot !== "—" && (
                <BreakdownBar
                  label="Overtime"
                  value={`+${latest.ot.replace(".00", "")}`}
                  pct={grossAmt > 0 ? (otAmt / grossAmt) * 100 : 0}
                  indicatorClassName="bg-green-500"
                  valueClass="text-success"
                />
              )}
              {/* Every deduction, so the bars sum to the total shown above them. Listing three of
                  them made the composition look wrong for anyone who added it up. */}
              <div className="space-y-3 border-t border-border pt-4">
                {deductionRows.map((r) => (
                  <BreakdownBar
                    key={r.label}
                    label={r.label}
                    value={`-${r.amount.replace(".00", "")}`}
                    pct={dedAmt > 0 ? (parseAmt(r.amount) / dedAmt) * 100 : 0}
                    indicatorClassName="bg-red-500"
                    valueClass="text-danger"
                  />
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-[13px] font-semibold">Net pay</span>
                <span className="text-base font-bold text-success">
                  {latest.net.replace(".00", "")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── Payroll history ── */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll history</CardTitle>
          <CardDescription>Year to date · 2025</CardDescription>
          <CardAction>
            <Button size="sm" variant="outline">
              <DownloadIcon className="mr-1.5" />
              Export all
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  { label: "Period", right: false },
                  { label: "Basic", right: true },
                  { label: "Overtime", right: true },
                  { label: "Gross", right: true },
                  { label: "Deductions", right: true },
                  { label: "Net pay", right: true },
                  { label: "Released", right: false },
                  { label: "Status", right: false },
                  { label: "Actions", right: false },
                ].map(({ label, right }) => (
                  <TableHead
                    key={label}
                    className={right ? "text-right" : undefined}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-8 text-center text-[13px] text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (
                payslips.map((p, i) => {
                  const isUpcoming = p.status === "upcoming"
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.period}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {isUpcoming ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          p.basic
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.ot !== "—" ? (
                          <span className="text-success">+{p.ot}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {isUpcoming ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          p.gross
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.deductions !== "—" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default text-danger underline decoration-dashed underline-offset-2">
                                -{p.deductions}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              showArrow={false}
                              className="min-w-50 flex-col items-stretch rounded-xl border border-border bg-card p-3 text-foreground shadow-raised"
                            >
                              <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                Deduction breakdown
                              </p>
                              {[
                                { label: "SSS", value: p.sss },
                                { label: "PhilHealth", value: p.philhealth },
                                { label: "Pag-IBIG", value: p.pagibig },
                                { label: "Withholding tax", value: p.tax },
                              ].map(({ label, value }) => (
                                <div
                                  key={label}
                                  className="flex justify-between gap-6 border-b border-border py-1 text-[12px] last:border-0"
                                >
                                  <span className="text-muted-foreground">
                                    {label}
                                  </span>
                                  <span className="font-medium text-danger">
                                    {value}
                                  </span>
                                </div>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {isUpcoming ? (
                          <span className="font-normal text-muted-foreground">
                            Pending
                          </span>
                        ) : (
                          p.net
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.released}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={isUpcoming ? "amber" : "green"}>
                          {isUpcoming ? "Upcoming" : "Released"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        {isUpcoming ? (
                          <span className="text-[12px] text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-xs"
                                  variant="outline"
                                  onClick={() => setSelectedPayslip(p.raw)}
                                >
                                  <HugeiconsIcon
                                    icon={EyeIcon}
                                    size={12}
                                    strokeWidth={2}
                                  />
                                  <span className="sr-only">View payslip</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View payslip</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-xs"
                                  variant="default"
                                  onClick={() => setSelectedPayslip(p.raw)}
                                >
                                  <DownloadIcon />
                                  <span className="sr-only">Download PDF</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download PDF</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
          />

          {/* YTD summary — static placeholder until backend provides totals */}
          <div className="mt-5 grid grid-cols-4 gap-3 border-t border-border pt-5">
            <YtdCard label="YTD gross earnings" value="₱233,325" />
            <YtdCard
              label="YTD overtime pay"
              value="₱8,325"
              valueClass="text-success"
              meta="31.25 hrs total"
            />
            <YtdCard
              label="YTD deductions"
              value="₱29,000"
              valueClass="text-danger"
            />
            <YtdCard
              label="YTD net pay"
              value="₱204,325"
              valueClass="text-success"
            />
          </div>
        </CardContent>
      </Card>

      <PayslipViewModal
        open={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        payslip={selectedPayslip}
      />
    </div>
  )
}
