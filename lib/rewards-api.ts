import { api } from "./api"
import type { PageResponse } from "./admin-api"

// ── Types ──────────────────────────────────────────────────────────────────

export type RuleType = "rating" | "performance" | "material"
export type RewardType = "monetary" | "material"
export type TriggerType = "per-session" | "weekly-bonus" | "monthly-bonus"
export type RewardStatus = "pending" | "approved" | "released"
export type VersionStatus = "processing" | "active" | "archived" | "failed"
export type LeaderboardPeriod = "weekly" | "monthly"

export interface RewardStats {
  averageRating: number
  topPerformerName: string
  totalRewardsIssued: number
  pendingRewardPayouts: number
  activeRulesCount: number
}

export interface RatingDistribution {
  one: number
  two: number
  three: number
  four: number
  five: number
}

export interface TeacherRatingSummary {
  id: number
  teacherId: string
  teacherName: string
  teamLeader: string
  weeklyAvg: number
  monthlyAvg: number
  totalSessions: number
  ratingDistribution: RatingDistribution
  rewardEligible: boolean
  totalEarnedRewards: number
  attendanceRate: number
  rank: number
}

export interface LeaderboardEntry {
  rank: number
  teacherId: string
  teacherName: string
  averageRating: number
  totalSessions: number
  totalRewards: number
}

export interface RewardRule {
  id: number
  name: string
  ruleType: RuleType
  ratingMin: number | null
  ratingMax: number | null
  minSessions: number | null
  minAttendanceRate: number | null
  rewardType: RewardType
  monetaryAmount: number | null
  materialItem: string | null
  triggerType: TriggerType
  active: boolean
  effectiveFrom: string
  effectiveTo: string | null
  createdBy: string
  createdAt: string
}

export type RewardRulePayload = Omit<
  RewardRule,
  "id" | "createdBy" | "createdAt"
>

export interface RewardHistory {
  id: number
  teacherId: string
  teacherName: string
  ruleId: number | null
  ruleName: string
  rewardType: RewardType
  trigger: "rating" | "attendance" | "manual"
  monetaryAmount: number | null
  materialItem: string | null
  dateIssued: string
  issuedBy: string
  status: RewardStatus
}

export interface RatingVersion {
  id: number
  title: string
  fileName: string
  uploadedAt: string
  uploadedBy: string
  rowCount: number
  status: VersionStatus
  notes: string | null
}

export interface PublicDashboardData {
  monthlyLeaderboard: LeaderboardEntry[]
  weeklyLeaderboard: LeaderboardEntry[]
  teacherOfMonth: LeaderboardEntry | null
  mostImproved: { teacherName: string; improvementPct: number } | null
  recentRewards: {
    teacherName: string
    rewardType: RewardType
    monetaryAmount: number | null
    materialItem: string | null
    dateIssued: string
  }[]
}

// ── API ────────────────────────────────────────────────────────────────────
//
// Backend endpoints (Spring Boot, context-path /api):
//
//  GET  /rewards/stats
//  GET  /rewards/teachers           paginated + search + period params
//  GET  /rewards/leaderboard        ?period=weekly|monthly
//  GET  /rewards/rules
//  POST /rewards/rules
//  PUT  /rewards/rules/{id}
//  PATCH /rewards/rules/{id}/toggle
//  GET  /rewards/history            paginated + filters
//  GET  /rewards/public             public dashboard data
//  POST /rewards/ratings/upload     multipart/form-data
//  GET  /rewards/ratings/versions
//

export interface TeacherRatingFilters {
  search?: string
  period?: LeaderboardPeriod
  page?: number
  size?: number
}

export interface RewardHistoryFilters {
  search?: string
  rewardType?: string
  status?: string
  page?: number
  size?: number
}

export const rewardsApi = {
  stats: () =>
    api.get<RewardStats>("/payroll/rewards/stats").then((r) => r.data),

  teachers: (params: TeacherRatingFilters = {}) =>
    api
      .get<PageResponse<TeacherRatingSummary>>("/payroll/rewards/teachers", {
        params: { page: 0, size: 25, ...params },
      })
      .then((r) => r.data),

  leaderboard: (period: LeaderboardPeriod = "monthly") =>
    api
      .get<
        LeaderboardEntry[]
      >("/payroll/rewards/leaderboard", { params: { period } })
      .then((r) => r.data),

  rules: () =>
    api.get<RewardRule[]>("/payroll/rewards/rules").then((r) => r.data),

  createRule: (payload: RewardRulePayload) =>
    api.post<RewardRule>("/payroll/rewards/rules", payload).then((r) => r.data),

  updateRule: (id: number, payload: RewardRulePayload) =>
    api
      .put<RewardRule>(`/payroll/rewards/rules/${id}`, payload)
      .then((r) => r.data),

  toggleRule: (id: number) =>
    api
      .patch<RewardRule>(`/payroll/rewards/rules/${id}/toggle`)
      .then((r) => r.data),

  history: (params: RewardHistoryFilters = {}) =>
    api
      .get<PageResponse<RewardHistory>>("/payroll/rewards/history", {
        params: { page: 0, size: 25, ...params },
      })
      .then((r) => r.data),

  publicDashboard: () =>
    api.get<PublicDashboardData>("/payroll/rewards/public").then((r) => r.data),

  ratingVersions: () =>
    api
      .get<RatingVersion[]>("/payroll/rewards/ratings/versions")
      .then((r) => r.data),

  uploadRatings: (payload: { file: File; title: string; notes?: string }) => {
    const form = new FormData()
    form.append("file", payload.file)
    form.append("title", payload.title)
    if (payload.notes) form.append("notes", payload.notes)
    return api
      .post<RatingVersion>("/payroll/rewards/ratings/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      })
      .then((r) => r.data)
  },
}
