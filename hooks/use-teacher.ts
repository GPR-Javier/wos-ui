"use client"

import { useQuery } from "@tanstack/react-query"
import { teacherApi } from "@/lib/teacher-api"

export function useTeachers(
  params: {
    page?: number
    size?: number
    search?: string
    status?: string
  } = {}
) {
  return useQuery({
    queryKey: ["teachers", params],
    queryFn: () => teacherApi.teachers(params),
  })
}
