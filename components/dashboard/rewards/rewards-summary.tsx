"use client"

import { StatCard } from "@/components/custom/stat-card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  StarIcon,
  CrownIcon,
  Award01Icon,
  Coins01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons"
import { useRewardStats } from "@/hooks/use-rewards"

export function RewardsSummary() {
  const { data: stats, isLoading } = useRewardStats()

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        title="Average Rating"
        value={
          isLoading ? "—" : (stats?.averageRating?.toFixed(2) ?? "—") + " ★"
        }
        accent="amber"
        icon={<HugeiconsIcon icon={StarIcon} size={16} strokeWidth={1.8} />}
        meta="All teachers"
      />
      <StatCard
        title="Top Performer"
        value={isLoading ? "—" : (stats?.topPerformerName ?? "—")}
        accent="purple"
        icon={<HugeiconsIcon icon={CrownIcon} size={16} strokeWidth={1.8} />}
        meta="This month"
      />
      <StatCard
        title="Rewards Issued"
        value={
          isLoading
            ? "—"
            : `₱${(stats?.totalRewardsIssued ?? 0).toLocaleString("en-PH")}`
        }
        accent="green"
        icon={<HugeiconsIcon icon={Award01Icon} size={16} strokeWidth={1.8} />}
        meta="Total this period"
      />
      <StatCard
        title="Pending Payouts"
        value={
          isLoading
            ? "—"
            : `₱${(stats?.pendingRewardPayouts ?? 0).toLocaleString("en-PH")}`
        }
        accent="amber"
        icon={<HugeiconsIcon icon={Coins01Icon} size={16} strokeWidth={1.8} />}
        meta="Awaiting release"
      />
      <StatCard
        title="Active Rules"
        value={isLoading ? "—" : String(stats?.activeRulesCount ?? 0)}
        accent="blue"
        icon={<HugeiconsIcon icon={Target01Icon} size={16} strokeWidth={1.8} />}
        meta="Reward rules"
      />
    </div>
  )
}
