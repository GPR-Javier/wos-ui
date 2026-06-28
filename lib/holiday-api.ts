import { api } from "./api"

export type HolidayType = "REGULAR" | "SPECIAL_NON_WORKING"

export interface Holiday {
  id: number
  date: string // ISO date "YYYY-MM-DD"
  name: string
  holidayType: HolidayType
  recurring: boolean
  active: boolean
}

export interface CreateHolidayPayload {
  date: string
  name: string
  holidayType: HolidayType
  recurring?: boolean
}

export interface UpdateHolidayPayload {
  date?: string
  name?: string
  holidayType?: HolidayType
  recurring?: boolean
  active?: boolean
}

export const holidayApi = {
  list: (params: { from?: string; until?: string } = {}) =>
    api.get<Holiday[]>("/hr/holidays", { params }).then((r) => r.data),

  create: (body: CreateHolidayPayload) =>
    api.post<Holiday>("/hr/holidays", body).then((r) => r.data),

  update: (id: number, body: UpdateHolidayPayload) =>
    api.put<Holiday>(`/hr/holidays/${id}`, body).then((r) => r.data),

  remove: (id: number) => api.delete(`/hr/holidays/${id}`).then((r) => r.data),
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const HOLIDAY_TYPE_LABEL: Record<HolidayType, string> = {
  REGULAR: "Regular Holiday",
  SPECIAL_NON_WORKING: "Special Non-Working",
}

export const HOLIDAY_TYPE_COLOR: Record<HolidayType, "purple" | "blue"> = {
  REGULAR: "purple",
  SPECIAL_NON_WORKING: "blue",
}

/** Worked-day pay multiplier per PH labor code (ordinary day; ×1.30 again on a rest day). */
export const HOLIDAY_TYPE_MULTIPLIER: Record<HolidayType, number> = {
  REGULAR: 2.0,
  SPECIAL_NON_WORKING: 1.3,
}
