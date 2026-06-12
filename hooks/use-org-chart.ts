"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { orgChartApi, type OrgLayout } from "@/lib/org-chart-api"

const GRAPH_KEY = ["org-chart", "graph"] as const
const LAYOUT_KEY = ["org-chart", "layout"] as const

export function useOrgGraph() {
  return useQuery({
    queryKey: GRAPH_KEY,
    queryFn: orgChartApi.graph,
  })
}

export function useOrgLayout() {
  return useQuery({
    queryKey: LAYOUT_KEY,
    queryFn: orgChartApi.getLayout,
  })
}

export function useSetManager() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      managerId,
    }: {
      userId: number
      managerId: number | null
    }) => orgChartApi.setManager(userId, managerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: GRAPH_KEY }),
  })
}

export function useSetDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      departmentId,
    }: {
      userId: number
      departmentId: number | null
    }) => orgChartApi.setDepartment(userId, departmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: GRAPH_KEY }),
  })
}

export function useSaveLayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (layout: OrgLayout) => orgChartApi.saveLayout(layout),
    onSuccess: (saved) => qc.setQueryData(LAYOUT_KEY, saved),
  })
}

export function useResetLayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => orgChartApi.resetLayout(),
    onSuccess: () => qc.invalidateQueries({ queryKey: LAYOUT_KEY }),
  })
}
