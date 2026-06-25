"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useReactivateOAuth } from "@/hooks/use-auth"
import { useToastStore } from "@/store/toast-store"

/**
 * OAuth reactivation. Reached when an OAuth sign-in matched a soft-deleted account: the provider
 * login already proved ownership (signed token from the callback), so we only ask recover-or-fresh —
 * no password. Mirrors the password login's reactivation modal.
 */
export default function OAuthReactivatePage() {
  const slug = useParams().slug as string
  const token = useSearchParams().get("token") ?? ""
  const router = useRouter()
  const push = useToastStore((s) => s.push)
  const reactivate = useReactivateOAuth()

  const choose = (mode: "recover" | "fresh") => {
    if (!token) {
      push("This reactivation request is invalid or expired.", "error")
      return
    }
    reactivate.mutate({ token, mode, slug })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[16px] font-semibold text-foreground">
          Welcome back — this account was deleted
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Your account is scheduled for deletion but the data is still here. You
          can recover it, or wipe it and start fresh.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            onClick={() => choose("recover")}
            disabled={reactivate.isPending}
            className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            <span className="block text-[14px] font-semibold text-foreground">
              Recover my account
            </span>
            <span className="block text-[12px] text-muted-foreground">
              Restore everything as it was — profile, history, and access.
            </span>
          </button>
          <button
            onClick={() => choose("fresh")}
            disabled={reactivate.isPending}
            className="rounded-xl border border-destructive/30 px-4 py-3 text-left transition-colors hover:bg-destructive/5 disabled:opacity-60"
          >
            <span className="block text-[14px] font-semibold text-destructive">
              Erase data &amp; start fresh
            </span>
            <span className="block text-[12px] text-muted-foreground">
              Permanently wipe your data and begin with a clean account.
            </span>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${slug}/login`)}
            disabled={reactivate.isPending}
          >
            Cancel
          </Button>
          {reactivate.isPending && (
            <p className="text-[12px] text-muted-foreground">Signing you in…</p>
          )}
        </div>
      </div>
    </div>
  )
}
