"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useSlug } from "@/lib/slug"
import { templateApi } from "@/lib/template-api"
import { companyProfileApi } from "@/lib/company-profile-api"
import { companyBrandingApi } from "@/lib/company-branding-api"
import type { ResolvedTemplate } from "@/lib/template-types"
import type { PayslipFigures } from "@/lib/payslip-figures"
import { BlockView } from "@/components/dashboard/settings/template-editor/block-view"

/**
 * Renders real figures through the company's configured payslip template.
 *
 * <p>Deliberately reuses the editor's {@link BlockView} rather than reimplementing the blocks: two
 * renderers would drift, and the whole point of the template is that what an admin arranges in
 * Configure → Communications → Payslip format is what everyone downstream sees.
 *
 * <p>The template is fetched once and cached at module scope — a payroll preview can render this
 * for many employees in a row, and the layout is identical for all of them.
 */

let cached: Promise<ResolvedTemplate | undefined> | null = null

function loadTemplate() {
  // Cached across mounts, not just within one: the run preview opens and closes repeatedly.
  cached ??= templateApi.get("PAYSLIP")
  return cached
}

/** Drops the caches so a freshly saved customization or profile edit shows up without a reload. */
export function invalidatePayslipTemplate() {
  cached = null
  companyCache = null
}

type CompanyValues = Record<string, string>

let companyCache: Promise<CompanyValues> | null = null

/**
 * The company details a payslip header needs.
 *
 * <p>Resolved here rather than passed in, so every caller that renders a payslip gets a complete
 * header without having to know it needs to fetch two endpoints first — the failure mode otherwise
 * is a payslip that silently prints a blank company name.
 *
 * <p>Two sources because the data is split: the name lives on branding (and only on the public
 * by-slug read), while the address and contact details live on the company profile. Either failing
 * degrades to an empty string rather than taking the payslip down with it.
 */
function loadCompany(slug: string): Promise<CompanyValues> {
  companyCache ??= Promise.all([
    companyBrandingApi.getBySlug(slug).catch(() => null),
    companyProfileApi.get().catch(() => null),
  ]).then(([branding, profile]) => ({
    companyName: branding?.name ?? "",
    // The logo is a base64 data-URL, so it renders without a second request and will embed
    // directly into a PDF later. Falls back to the master image when no dedicated logo is set.
    companyLogo: branding?.logo ?? branding?.masterImage ?? "",
    companyAddress: profile?.address ?? profile?.headquarters ?? "",
    companyEmail: profile?.email ?? "",
    companyPhone: profile?.phone ?? "",
    companyWebsite: profile?.website ?? "",
  }))
  return companyCache
}

export function PayslipDocument({ figures }: { figures: PayslipFigures }) {
  const slug = useSlug()
  const [resolved, setResolved] = useState<ResolvedTemplate | null | undefined>(
    undefined
  )
  const [company, setCompany] = useState<CompanyValues | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([loadTemplate(), loadCompany(slug)]).then(([t, c]) => {
      if (!alive) return
      setCompany(c)
      setResolved(t ?? null)
    })
    return () => {
      alive = false
    }
  }, [slug])

  if (resolved === undefined) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  // Company details fill in the header's {{tokens}}; the payroll figures win on any key they share.
  const withCompany: PayslipFigures = {
    ...figures,
    values: { ...company, ...figures.values },
  }

  // wos-notification unreachable, or the template missing: fall back to the figures alone rather
  // than showing nothing. A payroll preview that fails because a *template* service is down would
  // be a bad trade.
  if (!resolved) {
    return <PlainFallback figures={figures} />
  }

  const layout = resolved.config.layout ?? resolved.template.defaultLayout

  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      style={{ background: layout.contentBackground }}
    >
      {/* 24px matches the editor canvas's padding, so the document an admin arranged and the one
          rendered here are the same width with the same margins — not merely similar. */}
      <div className="mx-auto p-6" style={{ maxWidth: layout.width }}>
        {layout.blocks.map((b) => (
          <BlockView
            key={b.id}
            block={b}
            vars={resolved.template.variables}
            preview
            figures={withCompany}
          />
        ))}
      </div>
    </div>
  )
}

/** Last-resort layout when the template can't be loaded. */
function PlainFallback({ figures }: { figures: PayslipFigures }) {
  return (
    <div className="rounded-xl border border-border">
      <div className="border-b border-border px-4 py-3">
        {figures.header.map((r) => (
          <div key={r.label} className="flex justify-between text-[12px]">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-medium">{r.amount}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-semibold">Net pay</span>
        <span className="text-[16px] font-bold tabular-nums">
          {figures.netPay}
        </span>
      </div>
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        Payslip template unavailable — showing figures only.
      </p>
    </div>
  )
}
