"use client"

import { useQuery } from "@tanstack/react-query"
import { adminAttendanceApi } from "@/lib/admin-api"

export function useTeamAttendance(params: {
  date?: string
  page?: number
  size?: number
} = {}) {
  return useQuery({
    queryKey: ["admin", "attendance", "team", params],
    queryFn: () => adminAttendanceApi.team(params),
  })
}
