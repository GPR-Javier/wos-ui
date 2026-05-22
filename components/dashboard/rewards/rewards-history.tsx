"use client"

import { useState } from "react"
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
import { StatusBadge } from "@/components/custom/status-badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, GiftIcon, Coins01Icon } from "@hugeicons/core-free-icons"
import { useRewardHistory } from "@/hooks/use-rewards"
import { type RewardStatus, type RewardType } from "@/lib/rewards-api"

function statusVariant(s: RewardStatus): "green" | "amber" | "blue" {
  switch (s) {
    case "released":
      return "green"
    case "approved":
      return "blue"
    case "pending":
      return "amber"
  }
}

const STATUS_OPTS = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Released", value: "released" },
]

const TYPE_OPTS = [
  { label: "All types", value: "all" },
  { label: "Monetary", value: "monetary" },
  { label: "Material", value: "material" },
]

const COLUMNS = [
  "Teacher",
  "Rule",
  "Type",
  "Trigger",
  "Reward",
  "Date Issued",
  "Issued By",
  "Status",
]

export function RewardsHistory() {
  const [search, setSearch] = useState("")
  const [rewardType, setRewardType] = useState("all")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const { data, isLoading, isError } = useRewardHistory({
    search: search || undefined,
    rewardType: rewardType !== "all" ? rewardType : undefined,
    status: status !== "all" ? status : undefined,
    page: page - 1,
    size: pageSize,
  })

  const entries = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="space-y-4">
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
            placeholder="Search teacher or rule…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={rewardType}
          onValueChange={(v) => {
            setRewardType(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-32 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[12px]">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-8 w-32 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[12px]">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load reward history
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((h) => (
              <TableHead key={h} className="text-[11px]">
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
          ) : entries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                No reward history yet
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <p className="text-[13px] font-medium">{entry.teacherName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.teacherId}
                  </p>
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {entry.ruleName}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <HugeiconsIcon
                      icon={
                        entry.rewardType === "monetary" ? Coins01Icon : GiftIcon
                      }
                      size={13}
                      strokeWidth={1.8}
                      className={
                        entry.rewardType === "monetary"
                          ? "text-green-500"
                          : "text-violet-500"
                      }
                    />
                    {entry.rewardType === "monetary" ? "Monetary" : "Material"}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    variant={
                      entry.trigger === "rating"
                        ? "amber"
                        : entry.trigger === "attendance"
                          ? "blue"
                          : "gray"
                    }
                    dot={false}
                  >
                    {entry.trigger.charAt(0).toUpperCase() +
                      entry.trigger.slice(1)}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-[13px] font-medium">
                  {entry.rewardType === "monetary" ? (
                    <span className="text-success">
                      ₱{entry.monetaryAmount?.toLocaleString("en-PH")}
                    </span>
                  ) : (
                    <span>{entry.materialItem}</span>
                  )}
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                  {new Date(entry.dateIssued).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {entry.issuedBy}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    variant={statusVariant(entry.status)}
                    dot={false}
                  >
                    {entry.status.charAt(0).toUpperCase() +
                      entry.status.slice(1)}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))
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
    </div>
  )
}
