"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useIdentityMe } from "@/hooks/use-identity-profile"
import { identityProfileApi } from "@/lib/identity-profile-api"
import { oauthProviderApi } from "@/lib/oauth-provider-api"
import { ProviderIcon } from "@/components/custom/provider-icon"
import { useToastStore } from "@/store/toast-store"

// ── Provider icons ─────────────────────────────────────────────────────────────

function IconEmail() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  )
}

// ── Password input with show/hide toggle ───────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder,
  onKeyDown,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="pr-9"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface LoginMethod {
  id: string
  name: string
  icon: React.ReactNode
  connected: boolean
  account?: string
}

// ── Generic method row ─────────────────────────────────────────────────────────

function MethodRow({
  method,
  onToggle,
  disconnectDisabled,
}: {
  method: LoginMethod
  onToggle: () => void
  disconnectDisabled?: boolean
}) {
  const disconnectBtn = (
    <Button
      size="sm"
      variant="outline"
      disabled={disconnectDisabled}
      className="h-7 shrink-0 border-destructive/30 text-[12px] text-destructive hover:bg-destructive/5 hover:text-destructive"
      onClick={onToggle}
    >
      Disconnect
    </Button>
  )

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {method.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{method.name}</p>
        <p className="text-[12px] text-muted-foreground">
          {method.connected && method.account
            ? method.account
            : "Not connected"}
        </p>
      </div>
      {method.connected ? (
        disconnectDisabled ? (
          <Tooltip>
            {/* span wrapper: a disabled button doesn't emit hover events for the tooltip */}
            <TooltipTrigger asChild>
              <span tabIndex={0}>{disconnectBtn}</span>
            </TooltipTrigger>
            <TooltipContent>
              Can&apos;t disconnect your only sign-in method.
            </TooltipContent>
          </Tooltip>
        ) : (
          disconnectBtn
        )
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 text-[12px]"
          onClick={onToggle}
        >
          Connect
        </Button>
      )}
    </div>
  )
}

// ── SecuritySection ────────────────────────────────────────────────────────────

