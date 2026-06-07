"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/custom/logo"

/**
 * Shared sticky header for all public-facing pages (landing, pricing, careers, login, register).
 * `right` renders items on the right side — pass null to omit, or omit it for the default nav.
 */
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/careers", label: "Careers" },
]

export function PublicHeader({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="WorkOS home">
          <Logo />
        </Link>
        {right !== undefined ? (
          right
        ) : (
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "text-[13px] transition-colors",
                  isActive(item.href)
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/auth/login"
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
