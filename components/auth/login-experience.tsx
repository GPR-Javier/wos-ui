"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Logo } from "@/components/custom/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AttendanceCameraCapture } from "@/components/custom/attendance-camera-capture"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Clock01Icon,
  Login01Icon,
  Logout01Icon,
  CheckmarkBadge01Icon,
  Cancel01Icon,
  Camera01Icon,
  Alert01Icon,
  User03Icon,
} from "@hugeicons/core-free-icons"
import { useLogin, useSelectRole, useSelectCompany } from "@/hooks/use-auth"
import { useAuthStore } from "@/store/auth-store"
import { useSlugHref } from "@/lib/slug"
import type { AvailableRole, CompanyInfo } from "@/lib/auth-api"
import type { CompanyBrandingDto } from "@/lib/company-branding-api"
import { themeVars, DEFAULT_THEME } from "@/components/dashboard/company-theme"

type PunchType = "in" | "out"

// ── Live clock ────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (!link) {
    link = document.createElement("link")
    link.rel = "icon"
    document.head.appendChild(link)
  }
  link.href = href
}

// ── Login experience ────────────────────────────────────────────────────────
// Shared by the generic /auth/login and the branded /[slug]/login routes. When
// `branding` is provided the same layout is re-themed (accent + radius), the
// WorkOS mark is swapped for the company logo/name, and the favicon/title update.

