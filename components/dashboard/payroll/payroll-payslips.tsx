"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { TablePagination } from "@/components/custom/table-pagination"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, EyeIcon } from "@hugeicons/core-free-icons"
import { useAdminPayslips, usePayrollRuns } from "@/hooks/use-payroll"
import { type AdminPayslip, type PayslipStatus } from "@/lib/payroll-api"
import { PayslipDetail } from "./payroll-payslip-detail"
import { cn } from "@/lib/utils"

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
}

function payslipStatusVariant(s: PayslipStatus): "green" | "blue" | "gray" {
  switch (s) {
    case "released":
      return "green"
    case "generated":
      return "blue"
    case "draft":
      return "gray"
  }
}

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Generated", value: "generated" },
  { label: "Released", value: "released" },
]

interface Props {
  initialRunId?: number | null
}

const COLUMNS = [
  "Employee",
  "Period",
  "Basic Salary",
  "Incentives",
  "Deductions",
  "Net Pay",
  "Status",
  "",
]

export function PayrollPayslips({ initialRunId = null }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [runFilter, setRunFilter] = useState<string>(
    initialRunId ? String(initialRunId) : "all"
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedPayslip, setSelectedPayslip] = useState<AdminPayslip | null>(
    null
  )

  const { data: runsData } = usePayrollRuns()
  const runs = runsData?.content ?? []

  const { data, isLoading, isError } = useAdminPayslips({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    runId: runFilter !== "all" ? Number(runFilter) : undefined,
    page: page - 1,
    size: pageSize,
  })

  const payslips = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 basis-52">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={2}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-8 pl-8 text-[12px]"
            placeholder="Search employee name or ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <Select
          value={runFilter}
          onValueChange={(v) => {
            setRunFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-52 text-[12px]">
            <SelectValue placeholder="All payroll runs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[12px]">
              All payroll runs
            </SelectItem>
            {runs.map((r) => (
              <SelectItem
                key={r.id}
                value={String(r.id)}
                className="text-[12px]"
              >
                {r.period}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-36 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[12px]">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load payslips
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((h) => (
              <TableHead
                key={h}
                className={cn(
                  h === "" ? "text-right" : undefined,
                  [
                    "Basic Salary",
                    "Incentives",
                    "Deductions",
                    "Net Pay",
                  ].includes(h)
                    ? "text-right"
                    : undefined
                )}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : payslips.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                No payslips found
              </TableCell>
            </TableRow>
          ) : (
            payslips.map((ps) => {
              const initials = ps.employeeName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)

              return (
                <TableRow
                  key={ps.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedPayslip(ps)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">
                          {ps.employeeName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ps.employeeId} · {ps.teamLeader}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {ps.period}
                  </TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums">
                    {fmt(ps.basicSalary)}
                  </TableCell>
                  <TableCell className="text-right text-[13px] text-success tabular-nums">
                    {ps.incentives > 0 ? `+${fmt(ps.incentives)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-[13px] text-danger tabular-nums">
                    -{fmt(ps.totalDeductions)}
                  </TableCell>
                  <TableCell className="text-right text-[13px] font-semibold tabular-nums">
                    {fmt(ps.netPay)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={payslipStatusVariant(ps.status)}
                      dot={false}
                    >
                      {ps.status.charAt(0).toUpperCase() + ps.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setSelectedPayslip(ps)}
                    >
                      <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                      View
                    </Button>
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

      <PayslipDetail
        payslip={selectedPayslip}
        open={selectedPayslip != null}
        onClose={() => setSelectedPayslip(null)}
      />
    </div>
  )
}
