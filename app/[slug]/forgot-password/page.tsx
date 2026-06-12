"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/custom/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSlugHref } from "@/lib/slug"

export default function ForgotPasswordPage() {
  const slugHref = useSlugHref()
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState("")

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel: form ── */}
      <div className="relative flex w-full flex-col lg:w-[55%]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-8">
          <Logo />
          <Link
            href={slugHref("/login")}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
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
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to sign in
          </Link>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-8 py-12">
          <div className="w-full max-w-100 animate-in duration-500 fade-in slide-in-from-bottom-4">
            {!sent ? (
              <>
                {/* Icon */}
                <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>

                <h1 className="text-[28px] font-bold tracking-tight text-foreground">
                  Reset your password
                </h1>
                <p className="mt-1.5 text-[14px] text-muted-foreground">
                  Enter your work email and we&apos;ll send a reset link
                  straight to your inbox.
                </p>

                <div className="mt-7 space-y-1.5">
                  <Label htmlFor="reset-email">Work email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@company.com"
                    className="h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  className="mt-6 h-11 w-full justify-center gap-2 text-[14px] font-semibold"
                  onClick={() => setSent(true)}
                  disabled={!email}
                >
                  Send reset link
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
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </Button>

                <p className="mt-5 text-center text-[12px] text-muted-foreground">
                  Remember your password?{" "}
                  <Link
                    href={slugHref("/login")}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              /* ── Success state ── */
              <div className="text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-green/10">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-green-500"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="text-[22px] font-bold text-foreground">
                  Check your inbox
                </h2>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  We sent a reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  It expires in 15 minutes.
                </p>
                <p className="mt-4 text-[13px] text-muted-foreground">
                  Didn&apos;t receive it?{" "}
                  <button
                    onClick={() => setSent(false)}
                    className="text-primary hover:underline"
                  >
                    Resend
                  </button>
                </p>
                <Link
                  href={slugHref("/login")}
                  className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border border-border bg-background text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Back to sign in
                </Link>
              </div>
            )}
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

      {/* ── Right panel: decorative ── */}
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
      <div className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-primary opacity-40 blur-3xl" />

      <div className="relative flex flex-1 flex-col justify-center">
        <blockquote className="text-[22px] leading-snug font-semibold text-white">
          &ldquo;Your account security is our top priority. We&apos;ll get you
          back in seconds.&rdquo;
        </blockquote>
        <p className="mt-4 text-[13px] text-white/60">
          WorkOS uses industry-standard encryption to keep your data safe.
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-[12px] font-medium text-white/80">Security tip</p>
          <p className="mt-1 text-[12px] text-white/50">
            Use a unique password for your WorkOS account and enable two-factor
            authentication for extra protection.
          </p>
        </div>
      </div>
    </div>
  )
}