export function SecuritySection() {
  const { data: me } = useIdentityMe()
  const pushToast = useToastStore((s) => s.push)
  const accountEmail = me?.email ?? ""

  // ── Delete account (retype-to-confirm) ──────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const canDelete =
    !!accountEmail &&
    confirmText.trim().toLowerCase() === accountEmail.toLowerCase()

  const handleDelete = async () => {
    if (!canDelete) return
    setDeleting(true)
    try {
      await identityProfileApi.deleteAccount(confirmText.trim())
      pushToast("Account deleted.", "success")
      // Session cookies are cleared server-side; full reload drops in-memory auth state.
      window.location.href = "/login"
    } catch {
      // error toast surfaced by the API interceptor
      setDeleting(false)
    }
  }

  const qc = useQueryClient()
  const slug = useParams().slug as string

  // Real login methods for this identity.
  const { data: lm } = useQuery({
    queryKey: ["login-methods"],
    queryFn: identityProfileApi.loginMethods,
  })
  const connectedProviders = lm?.providers ?? []
  // The user must always retain at least one way to sign in.
  const totalMethods = (lm?.hasPassword ? 1 : 0) + connectedProviders.length
  const onlyOneMethod = totalMethods <= 1

  // Connectable providers come from this company's enabled OAuth config (admin → Authentication).
  const { data: enabledProviders = [] } = useQuery({
    queryKey: ["oauth-providers-public", slug],
    queryFn: () => oauthProviderApi.listPublic(slug),
    enabled: !!slug,
  })

  // Rows = enabled providers (connectable) ∪ already-connected ones (still disconnectable,
  // even if the admin later disabled them — so the user is never stranded).
  const providerRows = useMemo(() => {
    const rows = new Map<
      string,
      { provider: string; displayName: string; iconUrl: string | null }
    >()
    for (const p of enabledProviders) rows.set(p.provider, p)
    for (const key of connectedProviders) {
      if (!rows.has(key)) {
        rows.set(key, {
          provider: key,
          displayName: key.charAt(0).toUpperCase() + key.slice(1),
          iconUrl: null,
        })
      }
    }
    return Array.from(rows.values())
  }, [enabledProviders, connectedProviders])

  const disconnect = useMutation({
    mutationFn: (provider: string) =>
      identityProfileApi.removeLoginMethod(provider),
    onSuccess: () => {
      pushToast("Sign-in method disconnected.", "success")
      qc.invalidateQueries({ queryKey: ["login-methods"] })
    },
  })

  // Connecting starts the OAuth flow; it auto-links to this account when the
  // provider verifies the same email.
  const connect = (provider: string) => {
    window.location.href = `/api/auth/oauth/${provider}/authorize?company=${encodeURIComponent(slug)}`
  }

  // ── Set / change password (adaptive to whether a password exists) ───────────
  const [curPwd, setCurPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [setPwOpen, setSetPwOpen] = useState(false)
  const hasPassword = !!lm?.hasPassword
  const pwdValid =
    newPwd.length >= 8 &&
    newPwd === confirmPwd &&
    (!hasPassword || curPwd.length > 0)

  const changePwd = useMutation({
    mutationFn: () =>
      identityProfileApi.changePassword({
        currentPassword: hasPassword ? curPwd : undefined,
        newPassword: newPwd,
      }),
    onSuccess: () => {
      pushToast(hasPassword ? "Password updated." : "Password set.", "success")
      setCurPwd("")
      setNewPwd("")
      setConfirmPwd("")
      setSetPwOpen(false)
      qc.invalidateQueries({ queryKey: ["login-methods"] })
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h3 className="text-[15px] font-semibold">Security</h3>
        <p className="text-[13px] text-muted-foreground">
          Manage your password and connected login methods
        </p>
      </div>
      <Separator />

      {/* Change password — only for accounts that have a password login method */}
      {hasPassword && (
        <>
          <div className="space-y-4">
            <h4 className="text-[13px] font-semibold">Change password</h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <PasswordInput
                  placeholder="••••••••"
                  value={curPwd}
                  onChange={setCurPwd}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>New password</Label>
                  <PasswordInput
                    placeholder="Min. 8 characters"
                    value={newPwd}
                    onChange={setNewPwd}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm new password</Label>
                  <PasswordInput
                    placeholder="Repeat new password"
                    value={confirmPwd}
                    onChange={setConfirmPwd}
                  />
                </div>
              </div>
              {confirmPwd.length > 0 && newPwd !== confirmPwd && (
                <p className="text-[11px] text-destructive">
                  Passwords don&apos;t match.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!pwdValid || changePwd.isPending}
                onClick={() => changePwd.mutate()}
              >
                {changePwd.isPending ? "Saving…" : "Update password"}
              </Button>
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* Login methods */}
      <div>
        <h4 className="mb-1 text-[13px] font-semibold">Login methods</h4>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Connect third-party accounts to sign in without a password. At least
          one method must remain active.
        </p>
        <div className="space-y-2.5">
          {/* Email & password — managed via "Change password" above; shown for status. */}
          <div className="flex items-center gap-4 rounded-xl border border-border px-4 py-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <IconEmail />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">Email &amp; password</p>
              <p className="text-[12px] text-muted-foreground">
                {lm?.hasPassword ? (lm?.email ?? "") : "No password set"}
              </p>
            </div>
            {hasPassword ? (
              onlyOneMethod ? (
                <Tooltip>
                  {/* span wrapper: a disabled button doesn't emit hover events for the tooltip */}
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="h-7 shrink-0 border-destructive/30 text-[12px] text-destructive hover:bg-destructive/5 hover:text-destructive"
                      >
                        Disconnect
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Can&apos;t disconnect your only sign-in method.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 border-destructive/30 text-[12px] text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => disconnect.mutate("password")}
                >
                  Disconnect
                </Button>
              )
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 text-[12px]"
                onClick={() => {
                  setNewPwd("")
                  setConfirmPwd("")
                  setSetPwOpen(true)
                }}
              >
                Set up
              </Button>
            )}
          </div>

          {providerRows.map((p) => {
            const isConnected = connectedProviders.includes(p.provider)
            return (
              <MethodRow
                key={p.provider}
                method={{
                  id: p.provider,
                  name: p.displayName,
                  icon: (
                    <ProviderIcon
                      provider={p.provider}
                      displayName={p.displayName}
                      iconUrl={p.iconUrl}
                    />
                  ),
                  connected: isConnected,
                  account: isConnected ? (lm?.email ?? undefined) : undefined,
                }}
                onToggle={() =>
                  isConnected
                    ? disconnect.mutate(p.provider)
                    : connect(p.provider)
                }
                disconnectDisabled={isConnected && onlyOneMethod}
              />
            )
          })}

          {providerRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-3.5 text-[12px] text-muted-foreground">
              No third-party sign-in providers are enabled for this company.
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Danger zone */}
      <div>
        <h4 className="mb-1 text-[13px] font-semibold text-destructive">
          Danger zone
        </h4>
        <p className="text-[12px] text-muted-foreground">
          Permanently delete your account and all associated data
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => {
            setConfirmText("")
            setDeleteOpen(true)
          }}
        >
          Delete account
        </Button>
      </div>

      {/* Set a password (from the Email & password row when none exists) */}
      <Dialog open={setPwOpen} onOpenChange={(o) => !o && setSetPwOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set a password</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            Add a password so you can sign in with your email instead of a
            connected provider.
          </p>
          <div className="mt-1 space-y-3">
            <div className="space-y-1.5">
              <Label>New password</Label>
              <PasswordInput
                placeholder="Min. 8 characters"
                value={newPwd}
                onChange={setNewPwd}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <PasswordInput
                placeholder="Repeat new password"
                value={confirmPwd}
                onChange={setConfirmPwd}
                onKeyDown={(e) =>
                  e.key === "Enter" && pwdValid && changePwd.mutate()
                }
              />
            </div>
            {confirmPwd.length > 0 && newPwd !== confirmPwd && (
              <p className="text-[11px] text-destructive">
                Passwords don&apos;t match.
              </p>
            )}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSetPwOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!pwdValid || changePwd.isPending}
              onClick={() => changePwd.mutate()}
            >
              {changePwd.isPending ? "Saving…" : "Set password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete-account confirmation (retype email, GitHub-style) */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => !o && setDeleteOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[13px] text-muted-foreground">
              This permanently deletes your identity and everything tied to it.
              This cannot be undone.
            </p>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px]">
              To confirm, type your email{" "}
              <span className="font-mono font-semibold text-foreground">
                {accountEmail || "—"}
              </span>{" "}
              below.
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={accountEmail}
              autoComplete="off"
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!canDelete || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete this account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
