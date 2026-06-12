"use client"

import { Suspense, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { PublicHeader } from "@/components/custom/public-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkBadge01Icon,
  ArrowRight01Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons"
import { pricingApi, type PricingPlan } from "@/lib/pricing-api"
import { useCurrency } from "@/lib/use-currency"
import { useSlugHref } from "@/lib/slug"

// Seat pricing comes from the plan (DB); these are only last-resort defaults if a field is null.
const DEFAULT_INCLUDED_SEATS = 5
const DEFAULT_PER_SEAT = { monthly: 9, annual: 90 }

const FALLBACK: Record<string, PricingPlan> = {
  starter: { slug: "starter", name: "Starter", tagline: "", currency: "USD", monthlyPrice: 29, annualPrice: 290, customPrice: false, seatLimit: null, includedSeats: 15, perSeatMonthly: 9, perSeatAnnual: 90, trialDays: null, recommended: false, sortOrder: 1, ctaLabel: "", features: [] },
  business: { slug: "business", name: "Business", tagline: "", currency: "USD", monthlyPrice: 99, annualPrice: 990, customPrice: false, seatLimit: null, includedSeats: 60, perSeatMonthly: 9, perSeatAnnual: 90, trialDays: null, recommended: false, sortOrder: 2, ctaLabel: "", features: [] },
  professional: { slug: "professional", name: "Professional", tagline: "", currency: "USD", monthlyPrice: 249, annualPrice: 2490, customPrice: false, seatLimit: null, includedSeats: 250, perSeatMonthly: 9, perSeatAnnual: 90, trialDays: null, recommended: true, sortOrder: 3, ctaLabel: "", features: [] },
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <Checkout />
    </Suspense>
  )
}

function Checkout() {
  const slugHref = useSlugHref()
  const params = useSearchParams()
  const slug = params.get("plan") ?? "professional"
  const cycle = (params.get("cycle") as "monthly" | "annual") ?? "monthly"

  const { data: plans } = useQuery({ queryKey: ["pricing", "plans"], queryFn: pricingApi.list, retry: false })
  const plan = plans?.find((p) => p.slug === slug) ?? FALLBACK[slug] ?? FALLBACK.professional
  const cur = useCurrency()

  // Seat pricing from the plan (DB), with last-resort defaults.
  const includedSeats = plan.includedSeats ?? DEFAULT_INCLUDED_SEATS
  const maxSeats = plan.seatLimit ?? 999
  const perSeat =
    (cycle === "annual" ? plan.perSeatAnnual : plan.perSeatMonthly) ??
    (cycle === "annual" ? DEFAULT_PER_SEAT.annual : DEFAULT_PER_SEAT.monthly)

  const [seats, setSeats] = useState(Math.min(includedSeats, maxSeats))
  const [paid, setPaid] = useState(false)
  const [processing, setProcessing] = useState(false)
  const ref = useRef(`WOS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)

  const base = cycle === "annual" ? plan.annualPrice ?? 0 : plan.monthlyPrice ?? 0
  const extraSeats = Math.max(0, seats - includedSeats)
  const seatCost = extraSeats * perSeat
  const total = base + seatCost
  const cycleLabel = cycle === "annual" ? "Billed yearly" : "Billed monthly"

  function pay() {
    setProcessing(true)
    // Mock payment — no charge. Simulate a brief processing delay.
    setTimeout(() => {
      setProcessing(false)
      setPaid(true)
    }, 700)
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <PublicHeader right={<Button asChild size="sm" variant="ghost"><Link href={slugHref("/pricing")}>Back to pricing</Link></Button>} />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-12">
        {!paid ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Checkout</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">
                You&apos;re subscribing to the <span className="font-semibold text-foreground">{plan.name}</span> plan.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
              {/* Payment form */}
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                  <HugeiconsIcon icon={SecurityCheckIcon} size={16} strokeWidth={1.8} className="text-primary" />
                  Payment details
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Demo only — no card is charged and nothing is stored.
                </p>

                <div className="mt-5 space-y-4">
                  <Field label="Cardholder name">
                    <Input placeholder="Jane Dela Cruz" />
                  </Field>
                  <Field label="Card number">
                    <Input inputMode="numeric" placeholder="4242 4242 4242 4242" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiry">
                      <Input placeholder="MM / YY" />
                    </Field>
                    <Field label="CVC">
                      <Input inputMode="numeric" placeholder="123" />
                    </Field>
                  </div>
                  <Field label="Country / region">
                    <Input placeholder="Philippines" />
                  </Field>
                </div>

                <Button className="mt-6 w-full" onClick={pay} disabled={processing}>
                  {processing ? "Processing…" : `Pay ${cur.format(total)}`}
                </Button>
              </Card>

              {/* Order summary */}
              <Card className="h-fit p-6">
                <p className="text-[13px] font-semibold text-foreground">Order summary</p>
                <Separator className="my-4" />
                <Row label={`${plan.name} plan`} value={cur.format(base)} />
                <Row label="Billing" value={cycle === "annual" ? "Yearly" : "Monthly"} muted />

                {/* Seat selector */}
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Team size</p>
                      <p className="text-[11px] text-muted-foreground">
                        {includedSeats} included · {cur.format(perSeat)}/seat after
                      </p>
                    </div>
                    <Stepper value={seats} min={includedSeats} max={maxSeats} onChange={setSeats} />
                  </div>
                  {extraSeats > 0 && (
                    <div className="mt-2 flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground">
                        +{extraSeats} extra {extraSeats === 1 ? "seat" : "seats"} × {cur.format(perSeat)}
                      </span>
                      <span className="font-medium text-foreground">+{cur.format(seatCost)}</span>
                    </div>
                  )}
                  {plan.seatLimit != null && seats >= maxSeats && (
                    <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">
                      Max for this plan. Need more? Upgrade or talk to sales.
                    </p>
                  )}
                </div>

                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-foreground">Total due today</span>
                  <span className="text-[18px] font-bold text-foreground">{cur.format(total)}</span>
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  {cycleLabel}. Cancel anytime.
                  {cur.converted && ` Prices converted from USD at today's rate.`}
                </p>
              </Card>
            </div>
          </>
        ) : (
          /* Receipt */
          <div className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={CheckmarkBadge01Icon} size={36} strokeWidth={1.8} />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">Payment successful</h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Thanks! Your <span className="font-semibold text-foreground">{plan.name}</span> subscription is ready to set up.
            </p>

            <Card className="mt-7 p-6 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Receipt</span>
                <Badge variant="secondary" className="font-mono text-[11px]">{ref.current}</Badge>
              </div>
              <Separator className="my-4" />
              <Row label="Plan" value={`${plan.name} (${cycle === "annual" ? "yearly" : "monthly"})`} />
              <Row label="Seats" value={`${seats}`} muted />
              <Row label="Date" value={new Date().toLocaleDateString()} muted />
              <Row label="Amount paid" value={cur.format(total)} muted />
              <Separator className="my-4" />
              <p className="text-[11.5px] text-muted-foreground">
                A demo receipt — no real charge was made.
              </p>
            </Card>

            <Button asChild className="mt-7 w-full gap-1.5">
              <Link href={slugHref(`/onboarding?plan=${plan.slug}&cycle=${cycle}&seats=${seats}`)}>
                Set up your company
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">{label}</Label>
      {children}
    </div>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  return (
    <div className="flex items-center gap-1 rounded-md border border-input bg-background p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
      >
        −
      </Button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="w-10 bg-transparent text-center text-[14px] font-semibold tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
      >
        +
      </Button>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-medium text-foreground"}>{value}</span>
    </div>
  )
}
