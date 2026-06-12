"use client"

import { useParams } from "next/navigation"
import { useCallback } from "react"

// Every app page lives under a company slug (`/<slug>/...`); the company-less / public default.
export const GUEST_SLUG = "guest"

/** The active company slug from the URL (`/<slug>/...`), defaulting to "guest". */
export function useSlug(): string {
  const params = useParams()
  const slug = params?.slug
  const value = Array.isArray(slug) ? slug[0] : slug
  return value || GUEST_SLUG
}

/**
 * Returns a prefixer that turns an app-absolute path into a slug-scoped one:
 * `slugHref("/dashboard/payroll")` → `/gpr/dashboard/payroll`.
 */
export function useSlugHref(): (path: string) => string {
  const slug = useSlug()
  return useCallback((path: string) => withSlug(slug, path), [slug])
}

/** Prefix an app-absolute path with a slug. Pass-through for non-absolute / already-prefixed input. */
export function withSlug(slug: string, path: string): string {
  if (!path.startsWith("/")) return path
  return `/${slug}${path}`
}
