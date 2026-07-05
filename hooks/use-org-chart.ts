"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  orgChartApi,
  type OrgLayout,
  type AddReportingLineRequest,
} from "@/lib/org-chart-api"

const GRAPH_KEY = ["org-chart", "graph"] as const
const LAYOUT_KEY = ["org-chart", "layout"] as const
const reportsToKey = (userId: number) =>
  ["org-chart", "reports-to", userId] as const

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

/** The typed reporting lines for one person (carries manager name + role label). */
export function useReportsTo(userId: number, enabled = true) {
  return useQuery({
    queryKey: reportsToKey(userId),
    queryFn: () => orgChartApi.reportsTo(userId),
    enabled,
  })
}

export function useAddReportingLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      body,
    }: {
      userId: number
      body: AddReportingLineRequest
    }) => orgChartApi.addReportsTo(userId, body),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: GRAPH_KEY })
      qc.invalidateQueries({ queryKey: reportsToKey(userId) })
    },
  })
}

export function useRemoveReportingLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, lineId }: { userId: number; lineId: number }) =>
      orgChartApi.removeReportsTo(userId, lineId),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: GRAPH_KEY })
      qc.invalidateQueries({ queryKey: reportsToKey(userId) })
    },
  })
}

/**
 * Legacy single-parent setter — retained only for the Create-user "wire the new hire
 * under their manager" flow. Prefer useAddReportingLine for new work.
 */
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
