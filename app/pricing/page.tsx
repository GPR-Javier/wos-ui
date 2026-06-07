"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { PublicHeader } from "@/components/custom/public-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkBadge01Icon,
  InformationCircleIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"
import {
  pricingApi,
  type PricingPlan,
  type PlanComparison,
} from "@/lib/pricing-api"

type Cycle = "monthly" | "annual"

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly")

  const { data: fetchedPlans } = useQuery({
    queryKey: ["pricing", "plans"],
    queryFn: pricingApi.list,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const { data: fetchedComparison } = useQuery({
    queryKey: ["pricing", "comparison"],
    queryFn: pricingApi.comparison,
    staleTime: 5 * 60_000,
    retry: false,
  })

  // Render fully even if wos-hr isn't up yet (UI-first): fall back to local data.
  const plans = fetchedPlans && fetchedPlans.length ? fetchedPlans : FALLBACK_PLANS
  const comparison = fetchedComparison ?? FALLBACK_COMPARISON

  return (
    <TooltipProvider delayDuration={150}>
      <div className="h-screen overflow-y-auto bg-background">
        <PublicHeader
          right={
            <Button asChild size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          }
        />

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-14 sm:pt-20">
          {/* Hero */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-primary">
              Pricing
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-[40px] sm:leading-[1.1]">
              Simple pricing that scales with you
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Start free, upgrade when you grow. Every plan is risk-free — cancel anytime, no
              questions, no hassle.
            </p>
          </div>

          {/* Billing toggle (shadcn Tabs) */}
          <div className="mt-10 flex flex-col items-center gap-2.5">
            <Tabs value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="annual">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-[12.5px] text-muted-foreground">
              Save{" "}
              <span className="font-semibold text-primary">2 months</span> with yearly billing
            </p>
          </div>

          {/* Integrated pricing + feature comparison table (Free Trial is the leftmost column) */}
          <PricingTable plans={plans} comparison={comparison} cycle={cycle} />

          <Separator className="mx-auto mt-12 max-w-sm" />
          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Prices shown are starting prices and exclude optional add-ons. Need something custom?{" "}
            <a href="mailto:sales@gpr.com" className="font-medium text-primary hover:underline">
              Talk to sales
            </a>
            .
          </p>
        </main>
      </div>
    </TooltipProvider>
  )
}

// ── Integrated pricing + comparison table ───────────────────────────────────────
// One table: plan price + CTA are the column headers, grouped feature ✓ rows below.
// The recommended plan reads as a bordered, floating highlight column.

const FEATURE_GROUPS: { title: string; keys: string[] }[] = [
  { title: "Core HR", keys: ["attendance", "directory", "scheduling", "roles"] },
  { title: "Operations", keys: ["payroll", "requests"] },
  { title: "Hiring", keys: ["recruitment", "ai"] },
  { title: "Insights & finance", keys: ["analytics", "audit", "rewards"] },
  { title: "Security & support", keys: ["sso", "support"] },
]

// Recommended-column band: a bordered, tinted highlight that runs the full height.
const REC_TOP = "rounded-t-2xl border-x border-t border-primary/25 bg-primary/5"
const REC_MID = "border-x border-primary/25 bg-primary/5"
const REC_BOT = "rounded-b-2xl border-x border-b border-primary/25 bg-primary/5"

function PricingTable({
  plans,
  comparison,
  cycle,
}: {
  plans: PricingPlan[]
  comparison: PlanComparison
  cycle: Cycle
}) {
  const bySlug = new Map(plans.map((p) => [p.slug, p]))
  const cols = comparison.plans.map((c) => ({ ...c, pricing: bySlug.get(c.slug) }))
  const featureByKey = new Map(comparison.features.map((f) => [f.key, f]))

  return (
    <div className="mt-12 overflow-x-auto pb-2">
      <table className="w-full min-w-240 border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            <th className="w-[20%] px-4 pb-6 text-left align-bottom">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                Compare plans
              </span>
            </th>
            {cols.map((c) => (
              <th
                key={c.slug}
                className={cn("px-3 pb-6 pt-7 text-center align-top", c.recommended && REC_TOP)}
              >
                <div className="flex h-5 items-center justify-center">
                  {c.recommended && (
                    <Badge className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm">
                      Recommended
                    </Badge>
                  )}
                </div>
                <div className="mt-3 text-[15px] font-bold tracking-tight text-foreground">
                  {c.name}
                </div>
                {c.pricing?.tagline && (
                  <p className="mx-auto mt-1.5 min-h-9 max-w-44 text-[11.5px] font-normal leading-snug text-muted-foreground">
                    {c.pricing.tagline}
                  </p>
                )}
                <div className="mt-3">
                  <PriceLabel plan={c.pricing} cycle={cycle} />
                </div>
                <div className="mt-2 text-[11.5px] font-medium text-muted-foreground">
                  {c.pricing?.trialDays != null
                    ? `${c.pricing.trialDays}-day trial`
                    : c.pricing?.seatLimit == null
                      ? "Unlimited seats"
                      : `Up to ${c.pricing.seatLimit} employees`}
                </div>
                <Button
                  asChild
                  size="sm"
                  variant={c.recommended ? "default" : "outline"}
                  className="mx-auto mt-5 w-[92%] rounded-full"
                >
                  <Link href={c.pricing?.customPrice ? "mailto:sales@gpr.com" : "/auth/register"}>
                    {c.pricing?.ctaLabel ?? "Choose"}
                  </Link>
                </Button>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {FEATURE_GROUPS.map((group) => (
            <Fragment key={group.title}>
              {/* group heading */}
              <tr>
                <td className="px-4 pb-2 pt-7 align-bottom">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {group.title}
                  </span>
                </td>
                {cols.map((c) => (
                  <td key={c.slug} className={cn(c.recommended && REC_MID)} />
                ))}
              </tr>

              {group.keys.map((key) => {
                const row = featureByKey.get(key)
                if (!row) return null
                return (
                  <tr key={key} className="group/row">
                    <td className="rounded-l-lg px-4 py-3 text-left text-foreground/90 transition-colors group-hover/row:bg-muted/25">
                      <span className="inline-flex items-center gap-1.5">
                        {row.label}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={`About ${row.label}`}
                              className="text-muted-foreground/50 transition-colors hover:text-foreground"
                            >
                              <HugeiconsIcon
                                icon={InformationCircleIcon}
                                size={14}
                                strokeWidth={1.8}
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-60 text-center">
                            {row.description}
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </td>
                    {cols.map((c) => (
                      <td
                        key={c.slug}
                        className={cn(
                          "px-4 py-3 text-center",
                          c.recommended
                            ? REC_MID
                            : "transition-colors group-hover/row:bg-muted/25"
                        )}
                      >
                        {c.included.includes(key) ? (
                          <HugeiconsIcon
                            icon={CheckmarkBadge01Icon}
                            size={19}
                            strokeWidth={1.8}
                            className="inline text-primary"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={Cancel01Icon}
                            size={14}
                            strokeWidth={1.8}
                            className="inline text-muted-foreground/25"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </Fragment>
          ))}

          {/* spacer row closes the recommended band */}
          <tr>
            <td />
            {cols.map((c) => (
              <td key={c.slug} className={cn("h-5", c.recommended && REC_BOT)} />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PriceLabel({ plan, cycle }: { plan?: PricingPlan; cycle: Cycle }) {
  if (!plan) return null
  if (plan.customPrice) {
    return (
      <div>
        <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Custom pricing
        </p>
        <div className="mt-0.5 text-[26px] font-bold leading-none text-foreground">Custom</div>
      </div>
    )
  }
  const isTrial = plan.trialDays != null
  const monthly =
    cycle === "annual" && plan.annualPrice != null
      ? Math.round(plan.annualPrice / 12)
      : plan.monthlyPrice ?? 0
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {isTrial ? "Free" : "Starts at"}
      </p>
      <div className="mt-0.5 inline-flex items-baseline gap-0.5">
        <span className="text-[14px] font-semibold text-foreground">$</span>
        <span className="text-[30px] font-bold leading-none text-foreground">{monthly}</span>
        <span className="text-[12px] text-muted-foreground">/mo</span>
      </div>
    </div>
  )
}

// ── Local fallback (mirrors GET /hr/plans*) so the page renders before wos-hr is up ──

const FALLBACK_PLANS: PricingPlan[] = [
  { slug: "trial", name: "Free Trial", tagline: "Try everything, no card required", monthlyPrice: 0, annualPrice: 0, customPrice: false, seatLimit: 10, trialDays: 14, recommended: false, sortOrder: 0, ctaLabel: "Start free trial", features: [] },
  { slug: "starter", name: "Starter", tagline: "The HR essentials for small teams", monthlyPrice: 39, annualPrice: 390, customPrice: false, seatLimit: 15, trialDays: null, recommended: false, sortOrder: 1, ctaLabel: "Choose Starter", features: [] },
  { slug: "business", name: "Business", tagline: "Run payroll and the full request flow", monthlyPrice: 129, annualPrice: 1290, customPrice: false, seatLimit: 60, trialDays: null, recommended: false, sortOrder: 2, ctaLabel: "Choose Business", features: [] },
  { slug: "professional", name: "Professional", tagline: "Hiring, AI and analytics at scale", monthlyPrice: 329, annualPrice: 3290, customPrice: false, seatLimit: 250, trialDays: null, recommended: true, sortOrder: 3, ctaLabel: "Choose Professional", features: [] },
  { slug: "enterprise", name: "Enterprise", tagline: "Security, scale and dedicated support", monthlyPrice: null, annualPrice: null, customPrice: true, seatLimit: null, trialDays: null, recommended: false, sortOrder: 4, ctaLabel: "Talk to sales", features: [] },
]

const FB_STARTER = ["attendance", "directory", "scheduling", "roles"]
const FB_BUSINESS = [...FB_STARTER, "payroll", "requests", "recruitment"]
const FB_PROFESSIONAL = [...FB_BUSINESS, "ai", "analytics", "audit", "rewards"]
const FB_ENTERPRISE = [...FB_PROFESSIONAL, "sso", "support"]

const FALLBACK_COMPARISON: PlanComparison = {
  features: [
    { key: "attendance", label: "Attendance & leave", description: "Clock in/out, timesheets, and leave requests with approvals." },
    { key: "directory", label: "Employee directory", description: "A searchable directory of every employee and their profile." },
    { key: "scheduling", label: "Scheduling", description: "Build and publish shifts; employees see their own schedule." },
    { key: "roles", label: "Custom roles & permissions", description: "Define custom roles with fine-grained page and action permissions." },
    { key: "payroll", label: "Payroll & overtime", description: "Run payroll, generate payslips, and compute overtime." },
    { key: "requests", label: "Full request workflows", description: "COE, official business, change-time, schedule-change and dispute flows." },
    { key: "recruitment", label: "Recruitment", description: "Post jobs, collect applications, and manage candidates end to end." },
    { key: "ai", label: "AI interviews & assessments", description: "AI-assisted interviews and automated candidate assessments." },
    { key: "analytics", label: "Analytics", description: "Dashboards and reports across attendance, payroll, and hiring." },
    { key: "audit", label: "Audit log", description: "A full audit trail of who changed what, and when." },
    { key: "rewards", label: "Rewards & contracts", description: "Rewards, ratings, and employment-contract management." },
    { key: "sso", label: "SSO & advanced security", description: "Single sign-on plus advanced security and access controls." },
    { key: "support", label: "Priority support & SLA", description: "Priority support with a guaranteed response-time SLA." },
  ],
  plans: [
    { slug: "trial", name: "Free Trial", recommended: false, included: FB_PROFESSIONAL },
    { slug: "starter", name: "Starter", recommended: false, included: FB_STARTER },
    { slug: "business", name: "Business", recommended: false, included: FB_BUSINESS },
    { slug: "professional", name: "Professional", recommended: true, included: FB_PROFESSIONAL },
    { slug: "enterprise", name: "Enterprise", recommended: false, included: FB_ENTERPRISE },
  ],
}
