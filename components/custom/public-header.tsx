"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/custom/logo"
import { useSlug, withSlug } from "@/lib/slug"

/**
 * Shared sticky header for all public-facing pages (landing, pricing, careers, login, register).
 * `right` renders items on the right side — pass null to omit, or omit it for the default nav.
 */
const NAV_LINKS = [
  { tail: "", label: "Home" },
  { tail: "/pricing", label: "Pricing" },
  { tail: "/careers", label: "Careers" },
]

export function PublicHeader({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname()
  const slug = useSlug()
  // Home is "/<slug>"; section tails become "/<slug>/<tail>".
  const hrefFor = (tail: string) => (tail ? withSlug(slug, tail) : `/${slug}`)
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={`/${slug}`} aria-label="WorkOS home">
          <Logo />
        </Link>
        {right !== undefined ? (
          right
        ) : (
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((item) => {
              const href = hrefFor(item.tail)
              return (
                <Link
                  key={item.label}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "text-[13px] transition-colors",
                    isActive(href)
                      ? "font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <Link
              href={withSlug(slug, "/login")}
              className="rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
