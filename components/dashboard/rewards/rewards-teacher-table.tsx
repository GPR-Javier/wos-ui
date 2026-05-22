"use client"

import { useState } from "react"
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
import { StatusBadge } from "@/components/custom/status-badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, StarIcon, MedalFirstPlaceIcon } from "@hugeicons/core-free-icons"
import { useTeacherRatings } from "@/hooks/use-rewards"
import { type LeaderboardPeriod, type RatingDistribution } from "@/lib/rewards-api"
import { cn } from "@/lib/utils"

function StarBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-[11px] text-muted-foreground">
        {value}
      </span>
    </div>
  )
}

function RatingDistributionCell({ dist }: { dist: RatingDistribution }) {
  const total = dist.one + dist.two + dist.three + dist.four + dist.five
  const bars: { stars: number; count: number; color: string }[] = [
    { stars: 5, count: dist.five, color: "bg-green-500" },
    { stars: 4, count: dist.four, color: "bg-lime-500" },
    { stars: 3, count: dist.three, color: "bg-amber-400" },
    { stars: 2, count: dist.two, color: "bg-orange-500" },
    { stars: 1, count: dist.one, color: "bg-red-500" },
  ]
  return (
    <div className="space-y-0.5 min-w-[80px]">
      {bars.map((b) => (
        <StarBar key={b.stars} value={b.count} max={total} />
      ))}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-1 text-amber-500 font-bold text-[13px]">
        <HugeiconsIcon icon={MedalFirstPlaceIcon} size={14} strokeWidth={1.8} />
        #1
      </span>
    )
  if (rank === 2)
    return (
      <span className="tabular-nums text-[13px] font-semibold text-slate-400">
        #2
      </span>
    )
  if (rank === 3)
    return (
      <span className="tabular-nums text-[13px] font-semibold text-amber-700">
        #3
      </span>
    )
  return (
    <span className="tabular-nums text-[13px] text-muted-foreground">
      #{rank}
    </span>
  )
}

const COLUMNS = [
  "Rank",
  "Teacher",
  "Weekly Avg",
  "Monthly Avg",
  "Sessions",
  "Distribution",
  "Eligible",
  "Total Rewards",
  "Attendance",
]

export function RewardsTeacherTable() {
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<LeaderboardPeriod>("monthly")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const { data, isLoading, isError } = useTeacherRatings({
    search: search || undefined,
    period,
    page: page - 1,
    size: pageSize,
  })

  const teachers = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 basis-52">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={2}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-8 pl-8 text-[12px]"
            placeholder="Search teacher…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
          <SelectTrigger className="h-8 w-32 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly" className="text-[12px]">Weekly</SelectItem>
            <SelectItem value="monthly" className="text-[12px]">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load teacher ratings
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((h) => (
              <TableHead
                key={h}
                className={cn(
                  "text-[11px]",
                  ["Weekly Avg", "Monthly Avg", "Sessions", "Total Rewards", "Attendance"].includes(h)
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
              <TableCell colSpan={COLUMNS.length} className="py-8 text-center text-[13px] text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          ) : teachers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="py-8 text-center text-[13px] text-muted-foreground">
                No data yet — upload rating records to get started
              </TableCell>
            </TableRow>
          ) : (
            teachers.map((t) => {
              const initials = t.teacherName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              return (
                <TableRow key={t.id}>
                  <TableCell><RankBadge rank={t.rank} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{t.teacherName}</p>
                        <p className="text-[11px] text-muted-foreground">{t.teamLeader}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <HugeiconsIcon icon={StarIcon} size={11} strokeWidth={0} className="fill-amber-400 text-amber-400" />
                      <span className="tabular-nums font-medium">{t.weeklyAvg.toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <HugeiconsIcon icon={StarIcon} size={11} strokeWidth={0} className="fill-amber-400 text-amber-400" />
                      <span className="tabular-nums font-medium">{t.monthlyAvg.toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{t.totalSessions}</TableCell>
                  <TableCell><RatingDistributionCell dist={t.ratingDistribution} /></TableCell>
                  <TableCell>
                    <StatusBadge variant={t.rewardEligible ? "green" : "gray"} dot={false}>
                      {t.rewardEligible ? "Eligible" : "Not eligible"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    ₱{t.totalEarnedRewards.toLocaleString("en-PH")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={cn(
                      "font-medium",
                      t.attendanceRate >= 90 ? "text-green-600 dark:text-green-400"
                        : t.attendanceRate >= 75 ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {t.attendanceRate.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
    </div>
  )
}
