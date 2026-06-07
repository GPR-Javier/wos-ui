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
import { currencySymbol, formatAmount } from "@/lib/money"
import { FALLBACK_PLANS, FALLBACK_COMPARISON } from "@/lib/pricing-fallback"
import { useCurrency } from "@/lib/use-currency"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

  // Local currency, auto-detected from location (USD prices converted at today's rate).
  const cur = useCurrency()

  return (
    <TooltipProvider delayDuration={150}>
      <div className="h-screen overflow-y-auto bg-background">
        <PublicHeader />

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

          {/* Billing toggle (shadcn Tabs) + currency switcher */}
          <div className="mt-10 flex flex-col items-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Tabs value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
                <TabsList>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="annual">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={cur.currency} onValueChange={cur.setCurrency}>
                <SelectTrigger size="sm" className="w-26">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cur.available.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <CurrencyFlag code={c} />
                        {c}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Save <span className="font-semibold text-primary">2 months</span> with yearly billing
              {cur.converted && " · converted from USD at today's rate"}
            </p>
          </div>

          {/* Integrated pricing + feature comparison table (Free Trial is the leftmost column) */}
          <PricingTable plans={plans} comparison={comparison} cycle={cycle} cur={cur} />

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
  { title: "Access & configuration", keys: ["role_access", "temp_role", "config"] },
  { title: "Operations", keys: ["payroll", "requests"] },
  { title: "Hiring & AI", keys: ["recruitment", "ai", "ai_persona", "ai_interview", "ai_scoring"] },
  { title: "Insights & finance", keys: ["analytics", "audit", "rewards"] },
  { title: "Security & support", keys: ["sso", "support"] },
]

// Currency → ISO country (for the flag image). Flag emoji don't render on Windows, so use flagcdn.
const CURRENCY_COUNTRY: Record<string, string> = {
  USD: "us", PHP: "ph", EUR: "eu", GBP: "gb", JPY: "jp",
  SGD: "sg", AUD: "au", CAD: "ca", INR: "in", AED: "ae",
}

function CurrencyFlag({ code }: { code: string }) {
  const cc = CURRENCY_COUNTRY[code]
  if (!cc) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/h20/${cc}.png`}
      srcSet={`https://flagcdn.com/h40/${cc}.png 2x`}
      alt=""
      width={16}
      height={12}
      className="h-3 w-4 shrink-0 rounded-xs object-cover"
    />
  )
}

// Recommended-column band: a bordered, tinted highlight that runs the full height.
// Recommended column = primary band (always on). Hovered column = a muted "card" lift.
const REC_TOP = "rounded-t-2xl border-x border-t border-primary/25 bg-primary/5"
const REC_MID = "border-x border-primary/25 bg-primary/5"
const REC_BOT = "rounded-b-2xl border-x border-b border-primary/25 bg-primary/5"
const HOV_TOP = "rounded-t-2xl border-x border-t border-border bg-muted/40"
const HOV_MID = "border-x border-border bg-muted/40"
const HOV_BOT = "rounded-b-2xl border-x border-b border-border bg-muted/40"
const STICKY = "sticky left-0 z-10 bg-background"

