import { api } from "./api"

/** The AI provider the whole system routes through. */
export type AiProvider = "ollama" | "gemini"

/** Current global AI-provider config (admin view, from wos-ai). */
export interface AiSettings {
  provider: AiProvider
  ollamaModel: string
  geminiModel: string
  /** Whether the server has a GEMINI_API_KEY — false means switching to Gemini is blocked. */
  geminiConfigured: boolean
  updatedBy: string | null
  updatedAt: string | null
}

export interface AiSettingsPayload {
  provider: AiProvider
  ollamaModel?: string
  geminiModel?: string
}

export const aiSettingsApi = {
  get: () =>
    api.get<AiSettings>("/ai/admin/settings/ai-provider").then((r) => r.data),
  update: (payload: AiSettingsPayload) =>
    api
      .put<AiSettings>("/ai/admin/settings/ai-provider", payload)
      .then((r) => r.data),
}
