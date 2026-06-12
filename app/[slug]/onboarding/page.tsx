"use client"

import { Suspense, useState } from "react"
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
  Building03Icon,
  CheckmarkBadge01Icon,
  ArrowRight01Icon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons"
import { pricingApi, type FeatureRow } from "@/lib/pricing-api"
import { FALLBACK_COMPARISON } from "@/lib/pricing-fallback"
import { useSlugHref } from "@/lib/slug"

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  )
}

function Onboarding() {
  const slugHref = useSlugHref()
  const params = useSearchParams()
  const slug = params.get("plan") ?? "professional"
  const seats = params.get("seats")
  const { data: plans } = useQuery({ queryKey: ["pricing", "plans"], queryFn: pricingApi.list, retry: false })
  const planName = plans?.find((p) => p.slug === slug)?.name ?? "your"
  const seatNote = seats ? ` · ${seats} ${Number(seats) === 1 ? "seat" : "seats"}` : ""

  // Which feature/config modules this plan unlocks (for the availability indicator).
  const { data: comparison } = useQuery({
    queryKey: ["pricing", "comparison"],
    queryFn: pricingApi.comparison,
    retry: false,
  })
  const cmp = comparison ?? FALLBACK_COMPARISON
  const includedKeys = new Set(cmp.plans.find((p) => p.slug === slug)?.included ?? [])
  const includedCount = cmp.features.filter((f) => includedKeys.has(f.key)).length

  const [company, setCompany] = useState("")
  const [companySlug, setCompanySlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [created, setCreated] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const effectiveSlug = slugTouched ? companySlug : slugify(company)
  const valid = company.trim() && firstName.trim() && lastName.trim() && email.trim() && password.length >= 8

  function submit() {
    if (!valid) return
    setSubmitting(true)
    // Pure-UI mock — no account/company is persisted yet.
    setTimeout(() => {
      setSubmitting(false)
      setCreated(true)
    }, 700)
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <PublicHeader right={<Button asChild size="sm" variant="ghost"><Link href={slugHref("/pricing")}>Pricing</Link></Button>} />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-12">
        {!created ? (
          <>
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Building03Icon} size={24} strokeWidth={1.8} />
              </span>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Set up your company
              </h1>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Create your workspace on the{" "}
                <span className="font-semibold text-foreground">{planName}</span> plan{seatNote} and become its admin.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
            <Card className="h-fit p-6">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Company</p>
              <div className="mt-4 space-y-4">
                <Field label="Company name">
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Inc."
                  />
                </Field>
                <Field label="Workspace URL">
                  <div className="flex items-center rounded-md border border-input bg-transparent pl-3 focus-within:ring-2 focus-within:ring-ring/40">
                    <span className="text-[13px] text-muted-foreground">workos.app/</span>
                    <Input
                      value={effectiveSlug}
                      onChange={(e) => {
                        setSlugTouched(true)
                        setCompanySlug(slugify(e.target.value))
                      }}
                      placeholder="acme"
                      className="border-0 bg-transparent px-1 focus-visible:ring-0"
                    />
                  </div>
                </Field>
              </div>

              <Separator className="my-6" />

              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                Company admin
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                This account owns the company and can invite everyone else.
              </p>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First name">
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                  </Field>
                  <Field label="Last name">
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dela Cruz" />
                  </Field>
                </div>
                <Field label="Work email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
                </Field>
                <Field label="Password">
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                </Field>
              </div>

              <Button className="mt-6 w-full" onClick={submit} disabled={!valid || submitting}>
                {submitting ? "Creating…" : "Create company"}
              </Button>
              <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
                Demo only — no company or account is created yet.
              </p>
            </Card>

            <PlanFeaturePanel
              planName={planName}
              features={cmp.features}
              includedKeys={includedKeys}
              includedCount={includedCount}
            />
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-md text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={CheckmarkBadge01Icon} size={36} strokeWidth={1.8} />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              {company || "Your company"} is ready
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Your workspace is set up on the {planName} plan. Sign in as the company admin to get started.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12.5px]">
              <span className="text-muted-foreground">Workspace</span>
              <Badge variant="secondary" className="font-mono">workos.app/{effectiveSlug || "acme"}</Badge>
            </div>
            <Button asChild className="mt-7 w-full gap-1.5">
              <Link href={slugHref("/login")}>
                Sign in to your workspace
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

/** Shows which feature/config modules the chosen plan unlocks vs. which are locked. */
function PlanFeaturePanel({
  planName,
  features,
  includedKeys,
  includedCount,
}: {
  planName: string
  features: FeatureRow[]
  includedKeys: Set<string>
  includedCount: number
}) {
  const slugHref = useSlugHref()
  const lockedCount = features.length - includedCount
  return (
    <Card className="h-fit p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">Included on {planName}</p>
        <Badge variant="secondary" className="text-[11px]">
          {includedCount}/{features.length} modules
        </Badge>
      </div>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        Config modules your workspace can turn on. Locked ones need a higher plan.
      </p>

      <Separator className="my-4" />

      <ul className="space-y-2.5">
        {features.map((f) => {
          const on = includedKeys.has(f.key)
          return (
            <li key={f.key} className="flex items-start gap-2.5">
              <HugeiconsIcon
                icon={on ? CheckmarkBadge01Icon : SquareLock02Icon}
                size={16}
                strokeWidth={1.8}
                className={on ? "mt-0.5 shrink-0 text-primary" : "mt-0.5 shrink-0 text-muted-foreground/60"}
              />
              <span className={on ? "text-[12.5px] text-foreground" : "text-[12.5px] text-muted-foreground line-through decoration-muted-foreground/40"}>
                {f.label}
              </span>
            </li>
          )
        })}
      </ul>

      {lockedCount > 0 && (
        <>
          <Separator className="my-4" />
          <Link
            href={slugHref("/pricing")}
            className="flex items-center justify-center gap-1 text-[12px] font-medium text-primary hover:underline"
          >
            Unlock {lockedCount} more with a higher plan
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
          </Link>
        </>
      )}
    </Card>
  )
}
