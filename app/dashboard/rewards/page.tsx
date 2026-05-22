"use client"

import { useAuthStore } from "@/store/auth-store"
import {
  AdminRewardsView,
  PublicRewardsView,
} from "@/components/dashboard/rewards"

export default function RewardsPage() {
  const apiRole = useAuthStore((s) => s.apiRole)
  const isAdminOrHR =
    apiRole?.toUpperCase() === "ADMIN" || apiRole?.toUpperCase() === "HR"

  return (
    <div className="animate-in p-6 duration-300 fade-in">
      {isAdminOrHR ? <AdminRewardsView /> : <PublicRewardsView />}
    </div>
  )
}
