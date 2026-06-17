"use client"

import { useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useCompleteOAuth, useSelectRole } from "@/hooks/use-auth"
import { useAuthStore } from "@/store/auth-store"

/**
 * Landing page after a successful OAuth callback. The identity cookie is already set by gpr-auth;
 * here we establish the WorkOS session (mint the role token → resolve the role) the same way
 * password login does, then route onward. Without this step the UI has no role and shows "Employee".
 */
export default function OAuthCompletePage() {
  const slug = useParams().slug as string
  const complete = useCompleteOAuth()
  const selectRole = useSelectRole()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    // Slug-scoped redirects after auth use the active company slug.
    useAuthStore.getState().setCompanySlug(slug)
    complete.mutate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const data = complete.data

  if (complete.isError) {
    return (
      <Centered>
        <p className="text-[14px] font-medium">
          Sign-in couldn&apos;t be completed.
        </p>
        <Link
          href={`/${slug}/login`}
          className="mt-3 text-[13px] text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </Centered>
    )
  }

  // Multi-role accounts: let the user pick which role to enter as.
  if (data && data.requiresRoleSelection) {
    return (
      <Centered>
        <p className="text-[14px] font-medium">Choose a role to continue</p>
        <div className="mt-4 w-full space-y-2">
          {data.availableRoles.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRole.mutate({ userRoleId: r.id })}
              disabled={selectRole.isPending}
              className="flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background text-[13px] font-medium transition-colors hover:bg-muted"
            >
              {r.name}
            </button>
          ))}
        </div>
      </Centered>
    )
  }

  return (
    <Centered>
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <p className="mt-3 text-[13px] text-muted-foreground">Signing you in…</p>
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-xs flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
        {children}
      </div>
    </div>
  )
}
