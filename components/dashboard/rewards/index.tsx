"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ChartBarIncreasingIcon,
  CrownIcon,
  Target01Icon,
  WorkHistoryIcon,
  CloudUploadIcon,
  GlobeIcon,
} from "@hugeicons/core-free-icons"
import { RewardsSummary } from "./rewards-summary"
import { RewardsTeacherTable } from "./rewards-teacher-table"
import { RewardsLeaderboard } from "./rewards-leaderboard"
import { RewardsRules } from "./rewards-rules"
import { RewardsHistory } from "./rewards-history"
import { RewardsUploadDialog } from "./rewards-upload-dialog"
import { RewardsPublic } from "./rewards-public"

// ── Admin full view ────────────────────────────────────────────────────────

function AdminRewardsView() {
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">
            Rewards & Ratings
          </h1>
          <p className="text-[12px] text-muted-foreground">
            Teacher incentive engine — configure rules, track ratings, and
            manage rewards.
          </p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <HugeiconsIcon
            icon={CloudUploadIcon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          Upload ratings
        </Button>
      </div>

      <RewardsSummary />

      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers" className="text-[12px]">
            <HugeiconsIcon
              icon={ChartBarIncreasingIcon}
              size={13}
              strokeWidth={1.8}
            />
            Performance
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-[12px]">
            <HugeiconsIcon icon={CrownIcon} size={13} strokeWidth={1.8} />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-[12px]">
            <HugeiconsIcon icon={Target01Icon} size={13} strokeWidth={1.8} />
            Reward Rules
          </TabsTrigger>
          <TabsTrigger value="history" className="text-[12px]">
            <HugeiconsIcon icon={WorkHistoryIcon} size={13} strokeWidth={1.8} />
            History
          </TabsTrigger>
          <TabsTrigger value="public" className="text-[12px]">
            <HugeiconsIcon icon={GlobeIcon} size={13} strokeWidth={1.8} />
            Public View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="mt-5">
          <RewardsTeacherTable />
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-5">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <RewardsLeaderboard />
          </div>
        </TabsContent>
        <TabsContent value="rules" className="mt-5">
          <RewardsRules />
        </TabsContent>
        <TabsContent value="history" className="mt-5">
          <RewardsHistory />
        </TabsContent>
        <TabsContent value="public" className="mt-5">
          <RewardsPublic />
        </TabsContent>
      </Tabs>

      <RewardsUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  )
}

// ── Public / non-admin view ────────────────────────────────────────────────

function PublicRewardsView() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[16px] font-bold text-foreground">
          Rewards & Ratings
        </h1>
        <p className="text-[12px] text-muted-foreground">
          Teacher performance rankings and reward highlights.
        </p>
      </div>
      <RewardsPublic />
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────

export { AdminRewardsView, PublicRewardsView }
