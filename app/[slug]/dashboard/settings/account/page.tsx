"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { accountApi, profileApi } from "@/lib/account-api"
import { useToastStore } from "@/store/toast-store"

/**
 * Account settings.
 *  - Credentials + canonical info live in the central identity (gpr-auth) and are SHARED across
 *    every app — saving them warns the user.
 *  - The per-app profile is a local snapshot; editing it stays in this app only.
 */
export default function AccountSettingsPage() {
  const qc = useQueryClient()
  const push = useToastStore((s) => s.push)

  const { data, isLoading } = useQuery({
    queryKey: ["account", "me"],
    queryFn: accountApi.get,
  })

  // ── Credentials ─────────────────────────────────────────────
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [newPassword, setNewPassword] = useState("")

  // ── Canonical info (shared) ─────────────────────────────────
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [birthday, setBirthday] = useState("")
  const [address, setAddress] = useState("")
  const [gender, setGender] = useState("")

  // ── Per-app profile (local) ─────────────────────────────────
  const [pFirstName, setPFirstName] = useState("")
  const [pLastName, setPLastName] = useState("")
  const [pBirthday, setPBirthday] = useState("")
  const [pAddress, setPAddress] = useState("")

  useEffect(() => {
    if (!data) return
    setEmail(data.email ?? "")
    setUsername(data.username ?? "")
    setPhone(data.phone ?? "")
    setFirstName(data.firstName ?? "")
    setLastName(data.lastName ?? "")
    setMiddleName(data.middleName ?? "")
    setBirthday(data.birthday ?? "")
    setAddress(data.address ?? "")
    setGender(data.gender ?? "")
    setPFirstName(data.firstName ?? "")
    setPLastName(data.lastName ?? "")
    setPBirthday(data.birthday ?? "")
    setPAddress(data.address ?? "")
  }, [data])

  const credentials = useMutation({
    mutationFn: accountApi.updateCredentials,
    onSuccess: () => {
      push("Login credentials updated for all apps.", "success", 5000, "Saved")
      setNewPassword("")
      qc.invalidateQueries({ queryKey: ["account", "me"] })
    },
  })

  const info = useMutation({
    mutationFn: accountApi.updateInfo,
    onSuccess: () => {
      push(
        "Canonical info updated (default for apps you haven't customized).",
        "success",
        5000,
        "Saved"
      )
      qc.invalidateQueries({ queryKey: ["account", "me"] })
    },
  })

  const profile = useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: () =>
      push("Profile updated for this app only.", "success", 4000, "Saved"),
  })

  function saveCredentials() {
    const ok = window.confirm(
      "These are your login credentials, shared across every app. Changing them affects how you sign in everywhere. Continue?"
    )
    if (!ok) return
    credentials.mutate({
      email: email || undefined,
      username: username || undefined,
      phone: phone || undefined,
      newPassword: newPassword || undefined,
    })
  }

  function saveInfo() {
    const ok = window.confirm(
      "This is your canonical profile, the default for apps you haven't customized. Continue?"
    )
    if (!ok) return
    info.mutate({
      firstName,
      lastName,
      middleName,
      birthday: birthday || null,
      address,
      gender,
    })
  }

  function saveProfile() {
    profile.mutate({
      firstName: pFirstName,
      lastName: pLastName,
      birthday: pBirthday || null,
      address: pAddress,
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading account…</div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
        ⚠️ Credentials and canonical info below belong to your{" "}
        <strong>shared identity</strong> — editing them affects every app you
        sign in to. The per-app profile at the bottom is local to this app only.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Login credentials</CardTitle>
          <CardDescription>
            Email, username, and phone can each be used to sign in. Shared
            across all apps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="New password (leave blank to keep)">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Button onClick={saveCredentials} disabled={credentials.isPending}>
            {credentials.isPending ? "Saving…" : "Save credentials"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canonical personal info</CardTitle>
          <CardDescription>
            The default copied into each app when you join. Editing affects apps
            you haven&apos;t customized.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="First name">
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Field>
          <Field label="Last name">
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Field>
          <Field label="Middle name">
            <Input
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </Field>
          <Field label="Birthday">
            <Input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <Input value={gender} onChange={(e) => setGender(e.target.value)} />
          </Field>
          <Field label="Address">
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <Button onClick={saveInfo} disabled={info.isPending}>
            {info.isPending ? "Saving…" : "Save canonical info"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This app&apos;s profile</CardTitle>
          <CardDescription>
            A local copy — editing here never affects your shared identity or
            other apps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="First name">
            <Input
              value={pFirstName}
              onChange={(e) => setPFirstName(e.target.value)}
            />
          </Field>
          <Field label="Last name">
            <Input
              value={pLastName}
              onChange={(e) => setPLastName(e.target.value)}
            />
          </Field>
          <Field label="Birthday">
            <Input
              type="date"
              value={pBirthday}
              onChange={(e) => setPBirthday(e.target.value)}
            />
          </Field>
          <Field label="Address">
            <Textarea
              value={pAddress}
              onChange={(e) => setPAddress(e.target.value)}
            />
          </Field>
          <Button onClick={saveProfile} disabled={profile.isPending}>
            {profile.isPending ? "Saving…" : "Save app profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
