"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { adminAttendanceApi } from "@/lib/admin-api"

export function useTeamAttendance(
  params: {
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: ["admin", "attendance", "team", params],
    queryFn: () => adminAttendanceApi.team(params),
    placeholderData: keepPreviousData,
  })
}