export function LoginExperience({ branding }: { branding?: CompanyBrandingDto | null }) {
  const slugHref = useSlugHref()
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showQuickPunch, setShowQuickPunch] = useState(false)

  // Role-selection state (when API returns requiresRoleSelection: true)
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)

  // Company-selection state (when the user belongs to multiple companies)
  const [availableCompanies, setAvailableCompanies] = useState<CompanyInfo[]>([])
  const [showCompanyModal, setShowCompanyModal] = useState(false)

  const loginMutation = useLogin()
  const selectRoleMutation = useSelectRole()
  const selectCompanyMutation = useSelectCompany()

  const isPending =
    loginMutation.isPending || selectRoleMutation.isPending || selectCompanyMutation.isPending
  const apiError =
    loginMutation.error || selectRoleMutation.error || selectCompanyMutation.error

  // Branding (only when a company was resolved).
  const companyName = branding?.name ?? null
  const companyLogo = branding?.logo ?? null
  const themeStyle = branding
    ? themeVars({
        accent: branding.accentColor ?? DEFAULT_THEME.accent,
        radius: branding.radius ?? DEFAULT_THEME.radius,
      })
    : undefined

  useEffect(() => {
    if (!branding) return
    if (branding.favicon) setFavicon(branding.favicon)
    if (branding.name) document.title = `Sign in · ${branding.name}`
  }, [branding])

  function handleLogin() {
    if (!email || !password) return
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          if ("companySelect" in data) {
            setAvailableCompanies(data.companySelect)
            setShowCompanyModal(true)
            return
          }
          if (data.requiresRoleSelection) {
            setAvailableRoles(data.availableRoles)
            setShowRoleModal(true)
          }
          // otherwise useLogin's onSuccess handles redirect
        },
      }
    )
  }

  function handleSelectCompany(company: CompanyInfo) {
    selectCompanyMutation.mutate(
      { companyId: company.id, slug: company.slug },
      {
        onSuccess: (data) => {
          setShowCompanyModal(false)
          if (data.requiresRoleSelection) {
            setAvailableRoles(data.availableRoles)
            setShowRoleModal(true)
          }
          // otherwise useSelectCompany's onSuccess handles redirect
        },
      }
    )
  }

  function handleRoleContinue() {
    if (!selectedRoleId) return
    selectRoleMutation.mutate(
      { userRoleId: selectedRoleId },
      {
        onSuccess: () => {
          useAuthStore.getState().setAvailableRoles(availableRoles, selectedRoleId!)
        },
      }
    )
  }

  return (
    <div style={themeStyle}>
      <div className="flex min-h-screen">
        {/* ── Left panel ── */}
        <div className="relative flex w-full flex-col lg:w-[55%]">
          {/* Top bar */}
          <div className="flex items-center justify-between px-8 pt-8">
            {companyLogo ? (
              <Link href="/" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={companyLogo}
                  alt={companyName ?? "Company logo"}
                  className="size-[30px] rounded-lg object-cover ring-1 ring-border"
                />
                {companyName && (
                  <span className="text-[15px] font-bold tracking-tight text-foreground">
                    {companyName}
                  </span>
                )}
              </Link>
            ) : (
              <Link href="/">
                <Logo />
              </Link>
            )}
            <p className="text-[13px] text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href={slugHref("/register")}
                className="font-medium text-primary hover:underline"
              >
                Register
              </Link>
            </p>
          </div>

          {/* Form */}
          <div className="flex flex-1 items-center justify-center px-8 py-12">
            <div className="w-full max-w-100 animate-in duration-500 fade-in slide-in-from-bottom-4">
              <h1 className="text-[28px] font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Sign in to {companyName ?? "your WorkOS account"} to continue.
              </p>

              <div className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email, username, or phone</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="you@company.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
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
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
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
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <div
                      onClick={() => setRemember((v) => !v)}
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        remember
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                      )}
                    >
                      {remember && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          className="text-primary-foreground"
                        >
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-[13px] text-muted-foreground">
                      Remember me
                    </span>
                  </label>
                  <Link
                    href={slugHref("/forgot-password")}
                    className="text-[12px] text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {apiError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-900/20">
                  <HugeiconsIcon
                    icon={Alert01Icon}
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-red-500"
                  />
                  <p className="text-[12px] text-red-700 dark:text-red-400">
                    {(
                      apiError as { response?: { data?: { message?: string } } }
                    )?.response?.data?.message ?? "Invalid email or password."}
                  </p>
                </div>
              )}

              <Button
                className="mt-4 h-11 w-full justify-center gap-2 text-[14px] font-semibold"
                onClick={handleLogin}
                disabled={isPending}
              >
                {isPending ? "Signing in…" : "Sign in"}
                {!isPending && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </Button>

              {/* Divider */}
              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Quick Time In button */}
              <button
                onClick={() => setShowQuickPunch(true)}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                <HugeiconsIcon
                  icon={Clock01Icon}
                  size={15}
                  strokeWidth={1.8}
                  className="text-muted-foreground"
                />
                Quick Time In / Out
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-8 py-4">
            <p className="text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} {companyName ?? "WorkOS"}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[11px] text-muted-foreground hover:text-foreground">
                Privacy
              </a>
              <a href="#" className="text-[11px] text-muted-foreground hover:text-foreground">
                Terms
              </a>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="hidden lg:flex lg:w-[45%] lg:flex-col">
          <AuthPanel companyName={companyName} />
        </div>
      </div>

      {/* ── Company modal (multiple companies) ── */}
      {showCompanyModal && (
        <Modal onClose={() => setShowCompanyModal(false)}>
          <h2 className="text-[16px] font-semibold text-foreground">Select a company</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            You belong to multiple companies. Choose which one to sign in to.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {availableCompanies.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCompany(c)}
                disabled={selectCompanyMutation.isPending}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span className="text-[14px] font-medium text-foreground">{c.name}</span>
                <span className="text-[12px] text-muted-foreground">{c.slug}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {showRoleModal && (
        <Modal onClose={() => setShowRoleModal(false)}>
          <h2 className="text-[16px] font-semibold text-foreground">Select your role</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your account has multiple roles. Choose how you&apos;d like to continue.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {availableRoles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all duration-150",
                  selectedRoleId === r.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                <div
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl transition-colors",
                    selectedRoleId === r.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <HugeiconsIcon icon={User03Icon} size={28} strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-semibold text-foreground">{r.name}</p>
                {r.isTemporary && (
                  <Badge
                    variant="outline"
                    className="h-5 border-amber-300 bg-amber-50 px-2 text-[10px] font-semibold text-amber-700"
                  >
                    Temporary
                  </Badge>
                )}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {r.description?.trim() || "No description provided."}
                </p>
                <div
                  className={cn(
                    "mt-auto flex size-4 items-center justify-center rounded-full border-2 transition-colors",
                    selectedRoleId === r.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {selectedRoleId === r.id && (
                    <div className="size-1.5 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {selectRoleMutation.error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20">
              <HugeiconsIcon
                icon={Alert01Icon}
                size={13}
                strokeWidth={2}
                className="shrink-0 text-red-500"
              />
              <p className="text-[12px] text-red-700 dark:text-red-400">
                Failed to sign in. Please try again.
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowRoleModal(false)}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              className="h-10 flex-1 text-[13px]"
              disabled={!selectedRoleId || selectRoleMutation.isPending}
              onClick={handleRoleContinue}
            >
              {selectRoleMutation.isPending ? "Signing in…" : "Continue"}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Quick punch modal ── */}
      {showQuickPunch && <QuickPunchModal onClose={() => setShowQuickPunch(false)} />}
    </div>
  )
}

// ── Shared backdrop modal wrapper ──────────────────────────────────────────

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        {children}
      </div>
    </div>
  )
}

type PunchStep = "form" | "camera" | "done"

// ── Quick punch modal ──────────────────────────────────────────────────────

function QuickPunchModal({ onClose }: { onClose: () => void }) {
  const now = useClock()
  const [step, setStep] = useState<PunchStep>("form")
  const [employeeId, setEmployeeId] = useState("")
  const [punchType, setPunchType] = useState<PunchType>("in")
  const [capturedAt, setCapturedAt] = useState("")

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  function handleFormNext() {
    if (!employeeId.trim()) return
    setStep("camera")
  }

  function handleCaptureDone(time: string) {
    setCapturedAt(time)
    setStep("done")
  }

  function handleAnother() {
    setStep("form")
    setEmployeeId("")
    setPunchType("in")
    setCapturedAt("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative animate-in overflow-hidden rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in",
          step === "camera" ? "w-full max-w-md" : "w-full max-w-sm"
        )}
      >
        {/* Header */}
        <div className="bg-primary px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium tracking-widest text-white/60 uppercase">
                {dateStr}
              </p>
              <p className="mt-0.5 text-[26px] leading-none font-bold text-white tabular-nums">
                {timeStr}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Steps */}
        {step === "form" && (
          <div className="p-6">
            <p className="mb-4 text-[14px] font-semibold text-foreground">
              Quick attendance punch
            </p>

            {/* Punch type toggle */}
            <div className="mb-4 flex gap-2">
              {(["in", "out"] as PunchType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setPunchType(t)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-semibold transition-all duration-150",
                    punchType === t
                      ? t === "in"
                        ? "border-green-500 bg-green-500/10 text-green-600"
                        : "border-red-500 bg-red-500/10 text-red-600"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <HugeiconsIcon
                    icon={t === "in" ? Login01Icon : Logout01Icon}
                    size={15}
                    strokeWidth={2}
                  />
                  Time {t === "in" ? "In" : "Out"}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-id">Employee ID</Label>
              <Input
                id="emp-id"
                autoFocus
                placeholder="e.g. EMP-0042"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFormNext()
                }}
                className="h-11"
              />
            </div>

            <Button
              className={cn(
                "mt-4 h-11 w-full justify-center gap-2 text-[14px] font-semibold",
                punchType === "out" && "bg-red-500 hover:bg-red-600"
              )}
              disabled={!employeeId.trim()}
              onClick={handleFormNext}
            >
              <HugeiconsIcon icon={Camera01Icon} size={15} strokeWidth={2} />
              Continue to camera
            </Button>
          </div>
        )}

        {step === "camera" && (
          <AttendanceCameraCapture
            punchType={punchType}
            onCapture={handleCaptureDone}
            onBack={() => setStep("form")}
          />
        )}

        {step === "done" && (
          <div className="p-6 text-center">
            <div
              className={cn(
                "mx-auto mb-4 flex size-14 items-center justify-center rounded-full",
                punchType === "in" ? "bg-green-500/10" : "bg-red-500/10"
              )}
            >
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                size={28}
                strokeWidth={1.5}
                className={punchType === "in" ? "text-green-500" : "text-red-500"}
              />
            </div>
            <p className="text-[16px] font-bold text-foreground">
              Time {punchType === "in" ? "In" : "Out"} Recorded
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">{employeeId}</span> — {capturedAt}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleAnother}
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                Another punch
              </button>
              <Button className="h-10 flex-1 text-[13px]" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Right panel ────────────────────────────────────────────────────────────

function AuthPanel({ companyName }: { companyName: string | null }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-primary p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-cyan-400 opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-primary opacity-40 blur-3xl" />

      <div className="relative flex flex-1 flex-col justify-between">
        <div className="mt-auto">
          <blockquote className="text-[22px] leading-snug font-semibold text-white">
            &ldquo;Streamline your workforce operations with a single platform built for modern
            teams.&rdquo;
          </blockquote>
          <p className="mt-4 text-[13px] text-white/60">
            {companyName
              ? `${companyName} runs on WorkOS — attendance, payroll, leaves, and more.`
              : "Attendance, payroll, leaves, and more — all in one place."}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4">
          {[
            { value: "99.9%", label: "Uptime" },
            { value: "10k+", label: "Employees managed" },
            { value: "4.9★", label: "User rating" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <p className="text-[18px] font-bold text-white">{s.value}</p>
              <p className="mt-0.5 text-[11px] text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
