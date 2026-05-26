import { api } from "./api"
import type { PageResponse } from "./admin-api"

export type TripPurpose =
  | "CLIENT_MEETING"
  | "CONFERENCE"
  | "TRAINING"
  | "SITE_VISIT"
  | "GOVERNMENT_LIAISON"
  | "AUDIT"
  | "OTHER"

export type TravelMode = "DOMESTIC" | "INTERNATIONAL"

export type TransportType =
  | "PLANE"
  | "BUS"
  | "CAR"
  | "TRAIN"
  | "SHIP"
  | "OTHER"

export type TripStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED"

export interface BudgetAllocation {
  transportation: number
  accommodation: number
  meals: number
  miscellaneous: number
}

export interface BusinessTrip {
  id: number
  userId: number
  userName: string
  userEmail: string
  destination: string
  departureDate: string   // "YYYY-MM-DD"
  returnDate: string      // "YYYY-MM-DD"
  purpose: TripPurpose
  travelMode: TravelMode
  transportType: TransportType
  estimatedBudget: number
  accommodation: string | null
  remarks: string | null
  status: TripStatus
  reviewNote: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  budgetAllocation: BudgetAllocation | null
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateTripPayload {
  destination: string
  departureDate: string
  returnDate: string
  purpose: TripPurpose
  travelMode: TravelMode
  transportType: TransportType
  estimatedBudget: number
  budgetAllocation?: BudgetAllocation
  accommodation?: string
  remarks?: string
  isDraft?: boolean
}

export const businessTripApi = {
  // Employee
  createMine: (body: CreateTripPayload) =>
    api.post<BusinessTrip>("/hr/business-trips", body).then((r) => r.data),

  listMine: (params: { status?: TripStatus; page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<BusinessTrip>>("/hr/business-trips/me", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api.post<BusinessTrip>(`/hr/business-trips/${id}/cancel`).then((r) => r.data),

  // Admin / HR
  listAll: (
    params: { status?: TripStatus; search?: string; page?: number; size?: number } = {}
  ) =>
    api
      .get<PageResponse<BusinessTrip>>("/hr/business-trips", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  approve: (id: number, reviewNote?: string | null) =>
    api
      .post<BusinessTrip>(`/hr/business-trips/${id}/approve`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),

  reject: (id: number, reviewNote?: string | null) =>
    api
      .post<BusinessTrip>(`/hr/business-trips/${id}/reject`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),

  markCompleted: (id: number, reviewNote?: string | null) =>
    api
      .post<BusinessTrip>(`/hr/business-trips/${id}/complete`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),
}

// ── Display helpers ──────────────────────────────────────────────────────────

export const TRIP_PURPOSE_LABEL: Record<TripPurpose, string> = {
  CLIENT_MEETING: "Client Meeting",
  CONFERENCE: "Conference",
  TRAINING: "Training",
  SITE_VISIT: "Site Visit",
  GOVERNMENT_LIAISON: "Gov't Liaison",
  AUDIT: "Audit",
  OTHER: "Other",
}

export const TRIP_PURPOSE_COLOR: Record<
  TripPurpose,
  "blue" | "purple" | "green" | "amber" | "cyan" | "red" | "gray"
> = {
  CLIENT_MEETING: "blue",
  CONFERENCE: "purple",
  TRAINING: "green",
  SITE_VISIT: "amber",
  GOVERNMENT_LIAISON: "cyan",
  AUDIT: "red",
  OTHER: "gray",
}

export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
  DOMESTIC: "Domestic",
  INTERNATIONAL: "International",
}

export const TRANSPORT_TYPE_LABEL: Record<TransportType, string> = {
  PLANE: "Plane",
  BUS: "Bus",
  CAR: "Car / Van",
  TRAIN: "Train",
  SHIP: "Ship / Ferry",
  OTHER: "Other",
}

export const TRIP_PURPOSES: TripPurpose[] = [
  "CLIENT_MEETING",
  "CONFERENCE",
  "TRAINING",
  "SITE_VISIT",
  "GOVERNMENT_LIAISON",
  "AUDIT",
  "OTHER",
]

export const TRANSPORT_TYPES: TransportType[] = [
  "PLANE",
  "BUS",
  "CAR",
  "TRAIN",
  "SHIP",
  "OTHER",
]

export function tripDays(departure: string, returnDate: string): number {
  const d1 = new Date(departure)
  const d2 = new Date(returnDate)
  const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}
