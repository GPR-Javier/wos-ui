"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/custom/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert01Icon } from "@hugeicons/core-free-icons"
import { useRegister } from "@/hooks/use-auth"
import { useSlug, useSlugHref } from "@/lib/slug"

export default function RegisterPage() {
  const slug = useSlug()
  const slugHref = useSlugHref()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const registerMutation = useRegister()
  const isPending = registerMutation.isPending
  const apiError = registerMutation.error

  function handleRegister() {
    if (!firstName || !lastName || !email || !password) return
    registerMutation.mutate({ firstName, lastName, email, password })
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="relative flex w-full flex-col lg:w-[55%]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-8">
          <Link href={`/${slug}`}>
            <Logo />
          </Link>
          <p className="text-[13px] text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={slugHref("/login")}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-8 py-12">
          <div className="w-full max-w-100 animate-in duration-500 fade-in slide-in-from-bottom-4">
            <h1 className="text-[28px] font-bold tracking-tight text-foreground">
              Create applicant account
            </h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              Apply to open positions and track your application status.
            </p>

            <div className="mt-7 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first">First name</Label>
                  <Input
                    id="first"
                    placeholder="Jane"
                    className="h-11"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last">Last name</Label>
                  <Input
                    id="last"
                    placeholder="Smith"
                    className="h-11"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@email.com"
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
                    placeholder="Min. 8 characters"
                    className="h-11 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
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
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-[12px] text-muted-foreground">
                By registering, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
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
                  {(apiError as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ??
                    "Registration failed. Please try again."}
                </p>
              </div>
            )}

            <Button
              className="mt-4 h-11 w-full justify-center gap-2 text-[14px] font-semibold"
              onClick={handleRegister}
              disabled={
                isPending || !firstName || !lastName || !email || !password
              }
            >
              {isPending ? "Creating account…" : "Create account"}
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-8 py-4">
          <p className="text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} WorkOS. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Terms
            </a>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="hidden lg:flex lg:w-[45%]">
        <AuthPanel />
      </div>
    </div>
  )
}

function AuthPanel() {
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
      <div className="relative flex flex-1 flex-col justify-end">
        <blockquote className="text-[22px] leading-snug font-semibold text-white">
          &ldquo;Find your next opportunity with a company that invests in its
          people.&rdquo;
        </blockquote>
        <p className="mt-4 text-[13px] text-white/60">
          Browse open roles and apply in minutes.
        </p>
        <div className="mt-10 space-y-3">
          {[
            "Track your application status in real time",
            "Get notified on interview schedules",
            "Apply to multiple positions easily",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5l2.5 2.5L8 3"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-[13px] text-white/70">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
