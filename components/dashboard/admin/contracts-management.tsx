"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  FilterIcon,
  UserCircleIcon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAllContracts } from "@/hooks/use-contract"
import {
  EMPLOYMENT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  type ContractStatus,
  type EmploymentType,
} from "@/lib/contract-api"

function fmt(date?: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const ALL_STATUSES: ContractStatus[] = [
  "ACTIVE",
  "DRAFT",
  "EXPIRED",
  "TERMINATED",
  "SUPERSEDED",
]
const ALL_TYPES: EmploymentType[] = [
  "REGULAR",
  "PROBATIONARY",
  "CONTRACTUAL",
  "PROJECT_BASED",
  "PART_TIME",
  "CASUAL",
]

export function ContractsManagement() {
  const { data: contracts = [], isLoading } = useAllContracts()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "ALL">(
    "ALL"
  )
  const [typeFilter, setTypeFilter] = useState<EmploymentType | "ALL">("ALL")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contracts.filter((c) => {
      const name =
        `${c.employee?.firstName ?? ""} ${c.employee?.lastName ?? ""}`.toLowerCase()
      const empId = (c.employee?.employeeId ?? "").toLowerCase()
      const cn = (c.contractNumber ?? "").toLowerCase()
      const matchSearch =
        !q || name.includes(q) || empId.includes(q) || cn.includes(q)
      const matchStatus =
        statusFilter === "ALL" || c.contractStatus === statusFilter
      const matchType = typeFilter === "ALL" || c.employmentType === typeFilter
      return matchSearch && matchStatus && matchType
    })
  }, [contracts, search, statusFilter, typeFilter])

  // Summary counts
  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: contracts.length }
    ALL_STATUSES.forEach((s) => {
      out[s] = contracts.filter((c) => c.contractStatus === s).length
    })
    return out
  }, [contracts])

  if (isLoading) {
    return (
      <div className="py-20 text-center text-[13px] text-muted-foreground">
        Loading contracts…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", ...ALL_STATUSES] as (ContractStatus | "ALL")[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {s === "ALL" ? "All" : CONTRACT_STATUS_LABELS[s]}{" "}
            <span className="ml-1 tabular-nums opacity-70">
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={2}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-8 pl-8 text-[13px]"
            placeholder="Search by name, ID, or contract #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as EmploymentType | "ALL")}
        >
          <SelectTrigger className="h-8 w-44 text-[13px]">
            <HugeiconsIcon
              icon={FilterIcon}
              size={12}
              strokeWidth={2}
              className="mr-1.5"
            />
            <SelectValue placeholder="Employment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-[13px]">
              All types
            </SelectItem>
            {ALL_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-[13px]">
                {EMPLOYMENT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card py-16 text-center text-[13px] text-muted-foreground">
          {contracts.length === 0
            ? "No contracts on record yet."
            : "No contracts match the current filters."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Contract #</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Position / Grade</th>
                <th className="px-4 py-3 text-left">Start</th>
                <th className="px-4 py-3 text-left">End</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => {
                const name =
                  `${c.employee?.firstName ?? ""} ${c.employee?.lastName ?? ""}`.trim()
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <tr
                    key={c.id}
                    className="group transition-colors hover:bg-muted/30"
                  >
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials || (
                            <HugeiconsIcon
                              icon={UserCircleIcon}
                              size={14}
                              strokeWidth={1.5}
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{name || "—"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.employee?.employeeId ?? c.employee?.email ?? ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contract # */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.contractNumber ?? (
                        <span className="italic opacity-50">N/A</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      {EMPLOYMENT_TYPE_LABELS[c.employmentType]}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          CONTRACT_STATUS_COLORS[c.contractStatus]
                        )}
                      >
                        {CONTRACT_STATUS_LABELS[c.contractStatus]}
                      </span>
                    </td>

                    {/* Position / Grade */}
                    <td className="px-4 py-3">
                      <p>
                        {c.jobPosition?.title ?? (
                          <span className="opacity-40">—</span>
                        )}
                      </p>
                      {c.salaryGrade && (
                        <p className="text-[11px] text-muted-foreground">
                          {c.salaryGrade.name}
                          {c.salaryGrade.salaryAmount
                            ? ` · ₱${c.salaryGrade.salaryAmount.toLocaleString("en-PH")}`
                            : ""}
                        </p>
                      )}
                    </td>

                    {/* Dates */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmt(c.startDate)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.endDate ? (
                        fmt(c.endDate)
                      ) : (
                        <span className="italic opacity-50">Open</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() =>
                          router.push(
                            `/dashboard/employees/${c.employee?.id}?tab=contracts`
                          )
                        }
                      >
                        View
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          size={11}
                          strokeWidth={2}
                          className="ml-1 -rotate-90"
                        />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-right text-[11px] text-muted-foreground">
        Showing {filtered.length} of {contracts.length} contracts
      </p>
    </div>
  )
}
