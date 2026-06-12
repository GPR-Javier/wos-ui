"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { companyApi } from "@/lib/auth-api"
import { useSlugHref } from "@/lib/slug"
import {
  companyProfileApi,
  type CompanyProfile,
} from "@/lib/company-profile-api"
import {
  companyBrandingApi,
  toDataUrl,
  type CompanyBrandingDto,
} from "@/lib/company-branding-api"
import { useAuthStore } from "@/store/auth-store"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CompanyOrgChart } from "@/components/dashboard/company-org-chart"
import {
  CompanyBranding,
  EMPTY_BRANDING,
  resolveAsset,
  type Branding,
} from "@/components/dashboard/company-branding"
import {
  CompanyTheme,
  DEFAULT_THEME,
  type BrandTheme,
} from "@/components/dashboard/company-theme"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Building04Icon,
  Mail01Icon,
  Call02Icon,
  GlobalIcon,
  Location01Icon,
  Calendar03Icon,
  UserGroup02Icon,
  Briefcase01Icon,
  CheckmarkBadge01Icon,
  PencilEdit01Icon,
  FloppyDiskIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

// Editing is gated by this functionality (seeded under Configuration, granted to Company Admin).
const EDIT_AUTHORITY = "CONFIGURATION:EDIT_COMPANY_DETAILS"

type Form = { [K in keyof CompanyProfile]: string }
const EMPTY_FORM: Form = {
  tagline: "",
  about: "",
  industry: "",
  founded: "",
  companySize: "",
  headquarters: "",
  email: "",
  phone: "",
  website: "",
  address: "",
}

const toForm = (p: CompanyProfile): Form => ({
  tagline: p.tagline ?? "",
  about: p.about ?? "",
  industry: p.industry ?? "",
  founded: p.founded ?? "",
  companySize: p.companySize ?? "",
  headquarters: p.headquarters ?? "",
  email: p.email ?? "",
  phone: p.phone ?? "",
  website: p.website ?? "",
  address: p.address ?? "",
})
const toPayload = (f: Form): CompanyProfile =>
  Object.fromEntries(
    Object.entries(f).map(([k, v]) => [k, v.trim() ? v.trim() : null])
  ) as unknown as CompanyProfile

const TABS = ["basic", "branding", "structure"] as const
type TabKey = (typeof TABS)[number]

