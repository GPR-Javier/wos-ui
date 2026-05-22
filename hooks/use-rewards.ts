"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  rewardsApi,
  type TeacherRatingFilters,
  type RewardHistoryFilters,
  type RewardRulePayload,
  type LeaderboardPeriod,
} from "@/lib/rewards-api"

export function useRewardStats() {
  return useQuery({ queryKey: ["rewards", "stats"], queryFn: rewardsApi.stats })
}

export function useTeacherRatings(params: TeacherRatingFilters = {}) {
  return useQuery({
    queryKey: ["rewards", "teachers", params],
    queryFn: () => rewardsApi.teachers(params),
  })
}

export function useLeaderboard(period: LeaderboardPeriod = "monthly") {
  return useQuery({
    queryKey: ["rewards", "leaderboard", period],
    queryFn: () => rewardsApi.leaderboard(period),
  })
}

export function useRewardRules() {
  return useQuery({ queryKey: ["rewards", "rules"], queryFn: rewardsApi.rules })
}

export function useCreateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RewardRulePayload) => rewardsApi.createRule(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards", "rules"] }),
  })
}

export function useUpdateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RewardRulePayload }) =>
      rewardsApi.updateRule(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards", "rules"] }),
  })
}

export function useToggleRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => rewardsApi.toggleRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards", "rules"] }),
  })
}

export function useRewardHistory(params: RewardHistoryFilters = {}) {
  return useQuery({
    queryKey: ["rewards", "history", params],
    queryFn: () => rewardsApi.history(params),
  })
}

export function usePublicDashboard() {
  return useQuery({
    queryKey: ["rewards", "public"],
    queryFn: rewardsApi.publicDashboard,
  })
}

export function useRatingVersions() {
  return useQuery({
    queryKey: ["rewards", "rating-versions"],
    queryFn: rewardsApi.ratingVersions,
  })
}

export function useUploadRatings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: rewardsApi.uploadRatings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", "rating-versions"] })
      qc.invalidateQueries({ queryKey: ["rewards", "teachers"] })
    },
  })
}
