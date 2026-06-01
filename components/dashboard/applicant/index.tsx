"use client"

import { useRouter } from "next/navigation"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Briefcase01Icon,
  CheckListIcon,
  Calendar01Icon,
  Award01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth-store"

// ── helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

type QuickLink = {
  label: string
  description: string
  section: string
  authority: string
  icon: IconSvgElement
  accent: string
}

// Applicant portal entry points — each is gated by the same authority that drives
// the sidebar, so this view follows the admin's Roles & Permissions config.
const QUICK_LINKS: QuickLink[] = [
  {
    label: "Careers",
    description: "Browse open positions and submit your application.",
    section: "careers",
    authority: "CAREERS:VIEW_JOBS",
    icon: Briefcase01Icon,
    accent: "bg-violet-500",
  },
  {
    label: "My Applications",
    description: "Track the status of every application you've submitted.",
    section: "my-applications",
    authority: "MY_APPLICATIONS:VIEW_OWN_APPLICATIONS",
    icon: CheckListIcon,
    accent: "bg-sky-500",
  },
  {
    label: "Interviews",
    description: "See your scheduled interviews and confirm attendance.",
    section: "interviews",
    authority: "APPLICANT_INTERVIEWS:VIEW_INTERVIEWS",
    icon: Calendar01Icon,
    accent: "bg-amber-500",
  },
  {
    label: "Offers",
    description: "Review job offers and respond to them.",
    section: "offers",
    authority: "APPLICANT_OFFERS:VIEW_OFFERS",
    icon: Award01Icon,
    accent: "bg-emerald-500",
  },
]

// ── main ──────────────────────────────────────────────────────────────────────

export function OverviewSection() {
  const router = useRouter()
  const { user, authorities } = useAuthStore()

  const firstName = user?.firstName ?? "there"
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const links = QUICK_LINKS.filter((l) => authorities.includes(l.authority))

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Applicant Portal
          </p>
          <h1 className="mt-0.5 text-[20px] leading-tight font-bold text-foreground">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Welcome to your applicant portal — explore openings and track your
            applications here.
          </p>
        </div>
        <p className="shrink-0 text-[12px] text-muted-foreground">{dateStr}</p>
      </div>

      {/* ── Quick links ──────────────────────────────────────── */}
      {links.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-[14px] font-semibold text-foreground">
            No applicant access yet
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your account doesn't have any applicant pages enabled. Please
            contact the administrator.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <button
              key={l.section}
              onClick={() => router.push(`/dashboard/${l.section}`)}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl text-white",
                  l.accent
                )}
              >
                <HugeiconsIcon icon={l.icon} size={20} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-foreground">
                  {l.label}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {l.description}
                </p>
              </div>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
