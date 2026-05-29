import Link from "next/link"
import { Logo } from "@/components/custom/logo"

/**
 * Shared sticky header for all public-facing pages (landing, careers, login, register).
 * `right` renders items on the right side — pass null to omit.
 */
export function PublicHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="WorkOS home">
          <Logo />
        </Link>
        {right !== undefined ? right : (
          <nav className="flex items-center gap-6">
            <Link href="/careers" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
              Careers
            </Link>
            <Link href="/auth/login" className="text-[13px] font-medium text-foreground transition-colors hover:text-primary">
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
