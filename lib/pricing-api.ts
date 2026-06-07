import { publicApi } from "./api"

// Public WorkOS pricing — flat tier + seat cap. Served by wos-hr GET /hr/plans (no auth).
// monthlyPrice/annualPrice are null when custom (Enterprise); seatLimit null = unlimited;
// trialDays non-null marks the free-trial plan.
export interface PricingPlan {
  slug: string
  name: string
  tagline: string
  monthlyPrice: number | null
  annualPrice: number | null
  customPrice: boolean
  seatLimit: number | null
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
