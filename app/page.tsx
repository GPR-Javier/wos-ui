import Link from "next/link"
import { Logo } from "@/components/custom/logo"
import { PublicHeader } from "@/components/custom/public-header"

// ── Feature data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Attendance & DTR",
    desc: "Clock in/out with camera validation, manage DTR corrections, and track team attendance in real time.",
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "Payroll & Payslips",
    desc: "Automate payroll runs, generate payslips, handle deductions, and export payroll history with one click.",
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "HR Management",
    desc: "Manage employee profiles, track career milestones, assign positions, and oversee your entire workforce.",
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
    title: "Leave & Requests",
    desc: "File and approve leave requests, manage schedules, overtime, and official business trips in one place.",
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Analytics & Insights",
    desc: "Get workforce analytics, attendance heatmaps, and actionable insights to make data-driven decisions.",
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: "Recruitment",
    desc: "Post job openings, manage applicants, and publish your public careers page — all from one dashboard.",
  },
]

const STATS = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "10k+", label: "Employees managed" },
  { value: "4.9★", label: "User rating" },
  { value: "6", label: "Core modules" },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-40 -right-40 size-125 rounded-full bg-primary opacity-10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 size-100 rounded-full bg-cyan-400 opacity-8 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-[12px] font-semibold text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Modern HR & Workforce Management
          </div>

          <h1 className="text-[52px] leading-tight font-bold tracking-tight sm:text-[64px]">
            One platform for your{" "}
            <span className="text-primary">entire workforce</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            Attendance tracking, payroll, leave management, HR tools, and
            recruitment — all in a single platform built for modern teams.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get started free
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
            </Link>
            <Link
              href="/careers"
              className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-6 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              View open positions
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card px-4 py-4"
              >
                <p className="text-[24px] font-bold text-foreground">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-[32px] font-bold tracking-tight">
            Everything your team needs
          </h2>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Six integrated modules that cover your entire workforce lifecycle.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {f.icon}
              </div>
              <h3 className="text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="border-y border-border bg-primary/5">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-[32px] font-bold tracking-tight">
            Ready to streamline your operations?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted-foreground">
            Join teams already using WorkOS to save time, reduce errors, and
            focus on what matters.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create your account
            </Link>
            <Link
              href="/auth/login"
              className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-6 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-8">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="text-[12px] text-muted-foreground">
              Modern HR & Workforce Management
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[13px] text-muted-foreground">
            <Link
              href="/careers"
              className="transition-colors hover:text-foreground"
            >
              Careers
            </Link>
            <Link
              href="/auth/login"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="transition-colors hover:text-foreground"
            >
              Register
            </Link>
            <a href="#" className="transition-colors hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Terms
            </a>
          </div>
          <p className="w-full text-center text-[11px] text-muted-foreground sm:w-auto sm:text-left">
            &copy; {new Date().getFullYear()} WorkOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
