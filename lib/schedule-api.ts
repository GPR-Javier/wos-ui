import { api } from "./axios"
import type { PageResponse } from "./admin-api"

// ── Types ──────────────────────────────────────────────────────────────────

export type VersionStatus = "processing" | "active" | "archived" | "failed"
export type ScheduleStatus =
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "no-show"
export type AttendanceStatus = "present" | "late" | "absent" | "no-show"
export type TeacherStatus = "online" | "offline" | "late"

export interface ScheduleVersion {
  id: number
  title: string
  fileName: string
  uploadedAt: string
  uploadedBy: string
  rowCount: number
  status: VersionStatus
  notes: string | null
}

export interface ScheduleEntry {
  id: number
  versionId: number
  classId: string
  date: string
  startTime: string
  endTime: string
  durationMinutes: number
  teacherName: string
  teacherStatus: TeacherStatus
  studentName: string
  scheduleStatus: ScheduleStatus
  attendanceStatus: AttendanceStatus | null
  timeIn: string | null
  timeOut: string | null
  lateMinutes: number
  sessionNotes: string | null
  teamLeader: string
  rating: number | null
  issueFlag: boolean
  lastUpdated: string
}

export interface ScheduleFilters {
  versionId?: number
  dateFrom?: string
  dateTo?: string
  datePreset?: "today" | "yesterday" | "this-week"
  search?: string
  scheduleStatus?: string
  page?: number
  size?: number
}

export interface UploadSchedulePayload {
  file: File
  title: string
  notes?: string
}

// ── API ────────────────────────────────────────────────────────────────────
//
// Backend endpoints (Spring Boot, context-path /api):
//
//  POST   /schedules/upload               multipart/form-data {file, title, notes?}
//  GET    /schedules/versions             → ScheduleVersion[]
//  PATCH  /schedules/versions/{id}/activate
//  PATCH  /schedules/versions/{id}/archive
//  GET    /schedules/versions/{id}/download  → blob (original Excel)
//  GET    /schedules/entries              paginated, params: ScheduleFilters
//

export const scheduleApi = {
  versions: () =>
    api.get<ScheduleVersion[]>("/schedules/versions").then((r) => r.data),

  activateVersion: (id: number) =>
    api
      .patch<ScheduleVersion>(`/schedules/versions/${id}/activate`)
      .then((r) => r.data),

  archiveVersion: (id: number) =>
    api
      .patch<ScheduleVersion>(`/schedules/versions/${id}/archive`)
      .then((r) => r.data),

  downloadVersion: async (id: number, fileName: string) => {
    const res = await api.get(`/schedules/versions/${id}/download`, {
      responseType: "blob",
    })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  },

  entries: (params: ScheduleFilters = {}) =>
    api
      .get<PageResponse<ScheduleEntry>>("/schedules/entries", {
        params: { page: 0, size: 25, ...params },
      })
      .then((r) => r.data),

  upload: (payload: UploadSchedulePayload) => {
    const form = new FormData()
    form.append("file", payload.file)
    form.append("title", payload.title)
    if (payload.notes) form.append("notes", payload.notes)
    return api
      .post<ScheduleVersion>("/schedules/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      })
      .then((r) => r.data)
  },
}
