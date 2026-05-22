"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CrownIcon,
  StarIcon,
  MedalFirstPlaceIcon,
  MedalSecondPlaceIcon,
  MedalThirdPlaceIcon,
} from "@hugeicons/core-free-icons"
import { useLeaderboard } from "@/hooks/use-rewards"
import { type LeaderboardPeriod } from "@/lib/rewards-api"
import { cn } from "@/lib/utils"

const PERIOD_OPTS: { label: string; value: LeaderboardPeriod }[] = [
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },
]

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <HugeiconsIcon
        icon={MedalFirstPlaceIcon}
        size={20}
        strokeWidth={1.5}
        className="text-amber-400"
      />
    )
  if (rank === 2)
    return (
      <HugeiconsIcon
        icon={MedalSecondPlaceIcon}
        size={20}
        strokeWidth={1.5}
        className="text-slate-400"
      />
    )
  if (rank === 3)
    return (
      <HugeiconsIcon
        icon={MedalThirdPlaceIcon}
        size={20}
        strokeWidth={1.5}
        className="text-amber-700"
      />
    )
  return (
    <span className="flex h-5 w-5 items-center justify-center text-[12px] font-bold text-muted-foreground">
      {rank}
    </span>
  )
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <HugeiconsIcon
          key={s}
          icon={StarIcon}
          size={11}
          strokeWidth={0}
          className={
            s <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          }
        />
      ))}
      <span className="ml-1 tabular-nums text-[12px] font-medium">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

interface Props {
  compact?: boolean
}

export function RewardsLeaderboard({ compact = false }: Props) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("monthly")
  const { data: entries = [], isLoading } = useLeaderboard(period)

  const display = compact ? entries.slice(0, 5) : entries.slice(0, 10)
  const top3 = entries.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={CrownIcon} size={15} strokeWidth={1.8} className="text-amber-500" />
          <h3 className="text-[13px] font-semibold">
            {period === "monthly" ? "Monthly" : "Weekly"} Leaderboard
          </h3>
        </div>
        <div className="flex rounded-lg border border-border bg-muted p-0.5">
          {PERIOD_OPTS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-md px-3 py-1 text-[11px] font-medium transition-all",
                period === p.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium (admin full view only) */}
      {!compact && top3.length >= 3 && (
        <div className="flex items-end justify-center gap-3 pt-2 pb-4">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-[14px] font-bold dark:bg-slate-800">
              {top3[1]?.teacherName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <p className="text-[11px] font-medium text-center max-w-[80px] truncate">{top3[1]?.teacherName}</p>
            <StarRating value={top3[1]?.averageRating ?? 0} />
            <div className="flex h-16 w-20 items-center justify-center rounded-t-lg bg-slate-200 dark:bg-slate-700">
              <HugeiconsIcon icon={MedalSecondPlaceIcon} size={24} strokeWidth={1.5} className="text-slate-400" />
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center gap-2">
            <HugeiconsIcon icon={CrownIcon} size={20} strokeWidth={1.8} className="text-amber-400" />
            <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-[16px] font-bold ring-2 ring-amber-400 dark:bg-amber-900/30">
              {top3[0]?.teacherName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <p className="text-[12px] font-semibold text-center max-w-[90px] truncate">{top3[0]?.teacherName}</p>
            <StarRating value={top3[0]?.averageRating ?? 0} />
            <div className="flex h-24 w-24 items-center justify-center rounded-t-lg bg-amber-200 dark:bg-amber-900/30">
              <HugeiconsIcon icon={MedalFirstPlaceIcon} size={28} strokeWidth={1.5} className="text-amber-500" />
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-[14px] font-bold dark:bg-amber-900/20">
              {top3[2]?.teacherName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <p className="text-[11px] font-medium text-center max-w-[80px] truncate">{top3[2]?.teacherName}</p>
            <StarRating value={top3[2]?.averageRating ?? 0} />
            <div className="flex h-12 w-20 items-center justify-center rounded-t-lg bg-amber-100 dark:bg-amber-900/20">
              <HugeiconsIcon icon={MedalThirdPlaceIcon} size={22} strokeWidth={1.5} className="text-amber-700" />
            </div>
          </div>
        </div>
      )}

      {/* Rankings list */}
      <div className="space-y-1">
        {isLoading ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">Loading…</p>
        ) : display.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">No leaderboard data yet</p>
        ) : (
          display.map((entry) => (
            <div
              key={entry.teacherId}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                entry.rank <= 3
                  ? "bg-amber-50/50 dark:bg-amber-900/10"
                  : "hover:bg-muted/50"
              )}
            >
              <MedalIcon rank={entry.rank} />
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {entry.teacherName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{entry.teacherName}</p>
                <p className="text-[11px] text-muted-foreground">{entry.totalSessions} sessions</p>
              </div>
              <div className="text-right">
                <StarRating value={entry.averageRating} />
                <p className="text-[11px] text-muted-foreground">
                  ₱{entry.totalRewards.toLocaleString("en-PH")} earned
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
