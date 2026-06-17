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
    // "guest"/unknown slugs have no branding — skip the request (it would only 404) and use the
    // default theme. Real company slugs still fetch normally.
    enabled: !!slug && slug !== "guest",
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
    // Most companies upload a logo but not a separate favicon — fall back to the app
    // icon / logo so the brand still shows in the tab, only defaulting when there's none.
    setFavicon(data.favicon ?? data.appIcon ?? data.logo ?? "/favicon.svg")
  }, [data])

  return <>{children}</>
}

function setFavicon(href: string) {
  // Manage ONE app-owned <link> (tagged data-app-favicon) and never touch the icon
  // links Next injects from metadata. Removing those React-managed nodes (the old
  // approach) desynced React's <head> fiber tree from the DOM, so a later navigation
  // tried to delete an already-removed node and crashed with "Cannot read properties
  // of null (reading 'removeChild')". Appending ours last lets the browser prefer it.
  let link = document.head.querySelector<HTMLLinkElement>(
    "link[data-app-favicon]"
  )
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    link.setAttribute("data-app-favicon", "")
    document.head.appendChild(link)
  }
  // Derive the type from a data-URL so the browser doesn't mis-sniff it.
  const m = /^data:([^;,]+)[;,]/.exec(href)
  link.type = m ? m[1] : ""
  link.href = href
}
