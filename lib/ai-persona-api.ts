import { api } from "./api"

/** The active AI interviewer persona (name + avatar) — shown across the interview UI. */
export interface AiPersona {
  name: string
  avatarUrl: string | null
}

/** DiceBear avatar styles offered in the admin generator (free, no API key, seed-based). */
export const AVATAR_STYLES = [
  "personas",
  "lorelei",
  "notionists",
  "avataaars",
  "micah",
  "adventurer",
  "thumbs",
  "bottts",
] as const

export type AvatarStyle = (typeof AVATAR_STYLES)[number]

/** Builds a DiceBear avatar URL from a style + seed. */
export function dicebearUrl(style: string, seed: string): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}

/** A random seed for re-rolling a generated avatar. */
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Fallback persona used when none is configured (a bottts robot named Gennette). */
export const FALLBACK_PERSONA_NAME = "Gennette"
export const FALLBACK_AVATAR_URL = dicebearUrl("bottts", "Gennette")

export const aiPersonaApi = {
  /** The active provider's persona — readable by any authenticated user (used in the interview). */
  get: () =>
    api
      .get<AiPersona>("/ai/persona", { skipErrorToast: true })
      .then((r) => r.data),
}
