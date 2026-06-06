"use client"

import { useQuery } from "@tanstack/react-query"
import { aiPersonaApi } from "@/lib/ai-persona-api"

/** The active AI interviewer persona (name + avatar) for the interview UI. */
export function useAiPersona() {
  return useQuery({
    queryKey: ["ai-persona"],
    queryFn: aiPersonaApi.get,
    staleTime: 5 * 60 * 1000,
  })
}
