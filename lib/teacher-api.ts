import { api } from "./axios"
import type { PageResponse } from "./admin-api"

export interface Teacher {
  id: number
  employeeId: string
  firstName: string
  lastName: string
  email: string
  contactNumber: string
  status: "active" | "inactive"
  hireDate: string
  teamLeader: string
  rating: number
  attendanceRate: number
}

export const teacherApi = {
  teachers: (
    params: {
      page?: number
      size?: number
      search?: string
      status?: string
    } = {}
  ) =>
    api
      .get<PageResponse<Teacher>>("/teachers", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),
}
