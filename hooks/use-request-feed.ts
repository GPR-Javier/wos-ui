"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { requestsApi, type RequestFeedParams } from "@/lib/requests-api"

/** Unified, server-paginated feed of the employee's own requests across all types. */
export function useMyRequestFeed(params: RequestFeedParams = {}) {
  return useQuery({
    queryKey: ["request-feed", "me", params],
    queryFn: () => requestsApi.listMine(params),
    placeholderData: keepPreviousData,
  })
}