export function MyCompanySection() {
  const qc = useQueryClient()
  const router = useRouter()
  const slugHref = useSlugHref()
  const searchParams = useSearchParams()
  // Active tab lives in the URL (?tab=) so it survives a refresh and is linkable.
  const tabParam = searchParams.get("tab")
  const activeTab: TabKey = TABS.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : "basic"
  const setTab = (tab: string) =>
    router.replace(slugHref(`/dashboard/my-company?tab=${tab}`), {
      scroll: false,
    })
  const { data: companies } = useQuery({
    queryKey: ["my-company", "companies"],
    queryFn: companyApi.list,
    retry: false,
  })
  const { data: profile } = useQuery({
    queryKey: ["company-profile"],
    queryFn: companyProfileApi.get,
    retry: false,
  })
  const company = companies?.[0]
  const slug = company?.slug ?? "your-company"
  const displayName = company?.name ?? "Your Company"
  const initials = displayName.slice(0, 2).toUpperCase()
  const canEdit = useAuthStore((s) => s.authorities.includes(EDIT_AUTHORITY))

  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [editing, setEditing] = useState(false)
  const backup = useRef<Form>(EMPTY_FORM)

  // Company branding: a single master image auto-generates the favicon, sidebar
  // mark and app icon (see CompanyBranding); theme holds the accent + radius.
  // Both are persisted to wos-hr (company_branding) on Save.
  const [branding, setBranding] = useState<Branding>(EMPTY_BRANDING)
  const [theme, setTheme] = useState<BrandTheme>(DEFAULT_THEME)
  const logo = resolveAsset(branding, "logo")
  const brandingLoaded = useRef(false)

  const { data: brandingData } = useQuery({
    queryKey: ["company-branding"],
    queryFn: companyBrandingApi.getMine,
    retry: false,
  })

  // Seed the editor from the saved branding once (subsequent edits stay local until Save).
  useEffect(() => {
    if (!brandingData || brandingLoaded.current) return
    brandingLoaded.current = true
    setBranding({
      master: brandingData.masterImage ?? null,
      // Stored assets load as the resolved ("Auto") set; overrides start empty.
      generated: {
        logo: brandingData.logo ?? undefined,
        favicon: brandingData.favicon ?? undefined,
        sidebarIcon: brandingData.sidebarIcon ?? undefined,
        appIcon: brandingData.appIcon ?? undefined,
      },
      overrides: {},
    })
    setTheme({
      accent: brandingData.accentColor ?? DEFAULT_THEME.accent,
      radius: brandingData.radius ?? DEFAULT_THEME.radius,
    })
  }, [brandingData])

  const brandingMutation = useMutation({
    mutationFn: async (): Promise<CompanyBrandingDto> => {
      // Resolve each asset (override ?? generated) and convert blob URLs → data-URLs.
      const [masterImage, logoB, favicon, sidebarIcon, appIcon] =
        await Promise.all([
          toDataUrl(branding.master),
          toDataUrl(resolveAsset(branding, "logo")),
          toDataUrl(resolveAsset(branding, "favicon")),
          toDataUrl(resolveAsset(branding, "sidebarIcon")),
          toDataUrl(resolveAsset(branding, "appIcon")),
        ])
      return companyBrandingApi.update({
        masterImage,
        logo: logoB,
        favicon,
        sidebarIcon,
        appIcon,
        accentColor: theme.accent,
        radius: theme.radius,
        name: null,
        slug: null,
      })
    },
    onSuccess: (saved) => qc.setQueryData(["company-branding"], saved),
  })

  // Load fetched profile into the form (unless the user is mid-edit).
  useEffect(() => {
    if (profile && !editing) setForm(toForm(profile))
  }, [profile, editing])

  const mutation = useMutation({
    mutationFn: (f: Form) => companyProfileApi.update(toPayload(f)),
    onSuccess: (saved) => {
      qc.setQueryData(["company-profile"], saved)
      setEditing(false)
    },
  })

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  function startEdit() {
    backup.current = form
    mutation.reset()
    setEditing(true)
  }
  function cancel() {
    setForm(backup.current)
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header (identity + branding) */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            {/* Logo thumbnail (reflects the resolved branding logo) */}
            {logo ? (
              <img
                src={logo}
                alt={`${displayName} logo`}
                className="size-16 shrink-0 rounded-2xl object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-[20px] font-bold text-primary">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[20px] font-bold tracking-tight text-foreground">
                  {displayName}
                </h1>
                <StatusBadge variant="blue" dot={false}>
                  <span className="inline-flex items-center gap-1">
                    <HugeiconsIcon
                      icon={CheckmarkBadge01Icon}
                      size={11}
                      strokeWidth={2}
                    />
                    Active
                  </span>
                </StatusBadge>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                @{slug}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="gap-6">
        <TabsList variant="line" className="border-b border-border">
          <TabsTrigger value="basic">Basic information</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
        </TabsList>

        {/* ── Basic information ── */}
        <TabsContent value="basic" className="space-y-5">
          {/* Toolbar */}
          <div className="flex min-h-8 items-center justify-between gap-3">
            <p className="text-[12px] font-medium">
              {mutation.isSuccess && !editing && (
                <span className="text-green-600 dark:text-green-400">
                  Company details saved.
                </span>
              )}
              {mutation.isError && (
                <span className="text-destructive">
                  Couldn’t save — check your access and try again.
                </span>
              )}
            </p>
            {canEdit ? (
              editing ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancel}
                    disabled={mutation.isPending}
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={13}
                      strokeWidth={2}
                      className="mr-1.5"
                    />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => mutation.mutate(form)}
                    disabled={mutation.isPending}
                  >
                    <HugeiconsIcon
                      icon={FloppyDiskIcon}
                      size={13}
                      strokeWidth={2}
                      className="mr-1.5"
                    />
                    {mutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={startEdit}>
                  <HugeiconsIcon
                    icon={PencilEdit01Icon}
                    size={13}
                    strokeWidth={2}
                    className="mr-1.5"
                  />
                  Edit details
                </Button>
              )
            ) : (
              <span className="text-[11.5px] text-muted-foreground/70">
                Managed by an administrator
              </span>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left: About + key facts */}
            <div className="space-y-6">
              <Panel title="About">
                {editing ? (
                  <Input
                    value={form.tagline}
                    onChange={(e) => set("tagline")(e.target.value)}
                    placeholder="Short tagline"
                    className="mb-3 h-8 text-[13px]"
                  />
                ) : (
                  form.tagline && (
                    <p className="mb-2 text-[13px] font-medium text-foreground">
                      {form.tagline}
                    </p>
                  )
                )}
                {editing ? (
                  <textarea
                    value={form.about}
                    onChange={(e) => set("about")(e.target.value)}
                    rows={4}
                    placeholder="What does your company do?"
                    className="w-full resize-none rounded-lg border border-input bg-transparent p-3 text-[13px] leading-relaxed text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
                  />
                ) : (
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {form.about || (
                      <span className="text-muted-foreground/50">
                        No description yet.
                      </span>
                    )}
                  </p>
                )}
              </Panel>

              <Panel title="Key facts">
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <InfoRow
                    icon={Briefcase01Icon}
                    label="Industry"
                    value={form.industry}
                    editing={editing}
                    onChange={set("industry")}
                  />
                  <InfoRow
                    icon={Calendar03Icon}
                    label="Founded"
                    value={form.founded}
                    editing={editing}
                    onChange={set("founded")}
                  />
                  <InfoRow
                    icon={UserGroup02Icon}
                    label="Company size"
                    value={form.companySize}
                    editing={editing}
                    onChange={set("companySize")}
                  />
                  <InfoRow
                    icon={Building04Icon}
                    label="Headquarters"
                    value={form.headquarters}
                    editing={editing}
                    onChange={set("headquarters")}
                  />
                </div>
              </Panel>
            </div>

            {/* Right: contact */}
            <Panel title="Contact">
              <div className="space-y-4">
                <InfoRow
                  icon={Mail01Icon}
                  label="Email"
                  value={form.email}
                  editing={editing}
                  onChange={set("email")}
                  accent
                />
                <InfoRow
                  icon={Call02Icon}
                  label="Phone"
                  value={form.phone}
                  editing={editing}
                  onChange={set("phone")}
                  accent
                />
                <InfoRow
                  icon={GlobalIcon}
                  label="Website"
                  value={form.website}
                  editing={editing}
                  onChange={set("website")}
                  accent
                />
                <InfoRow
                  icon={Location01Icon}
                  label="Address"
                  value={form.address}
                  editing={editing}
                  onChange={set("address")}
                  accent
                />
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ── Branding ── */}
        <TabsContent value="branding" className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Branding &amp; customization
              </p>
              <p className="text-[12px] text-muted-foreground">
                Tune your theme and upload brand assets — applied across the app
                for everyone in your company.
              </p>
            </div>
            {canEdit ? (
              <div className="flex items-center gap-3">
                {brandingMutation.isSuccess && (
                  <span className="text-[12px] font-medium text-green-600 dark:text-green-400">
                    Branding saved.
                  </span>
                )}
                {brandingMutation.isError && (
                  <span className="text-[12px] font-medium text-destructive">
                    Couldn’t save.
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={() => brandingMutation.mutate()}
                  disabled={brandingMutation.isPending}
                >
                  <HugeiconsIcon
                    icon={FloppyDiskIcon}
                    size={13}
                    strokeWidth={2}
                    className="mr-1.5"
                  />
                  {brandingMutation.isPending ? "Saving…" : "Save branding"}
                </Button>
              </div>
            ) : (
              <span className="text-[11.5px] text-muted-foreground/70">
                Managed by an administrator
              </span>
            )}
          </div>

          {/* Theme (colors + radius) */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-4 text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
              Theme
            </p>
            <CompanyTheme theme={theme} onChange={setTheme} canEdit={canEdit} />
          </section>

          {/* Brand assets (logo, favicon, icons) */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-4 text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
              Brand assets
            </p>
            <CompanyBranding
              branding={branding}
              onChange={setBranding}
              canEdit={canEdit}
            />
          </section>
        </TabsContent>

        {/* ── Structure ── */}
        <TabsContent value="structure">
          <CompanyOrgChart />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-4 text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  editing,
  onChange,
  accent,
}: {
  icon: IconSvgElement
  label: string
  value: string
  editing: boolean
  onChange: (v: string) => void
  accent?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          accent
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <HugeiconsIcon icon={icon} size={15} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {editing ? (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 h-8 text-[13px]"
          />
        ) : (
          <p className="truncate text-[13px] font-medium text-foreground">
            {value || (
              <span className="font-normal text-muted-foreground/50">—</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
