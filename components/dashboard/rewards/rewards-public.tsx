"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  CrownIcon,
  StarIcon,
  GiftIcon,
  Coins01Icon,
  SparklesIcon,
  Award01Icon,
} from "@hugeicons/core-free-icons"
import { usePublicDashboard } from "@/hooks/use-rewards"
import { cn } from "@/lib/utils"

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <HugeiconsIcon
          key={s}
          icon={StarIcon}
          size={13}
          strokeWidth={0}
          className={s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}
        />
      ))}
      <span className="ml-1 tabular-nums text-[13px] font-semibold">{value.toFixed(2)}</span>
    </div>
  )
}

function RankCard({ rank, name, rating, sessions, rewards }: {
  rank: number; name: string; rating: number; sessions: number; rewards: number
}) {
  const isTop = rank <= 3
  const ringColor = rank === 1 ? "ring-amber-400" : rank === 2 ? "ring-slate-400" : "ring-amber-700"
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
      rank === 1 && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
    )}>
      <span className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        rank === 1 ? "bg-amber-400 text-white" : rank === 2 ? "bg-slate-300 text-slate-800" : rank === 3 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
      )}>
        {rank}
      </span>
      <div className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
        isTop ? `bg-primary/10 text-primary ring-2 ${ringColor}` : "bg-muted text-muted-foreground"
      )}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px] truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground">{sessions} sessions</p>
      </div>
      <div className="text-right">
        <StarRating value={rating} />
        <p className="text-[11px] text-muted-foreground mt-0.5">
          ₱{rewards.toLocaleString("en-PH")} earned
        </p>
      </div>
    </div>
  )
}

export function RewardsPublic() {
  const { data, isLoading } = usePublicDashboard()

  if (isLoading) {
    return (
      <div className="py-16 text-center text-[13px] text-muted-foreground">
        Loading public dashboard…
      </div>
    )
  }

  const monthly = data?.monthlyLeaderboard ?? []
  const weekly = data?.weeklyLeaderboard ?? []
  const teacher = data?.teacherOfMonth
  const improved = data?.mostImproved
  const recentRewards = data?.recentRewards ?? []

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-violet-600 p-6 text-primary-foreground shadow-lg">
        <div className="absolute right-0 top-0 opacity-10">
          <HugeiconsIcon icon={CrownIcon} size={120} strokeWidth={1} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest opacity-75 mb-1">
          Performance Dashboard
        </p>
        <h2 className="text-2xl font-bold">Top Teachers Leaderboard</h2>
        <p className="text-[13px] opacity-80 mt-1">
          Recognizing outstanding teaching performance and dedication
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Teacher of the Month */}
        <div className="lg:col-span-1">
          {teacher && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-800 dark:bg-amber-900/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <HugeiconsIcon icon={CrownIcon} size={16} strokeWidth={1.8} className="text-amber-500" />
                <h3 className="text-[13px] font-semibold">Teacher of the Month</h3>
              </div>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-amber-400 text-white text-xl font-bold ring-4 ring-amber-300">
                  {teacher.teacherName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-[16px]">{teacher.teacherName}</p>
                  <StarRating value={teacher.averageRating} />
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {teacher.totalSessions} sessions · ₱{teacher.totalRewards.toLocaleString("en-PH")} earned
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Most Improved */}
          {improved && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <HugeiconsIcon icon={SparklesIcon} size={15} strokeWidth={1.8} className="text-violet-500" />
                <h3 className="text-[13px] font-semibold">Most Improved</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                  {improved.teacherName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-[13px]">{improved.teacherName}</p>
                  <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">
                    +{improved.improvementPct.toFixed(1)}% improvement
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Rewards */}
          {recentRewards.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <HugeiconsIcon icon={Award01Icon} size={15} strokeWidth={1.8} className="text-green-500" />
                <h3 className="text-[13px] font-semibold">Recent Rewards</h3>
              </div>
              <div className="space-y-2">
                {recentRewards.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <HugeiconsIcon
                      icon={r.rewardType === "monetary" ? Coins01Icon : GiftIcon}
                      size={13}
                      strokeWidth={1.8}
                      className={r.rewardType === "monetary" ? "text-green-500 shrink-0" : "text-violet-500 shrink-0"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate">{r.teacherName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.rewardType === "monetary"
                          ? `₱${r.monetaryAmount?.toLocaleString("en-PH")}`
                          : r.materialItem}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(r.dateIssued).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rankings */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2">
              <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={0} className="fill-amber-400 text-amber-400" />
              Monthly Top Performers
            </h3>
            <div className="space-y-2">
              {monthly.slice(0, 5).map((e) => (
                <RankCard key={e.teacherId} rank={e.rank} name={e.teacherName} rating={e.averageRating} sessions={e.totalSessions} rewards={e.totalRewards} />
              ))}
              {monthly.length === 0 && (
                <p className="py-6 text-center text-[13px] text-muted-foreground">No data yet</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2">
              <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={0} className="fill-amber-400 text-amber-400" />
              Weekly Top Performers
            </h3>
            <div className="space-y-2">
              {weekly.slice(0, 5).map((e) => (
                <RankCard key={e.teacherId} rank={e.rank} name={e.teacherName} rating={e.averageRating} sessions={e.totalSessions} rewards={e.totalRewards} />
              ))}
              {weekly.length === 0 && (
                <p className="py-6 text-center text-[13px] text-muted-foreground">No data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
