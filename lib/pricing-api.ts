import { publicApi } from "./api"

// Public WorkOS pricing — flat tier + seat cap. Served by wos-hr GET /hr/plans (no auth).
// monthlyPrice/annualPrice are null when custom (Enterprise); seatLimit null = unlimited;
// trialDays non-null marks the free-trial plan.
export interface PricingPlan {
  slug: string
  name: string
  tagline: string
  /** ISO-4217 currency the prices are quoted in (e.g. "PHP"). */
  currency: string
  monthlyPrice: number | null
  annualPrice: number | null
  customPrice: boolean
  seatLimit: number | null
  /** Seats included in the base price; extra seats cost perSeat*. */
  includedSeats: number | null
  perSeatMonthly: number | null
  perSeatAnnual: number | null
  trialDays: number | null
  recommended: boolean
  sortOrder: number
  ctaLabel: string
  features: string[]
}

// Compare-plans feature matrix: canonical rows + which plans include each key.
export interface FeatureRow {
  key: string
  label: string
  description: string
  /** Optional caveat shown inline under the feature (e.g. AI needs your own API key). */
  note?: string | null
}
export interface PlanColumn {
  slug: string
  name: string
  recommended: boolean
  included: string[]
}
export interface PlanComparison {
  features: FeatureRow[]
  plans: PlanColumn[]
}

export const pricingApi = {
  list: () => publicApi.get<PricingPlan[]>("/hr/plans").then((r) => r.data),
  comparison: () =>
    publicApi.get<PlanComparison>("/hr/plans/comparison").then((r) => r.data),
}