function PricingTable({
  plans,
  comparison,
  cycle,
  cur,
}: {
  plans: PricingPlan[]
  comparison: PlanComparison
  cycle: Cycle
  cur: ReturnType<typeof useCurrency>
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const bySlug = new Map(plans.map((p) => [p.slug, p]))
  const cols = comparison.plans.map((c) => ({ ...c, pricing: bySlug.get(c.slug) }))
  const featureByKey = new Map(comparison.features.map((f) => [f.key, f]))

  // Highlight the recommended column always, and whichever column is hovered as a card lift.
  const band = (slug: string, recommended: boolean, pos: "top" | "mid" | "bot") => {
    if (recommended) return pos === "top" ? REC_TOP : pos === "bot" ? REC_BOT : REC_MID
    if (hovered === slug) return pos === "top" ? HOV_TOP : pos === "bot" ? HOV_BOT : HOV_MID
    return ""
  }

  return (
    <div className="mt-12 overflow-x-auto pb-2">
      <table
        className="w-full min-w-240 border-separate border-spacing-0 text-[13px]"
        onMouseOver={(e) => {
          const el = (e.target as HTMLElement).closest<HTMLElement>("[data-col]")
          setHovered(el?.dataset.col ?? null)
        }}
        onMouseLeave={() => setHovered(null)}
      >
        <thead>
          <tr>
            <th className={cn(STICKY, "w-[20%] px-4 pb-6 text-left align-bottom")}>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                Compare plans
              </span>
            </th>
            {cols.map((c) => (
              <th
                key={c.slug}
                data-col={c.slug}
                className={cn(
                  "px-3 pb-6 pt-7 text-center align-top transition-colors",
                  band(c.slug, c.recommended, "top")
                )}
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
                  <PriceLabel plan={c.pricing} cycle={cycle} cur={cur} />
                </div>
                <div className="mt-2 text-[11.5px] font-medium text-muted-foreground">
                  {c.pricing?.trialDays != null
                    ? `${c.pricing.trialDays}-day trial`
                    : c.pricing?.includedSeats == null
                      ? "Unlimited seats"
                      : `${c.pricing.includedSeats} seats included`}
                </div>
                <Button
                  asChild
                  size="sm"
                  variant={c.recommended ? "default" : "outline"}
                  className="mx-auto mt-5 w-[92%] rounded-full"
                >
                  <Link
                    href={
                      c.pricing?.customPrice
                        ? "mailto:sales@gpr.com"
                        : c.pricing?.trialDays != null
                          ? `/onboarding?plan=${c.slug}&cycle=${cycle}`
                          : `/checkout?plan=${c.slug}&cycle=${cycle}`
                    }
                  >
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
                <td className={cn(STICKY, "px-4 pb-2 pt-7 align-bottom")}>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {group.title}
                  </span>
                  {group.keys.some((k) => featureByKey.get(k)?.note) && (
                    <span className="mt-1 block text-[10.5px] font-medium normal-case leading-snug text-amber-600 dark:text-amber-400/90">
                      AI features require your own AI provider API key
                    </span>
                  )}
                </td>
                {cols.map((c) => (
                  <td
                    key={c.slug}
                    data-col={c.slug}
                    className={cn("transition-colors", band(c.slug, c.recommended, "mid"))}
                  />
                ))}
              </tr>

              {group.keys.map((key) => {
                const row = featureByKey.get(key)
                if (!row) return null
                return (
                  <tr key={key}>
                    <td className={cn(STICKY, "px-4 py-3 text-left text-foreground/90")}>
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
                            {row.note ? `${row.description} ${row.note}` : row.description}
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </td>
                    {cols.map((c) => (
                      <td
                        key={c.slug}
                        data-col={c.slug}
                        className={cn(
                          "px-4 py-3 text-center transition-colors",
                          band(c.slug, c.recommended, "mid")
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

          {/* spacer row closes the recommended / hovered band */}
          <tr>
            <td className={STICKY} />
            {cols.map((c) => (
              <td
                key={c.slug}
                data-col={c.slug}
                className={cn("h-5 transition-colors", band(c.slug, c.recommended, "bot"))}
              />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PriceLabel({
  plan,
  cycle,
  cur,
}: {
  plan?: PricingPlan
  cycle: Cycle
  cur: ReturnType<typeof useCurrency>
}) {
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
  // Canonical price is USD; convert the effective monthly to the visitor's local currency.
  const monthlyUsd =
    cycle === "annual" && plan.annualPrice != null
      ? Math.round(plan.annualPrice / 12)
      : plan.monthlyPrice ?? 0
  const monthly = cur.convert(monthlyUsd)
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {isTrial ? "Free" : "Starts at"}
      </p>
      <div className="mt-0.5 inline-flex items-baseline gap-0.5">
        <span className="text-[14px] font-semibold text-foreground">{currencySymbol(cur.currency)}</span>
        <span className="text-[30px] font-bold leading-none text-foreground">{formatAmount(monthly)}</span>
        <span className="text-[12px] text-muted-foreground">/mo</span>
      </div>
    </div>
  )
}

