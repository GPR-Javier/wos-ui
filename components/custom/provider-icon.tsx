import type { ReactNode } from "react"

/**
 * Renders a sign-in provider's icon for a DYNAMIC provider key. Resolution order:
 *   1. `iconUrl` (admin-supplied) — covers any custom provider.
 *   2. a built-in brand icon for well-known keys (google / microsoft / github).
 *   3. fallback — the display name's first letter in a tile.
 */
const KNOWN: Record<string, ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.52.1.71-.23.71-.5v-1.74c-2.92.63-3.54-1.41-3.54-1.41-.48-1.21-1.16-1.54-1.16-1.54-.95-.65.07-.64.07-.64 1.05.08 1.6 1.08 1.6 1.08.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.66-1.4-2.33-.27-4.78-1.17-4.78-5.18 0-1.15.41-2.08 1.08-2.81-.11-.27-.47-1.34.1-2.79 0 0 .88-.28 2.88 1.07a10 10 0 0 1 5.24 0c2-1.35 2.88-1.07 2.88-1.07.57 1.45.21 2.52.1 2.79.67.73 1.08 1.66 1.08 2.81 0 4.02-2.46 4.9-4.8 5.16.38.33.71.97.71 1.96v2.9c0 .28.19.61.72.5A10.5 10.5 0 0 0 12 1.5z" />
    </svg>
  ),
}

export function ProviderIcon({
  provider,
  displayName,
  iconUrl,
}: {
  provider: string
  displayName: string
  iconUrl?: string | null
}) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="size-4 shrink-0 rounded-sm object-contain"
      />
    )
  }
  const known = KNOWN[provider.trim().toLowerCase()]
  if (known) return known
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-muted text-[9px] font-bold text-muted-foreground">
      {(displayName.trim()[0] ?? "?").toUpperCase()}
    </span>
  )
}
