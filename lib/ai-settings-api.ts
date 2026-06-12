import { api } from "./api"

/** The AI provider the whole system routes through. */
export type AiProvider = "ollama" | "gemini"

/** Current global AI-provider config (admin view, from wos-ai). */
export interface AiSettings {
  provider: AiProvider
  ollamaModel: string
  ollamaPersonaName: string | null
  ollamaAvatarUrl: string | null
  /** Null until Gemini is configured by an admin. */
  geminiModel: string | null
  /** Whether a Gemini key is configured (DB or env) — false means switching to Gemini is blocked. */
  geminiConfigured: boolean
  /** Masked preview of the stored key (e.g. "••••••••WjtC"), or null if none. Never the full key. */
  geminiKeyHint: string | null
  geminiPersonaName: string | null
  geminiAvatarUrl: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export interface AiSettingsPayload {
  provider: AiProvider
  ollamaModel?: string
  ollamaPersonaName?: string
  ollamaAvatarUrl?: string
  geminiModel?: string
  /** New Gemini key to store; omit/blank to leave the existing one unchanged. */
  geminiApiKey?: string
  geminiPersonaName?: string
  geminiAvatarUrl?: string
}

export interface GeminiTestResult {
  valid: boolean
  message: string
}

export const aiSettingsApi = {
  get: () =>
    api.get<AiSettings>("/ai/admin/settings/ai-provider").then((r) => r.data),
  update: (payload: AiSettingsPayload) =>
    api
      .put<AiSettings>("/ai/admin/settings/ai-provider", payload)
      .then((r) => r.data),
  /** Validate a key (the one being typed, or the saved one when omitted) without saving it. */
  testGemini: (apiKey?: string) =>
    api
      .post<GeminiTestResult>(
        "/ai/admin/settings/ai-provider/test-gemini",
        { apiKey },
        { skipErrorToast: true }
      )
      .then((r) => r.data),
  /** Chat-capable models available to the given key (or the saved one) — for the model dropdown. */
  geminiModels: (apiKey?: string) =>
    api
      .post<
        string[]
      >("/ai/admin/settings/ai-provider/gemini-models", { apiKey }, { skipErrorToast: true })
      .then((r) => r.data),
  /** Models installed on the Ollama server (GET /api/tags) — for the Ollama model dropdown. */
  ollamaModels: () =>
    api
      .get<string[]>("/ai/admin/settings/ai-provider/ollama-models", {
        skipErrorToast: true,
      })
      .then((r) => r.data),
}
