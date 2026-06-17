"use client"

import { useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { oauthProviderApi } from "@/lib/oauth-provider-api"
import { useToastStore } from "@/store/toast-store"

/**
 * OAuth link-confirmation. Reached when an OAuth sign-in matched an existing account but couldn't be
 * auto-linked (unverified email / untrusted provider). The user must prove they own the existing
 * account (sign in) before we attach the provider — this is what makes confirm-on-unverified safe.
 */
export default function OAuthLinkPage() {
  const slug = useParams().slug as string
  const token = useSearchParams().get("token") ?? ""
  const router = useRouter()
  const push = useToastStore((s) => s.push)

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!token) {
      push("This link request is invalid or expired.", "error")
      return
    }
    if (!identifier || !password) return
    setBusy(true)
    try {
      await oauthProviderApi.confirmLink({ token, identifier, password })
      push("Sign-in method linked.", "success")
      router.push(`/${slug}/dashboard`)
    } catch {
      // error toast surfaced by the API interceptor (wrong password, email mismatch, expired token)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-[16px] font-semibold">Link your sign-in</h1>
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          An account with this email already exists. To link this sign-in
          method, confirm it&apos;s you by signing in to your existing account.
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Email or username</Label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${slug}/login`)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={busy || !identifier || !password}
          >
            {busy ? "Linking…" : "Confirm & link"}
          </Button>
        </div>
      </div>
    </div>
  )
}
