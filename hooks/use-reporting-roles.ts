"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  reportingRoleApi,
  type CreateReportingRoleRequest,
  type UpdateReportingRoleRequest,
} from "@/lib/reporting-role-api"

const KEY = ["reporting-roles"] as const

export function useReportingRoles(
  params: { includeInactive?: boolean } = {},
  enabled = true
) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => reportingRoleApi.list(params),
    enabled,
  })
}

export function useCreateReportingRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateReportingRoleRequest) =>
      reportingRoleApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateReportingRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number
      body: UpdateReportingRoleRequest
    }) => reportingRoleApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteReportingRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => reportingRoleApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
