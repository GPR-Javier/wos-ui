"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSlug } from "@/lib/slug"
import { companyBrandingApi } from "@/lib/company-branding-api"

// Applies the company's branding (accent + radius + favicon) to everything under its slug — login,
// dashboard, and public pages alike — by overriding the design-system CSS variables on <html>.
// Branding is fetched publicly by slug, so it works pre-auth; "guest"/unknown slugs 404 → default theme.
export default function SlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const slug = useSlug()

  const { data } = useQuery({
    queryKey: ["public-branding", slug],
    queryFn: () => companyBrandingApi.getBySlug(slug),
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    const el = document.documentElement
    // Reset any previously-applied overrides so switching slugs doesn't leak branding.
    for (const v of [
      "--primary",
      "--ring",
      "--sidebar-primary",
      "--chart-1",
      "--r",
      "--rl",
      "--rxl",
      "--radius",
    ]) {
      el.style.removeProperty(v)
    }
    if (!data) return
    if (data.accentColor) {
      el.style.setProperty("--primary", data.accentColor)
      el.style.setProperty("--ring", data.accentColor)
      el.style.setProperty("--sidebar-primary", data.accentColor)
      el.style.setProperty("--chart-1", data.accentColor)
    }
    if (data.radius != null) {
      el.style.setProperty("--r", `${data.radius}px`)
      el.style.setProperty("--rl", `${data.radius * 1.5}px`)
      el.style.setProperty("--rxl", `${data.radius * 2}px`)
      el.style.setProperty("--radius", `${data.radius}px`)
    }
    setFavicon(data.favicon ?? "/favicon.svg")
  }, [data])

  return <>{children}</>
}

function setFavicon(href: string) {
  // Next injects several icon links (favicon.ico + the metadata /favicon.svg as
  // both `icon` and `shortcut icon`). Updating just one leaves the browser free to
  // prefer a static one, so remove them all and add a single fresh link.
  document
    .querySelectorAll<HTMLLinkElement>("link[rel~='icon']")
    .forEach((el) => el.remove())
  const link = document.createElement("link")
  link.rel = "icon"
  // Derive the type from a data-URL so the browser doesn't mis-sniff it.
  const m = /^data:([^;,]+)[;,]/.exec(href)
  if (m) link.type = m[1]
  link.href = href
  document.head.appendChild(link)
}
