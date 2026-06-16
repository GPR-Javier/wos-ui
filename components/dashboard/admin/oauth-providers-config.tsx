"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  PencilEdit01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/custom/status-badge"
import { ProviderIcon } from "@/components/custom/provider-icon"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToastStore } from "@/store/toast-store"
import {
  useOAuthProviders,
  useCreateOAuthProvider,
  useUpdateOAuthProvider,
  useDeleteOAuthProvider,
} from "@/hooks/use-oauth-providers"
import type {
  OAuthProvider,
  OAuthProviderPayload,
} from "@/lib/oauth-provider-api"

type ProviderForm = {
  provider: string
  displayName: string
  clientId: string
  clientSecret: string
  scopes: string
  redirectUri: string
  authorizationUri: string
  tokenUri: string
  userInfoUri: string
  iconUrl: string
  enabled: boolean
}

const BLANK: ProviderForm = {
  provider: "",
  displayName: "",
  clientId: "",
  clientSecret: "",
  scopes: "openid email profile",
  redirectUri: "",
  authorizationUri: "",
  tokenUri: "",
  userInfoUri: "",
  iconUrl: "",
  enabled: true,
}

export function OAuthProvidersSection() {
  const pushToast = useToastStore((s) => s.push)
  const { data: providers = [], isLoading } = useOAuthProviders()
  const createMut = useCreateOAuthProvider()
  const updateMut = useUpdateOAuthProvider()
  const deleteMut = useDeleteOAuthProvider()
  const busy = createMut.isPending || updateMut.isPending

  // null = closed, "new" = adding, otherwise the id being edited.
  const [formId, setFormId] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<ProviderForm>(BLANK)

  const openAdd = () => {
    setForm(BLANK)
    setFormId("new")
  }

  const openEdit = (p: OAuthProvider) => {
    setForm({
      provider: p.provider,
      displayName: p.displayName,
      clientId: p.clientId,
      clientSecret: "", // blank = keep stored secret
      scopes: p.scopes ?? "",
      redirectUri: p.redirectUri ?? "",
      authorizationUri: p.authorizationUri ?? "",
      tokenUri: p.tokenUri ?? "",
      userInfoUri: p.userInfoUri ?? "",
      iconUrl: p.iconUrl ?? "",
      enabled: p.enabled,
    })
    setFormId(p.id)
  }

  const canSave =
    !!form.provider.trim() &&
    !!form.displayName.trim() &&
    !!form.clientId.trim()

  const save = () => {
    if (!canSave) return
    const payload: OAuthProviderPayload = {
      provider: form.provider.trim(),
      displayName: form.displayName.trim(),
      clientId: form.clientId.trim(),
      clientSecret: form.clientSecret.trim() || undefined,
      scopes: form.scopes.trim() || undefined,
      redirectUri: form.redirectUri.trim() || undefined,
      authorizationUri: form.authorizationUri.trim() || undefined,
      tokenUri: form.tokenUri.trim() || undefined,
      userInfoUri: form.userInfoUri.trim() || undefined,
      iconUrl: form.iconUrl.trim() || undefined,
      enabled: form.enabled,
    }
    const onSuccess = () => {
      pushToast(
        formId === "new" ? "Provider added" : "Provider updated",
        "success"
      )
      setFormId(null)
    }
    if (formId === "new") {
      createMut.mutate(payload, { onSuccess })
    } else if (typeof formId === "number") {
      updateMut.mutate({ id: formId, payload }, { onSuccess })
    }
  }

  const remove = (p: OAuthProvider) =>
    deleteMut.mutate(p.id, {
      onSuccess: () => pushToast("Provider removed", "success"),
    })

  const toggleEnabled = (p: OAuthProvider) =>
    updateMut.mutate({
      id: p.id,
      payload: {
        provider: p.provider,
        displayName: p.displayName,
        clientId: p.clientId,
        scopes: p.scopes ?? undefined,
        redirectUri: p.redirectUri ?? undefined,
        authorizationUri: p.authorizationUri ?? undefined,
        tokenUri: p.tokenUri ?? undefined,
        userInfoUri: p.userInfoUri ?? undefined,
        iconUrl: p.iconUrl ?? undefined,
        enabled: !p.enabled,
      },
    })

  const editing = formId !== null
  const isNew = formId === "new"

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const suggestedRedirect = `${origin}/api/auth/oauth/${
    (form.provider || "provider").trim() || "provider"
  }/callback`

  const copy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      pushToast("Copied to clipboard", "success")
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold">OAuth providers</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Configure sign-in providers (Google, Microsoft, GitHub…). Client
            secrets are encrypted at rest and never shown in full.
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
          Add provider
        </Button>
      </div>

      {/* Setup instructions */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-[12px] text-muted-foreground">
        <p className="mb-2 text-[12px] font-semibold text-foreground">
          How to connect a provider
        </p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            Create an OAuth app in the provider&apos;s console (
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Google
            </a>
            ,{" "}
            <a
              href="https://entra.microsoft.com/"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Microsoft Entra
            </a>
            ,{" "}
            <a
              href="https://github.com/settings/developers"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              GitHub
            </a>
            ).
          </li>
          <li>
            Register the <strong>redirect URI</strong> shown in the form (one
            per provider) as an authorized callback in that console.
          </li>
          <li>
            Copy the generated <strong>Client ID</strong> and{" "}
            <strong>Client secret</strong> into the form below.
          </li>
          <li>
            Save and toggle the provider on to make it available at sign-in.
          </li>
        </ol>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          Loading…
        </p>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-[13px] text-muted-foreground">
          No OAuth providers configured yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {providers.map((p) => (
            <div
              key={p.id}
              className="group rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ProviderIcon
                      provider={p.provider}
                      displayName={p.displayName}
                      iconUrl={p.iconUrl}
                    />
                    <p className="text-[14px] font-semibold">{p.displayName}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {p.provider}
                    </span>
                    <StatusBadge variant={p.enabled ? "green" : "gray"}>
                      {p.enabled ? "Enabled" : "Disabled"}
                    </StatusBadge>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[12px] sm:grid-cols-2">
                    <InfoLine label="Client ID" value={p.clientId} mono />
                    <InfoLine
                      label="Client secret"
                      value={p.hasSecret ? (p.secretHint ?? "set") : "—"}
                      mono
                    />
                    <InfoLine label="Scopes" value={p.scopes ?? ""} />
                    <InfoLine
                      label="Redirect URI"
                      value={p.redirectUri ?? ""}
                      mono
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={updateMut.isPending}
                    onClick={() => toggleEnabled(p)}
                  >
                    {p.enabled ? "Disable" : "Enable"}
                  </Button>
                  <button
                    onClick={() => openEdit(p)}
                    aria-label="Edit"
                    title="Edit"
                    className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <HugeiconsIcon
                      icon={PencilEdit01Icon}
                      size={13}
                      strokeWidth={2}
                    />
                  </button>
                  <button
                    onClick={() => remove(p)}
                    aria-label="Delete"
                    title="Delete"
                    className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      size={13}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog
        open={editing}
        onOpenChange={(open) => {
          if (!open) setFormId(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isNew ? "Add OAuth provider" : "Edit OAuth provider"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Display name" required>
              <Input
                className="h-8 text-[13px]"
                placeholder="Google"
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Provider key" required>
              <Input
                className="h-8 text-[13px]"
                placeholder="google"
                value={form.provider}
                onChange={(e) =>
                  setForm((f) => ({ ...f, provider: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Client ID" required span2>
              <Input
                className="h-8 text-[13px]"
                value={form.clientId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientId: e.target.value }))
                }
              />
            </FormField>
            <FormField
              label={
                isNew ? "Client secret" : "Client secret (blank = keep current)"
              }
              span2
            >
              <Input
                type="password"
                className="h-8 text-[13px]"
                placeholder={isNew ? "" : "••••••••"}
                value={form.clientSecret}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientSecret: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Scopes" span2>
              <Input
                className="h-8 text-[13px]"
                placeholder="openid email profile"
                value={form.scopes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scopes: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Redirect URI" span2>
              <Input
                className="h-8 text-[13px]"
                value={form.redirectUri}
                onChange={(e) =>
                  setForm((f) => ({ ...f, redirectUri: e.target.value }))
                }
              />
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
                <span className="min-w-0 truncate">
                  Register this callback in the provider:{" "}
                  <span className="font-mono text-foreground">
                    {suggestedRedirect}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, redirectUri: suggestedRedirect }))
                    }
                    className="rounded border px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
                  >
                    Use this
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(suggestedRedirect)}
                    className="rounded border px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
                  >
                    Copy
                  </button>
                </span>
              </div>
            </FormField>
            <FormField label="Authorization URI" span2>
              <Input
                className="h-8 text-[13px]"
                value={form.authorizationUri}
                onChange={(e) =>
                  setForm((f) => ({ ...f, authorizationUri: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Token URI" span2>
              <Input
                className="h-8 text-[13px]"
                value={form.tokenUri}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tokenUri: e.target.value }))
                }
              />
            </FormField>
            <FormField label="User info URI" span2>
              <Input
                className="h-8 text-[13px]"
                value={form.userInfoUri}
                onChange={(e) =>
                  setForm((f) => ({ ...f, userInfoUri: e.target.value }))
                }
              />
            </FormField>
            <FormField
              label="Icon URL (optional — built-in for google/microsoft/github)"
              span2
            >
              <Input
                className="h-8 text-[13px]"
                placeholder="https://…/logo.svg"
                value={form.iconUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, iconUrl: e.target.value }))
                }
              />
            </FormField>
            <label className="col-span-2 flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enabled: e.target.checked }))
                }
              />
              Enabled
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setFormId(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={!canSave || busy}>
              {isNew ? "Add provider" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoLine({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <p className="truncate text-muted-foreground">
      <span className="text-[11px] tracking-wide uppercase">{label}: </span>
      <span className={mono ? "font-mono text-foreground" : "text-foreground"}>
        {value || "—"}
      </span>
    </p>
  )
}

function FormField({
  label,
  children,
  required,
  span2,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  span2?: boolean
}) {
  return (
    <div className={span2 ? "col-span-2 space-y-1" : "space-y-1"}>
      <Label className="text-[11px] text-muted-foreground">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  )
}
