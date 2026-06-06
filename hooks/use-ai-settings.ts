"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  aiSettingsApi,
  type AiSettings,
  type AiSettingsPayload,
} from "@/lib/ai-settings-api"

const AI_SETTINGS_KEY = ["ai-settings"] as const

export function useAiSettings() {
  return useQuery({
    queryKey: AI_SETTINGS_KEY,
    queryFn: aiSettingsApi.get,
  })
}

export function useUpdateAiSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AiSettingsPayload) => aiSettingsApi.update(payload),
    onSuccess: (data: AiSettings) => qc.setQueryData(AI_SETTINGS_KEY, data),
  })
}
