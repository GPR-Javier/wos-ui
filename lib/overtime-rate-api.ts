import { api } from "./api"
import type { OvertimeType } from "./overtime-api"

export interface OvertimeRate {
  overtimeType: OvertimeType
  multiplier: number
  defaultMultiplier: number
  customized: boolean
}

export interface UpdateOvertimeRatesPayload {
  rates: { overtimeType: OvertimeType; multiplier: number }[]
}

export const overtimeRateApi = {
  list: () => api.get<OvertimeRate[]>("/hr/overtime-rates").then((r) => r.data),

  update: (body: UpdateOvertimeRatesPayload) =>
    api.put<OvertimeRate[]>("/hr/overtime-rates", body).then((r) => r.data),
}
