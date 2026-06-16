"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { useSlug, useSlugHref } from "@/lib/slug"
import { companyBrandingApi } from "@/lib/company-branding-api"
import { navConfig, roleLabels } from "@/lib/nav-config"
import { Logo } from "./logo"
import { StatusBadge } from "./status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  GridViewIcon,
  Clock01Icon,
  CreditCardIcon,
  Calendar01Icon,
  UserCircleIcon,
  UserGroup02Icon,
  CheckListIcon,
  Briefcase01Icon,
  UserMultiple02Icon,
  Audit01Icon,
  Setting06Icon,
  ShieldUserIcon,
  UserShield01Icon,
  Notification01Icon,
  Sun01Icon,
  Logout01Icon,
  Settings01Icon,
  TimeScheduleIcon,
  Award01Icon,
  BarChartIcon,
  CloudUploadIcon,
  Megaphone01Icon,
  ArrowDown01Icon,
  Clock03Icon,
  FileManagementIcon,
  Certificate01Icon,
  Timer02Icon,
  Money01Icon,
  Airplane01Icon,
  DocumentValidationIcon,
  File01Icon,
  Building04Icon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons"
import { useAuthStore } from "@/store/auth-store"
import { useIdentityMe } from "@/hooks/use-identity-profile"
import { useLogout, useMe } from "@/hooks/use-auth"

const roleVariant: Record<string, "blue" | "purple" | "amber" | "gray"> = {
  EMPLOYEE: "blue",
  HR: "purple",
  ADMIN: "amber",
}

const NAV_ICONS: Record<string, IconSvgElement> = {
  overview: GridViewIcon,
  dtr: Clock01Icon,
  finance: CreditCardIcon,
  payroll: CreditCardIcon,
  leave: Calendar01Icon,
  request: Calendar01Icon,
  profile: UserCircleIcon,
  general: UserCircleIcon,
  team: UserGroup02Icon,
  requests: CheckListIcon,
  attendance: CheckListIcon,
  recruitment: Briefcase01Icon,
  applicants: UserMultiple02Icon,
  careers: Briefcase01Icon,
  "my-applications": CheckListIcon,
  interviews: Calendar01Icon,
  offers: Award01Icon,
  users: UserMultiple02Icon,
  roles: UserShield01Icon,
  employees: UserMultiple02Icon,
  schedules: TimeScheduleIcon,
  "schedule-changes": Calendar01Icon,
  "my-requests": CheckListIcon,
  "my-overtime": Timer02Icon,
  "my-coe": Certificate01Icon,
  "my-or": FileManagementIcon,
  "my-change-time": Clock03Icon,
  "my-schedule": TimeScheduleIcon,
  "my-salary-dispute": Money01Icon,
  "change-time": Clock03Icon,
  or: FileManagementIcon,
  coe: Certificate01Icon,
  overtime: Timer02Icon,
  "salary-disputes": Money01Icon,
  business: Building04Icon,
  receipts: Invoice01Icon,
  permits: DocumentValidationIcon,
  "business-trip": Airplane01Icon,
  expenses: CreditCardIcon,
  contracts: File01Icon,
  rewards: Award01Icon,
  reports: BarChartIcon,
  upload: CloudUploadIcon,
  announcements: Megaphone01Icon,
  audit: Audit01Icon,
  admin: Setting06Icon,
  config: Setting06Icon,
  security: ShieldUserIcon,
  notifications: Notification01Icon,
  appearance: Sun01Icon,
}

function NavIcon({ section }: { section: string }) {
  const icon = NAV_ICONS[section] ?? GridViewIcon
  return <HugeiconsIcon icon={icon} size={14} strokeWidth={1.8} />
}

export function Sidebar() {
  const pathname = usePathname()
  const slugHref = useSlugHref()
  const slug = useSlug()
  const logoutMutation = useLogout()
  useMe()

  // Company branding for the sidebar mark. Shares SlugLayout's cache key, so a
  // branding save (which updates ["public-branding", slug]) re-renders this live.
  const { data: branding } = useQuery({
    queryKey: ["public-branding", slug],
    queryFn: () => companyBrandingApi.getBySlug(slug),
    retry: false,
    staleTime: 60_000,
  })

  // Branding is client-only data (no SSR fetch), so the server renders the default
  // mark while the client has the company logo cached. Gate it behind a mount flag
  // so the first client render matches the server HTML and hydration stays clean —
  // the real branding swaps in on the next paint.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const brand = mounted ? branding : undefined

  const { user, apiRole, userRoleNames, authorities } = useAuthStore()
  const { data: me } = useIdentityMe()
  const avatarSrc = me?.profilePhoto ?? user?.profilePhoto ?? undefined

  // Path shape is now /<slug>/dashboard/<section>/<sub>, so section/sub shift by +1.
  const segments = pathname.split("/")
  const section = segments[3]

  const role = apiRole?.toUpperCase() ?? "EMPLOYEE"
  const roleLabel = userRoleNames[0] ?? roleLabels[role] ?? "Employee"
  const badgeVariant = roleVariant[role] ?? "gray"

  function hasAuthority(authority: string | null): boolean {
    if (authority === null) return true
    return authorities.includes(authority)
  }

  function isVisible(item: {
    authority: string | null
    hideIfAuthority?: string
  }): boolean {
    if (!hasAuthority(item.authority)) return false
    if (item.hideIfAuthority && authorities.includes(item.hideIfAuthority))
      return false
    return true
  }

  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "—"
  const displayName = user ? `${user.firstName} ${user.lastName}` : "—"
  const employeeId = user?.employeeId ?? ""

  // Sidebar always shows the main dashboard nav; settings has its own top tabs.
  const items = navConfig.filter(isVisible)

  function isActive(itemSection: string) {
    if (itemSection === "overview") return !section || section === "overview"
    return section === itemSection
  }

  function isChildActive(item: (typeof items)[number]) {
    return item.children?.some((c) => isActive(c.section)) ?? false
  }

  function href(itemSection: string) {
    if (itemSection === "overview") return slugHref("/dashboard")
    return slugHref(`/dashboard/${itemSection}`)
  }

  // Auto-expand groups that contain the active child
  const defaultExpanded = items
    .filter(
      (item) => item.children && item.children.some((c) => isActive(c.section))
    )
    .map((item) => item.section)

  const [expanded, setExpanded] = useState<string[]>(defaultExpanded)

  function toggleExpanded(sectionKey: string) {
    setExpanded((prev) =>
      prev.includes(sectionKey)
        ? prev.filter((s) => s !== sectionKey)
        : [...prev, sectionKey]
    )
  }

  function NavRow({
    item,
    indent = false,
  }: {
    item: (typeof items)[number]
    indent?: boolean
  }) {
    const active = isActive(item.section)
    return (
      <Link
        href={href(item.section)}
        className={cn(
          "group mb-0.5 flex items-center gap-2.5 rounded-lg border border-transparent text-[13px] font-medium transition-all duration-150",
          indent ? "py-1.5 pr-2.5 pl-0" : "px-2.5 py-2",
          active
            ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
        )}
      >
        <span
          className={cn(
            "shrink-0 transition-colors",
            active
              ? "text-primary-foreground"
              : "text-muted-foreground/60 group-hover:text-muted-foreground"
          )}
        >
          <NavIcon section={item.section} />
        </span>
        <span className="flex-1">{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span
            className={cn(
              "flex min-w-4.5 items-center justify-center rounded-full px-1.5 py-px text-[10px] font-semibold",
              active ? "bg-white/20 text-white" : "bg-red-500 text-white"
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Logo */}
      <div className="flex h-15 shrink-0 items-center gap-2 border-b border-border px-5">
        <Logo
          iconSrc={brand?.sidebarIcon ?? brand?.logo ?? null}
          name={brand?.name}
        />
        <StatusBadge
          variant={badgeVariant}
          dot={false}
          className="ml-auto text-[10px]"
        >
          {roleLabel}
        </StatusBadge>
      </div>

      {/* Nav */}
      <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto p-3">
        <div className="mb-1 px-2 pt-2 pb-1">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
            Navigation
          </p>
        </div>

        {items.map((item) => {
          const hasChildren = item.children && item.children.length > 0
          const isOpen = expanded.includes(item.section)
          const childActive = isChildActive(item)

          if (hasChildren) {
            const visibleChildren = item.children!.filter(isVisible)
            // Hide the parent group entirely when none of its children pass authority gating.
            if (visibleChildren.length === 0) return null
            const active = isActive(item.section)
            return (
              <div key={item.section}>
                {/* Parent row — noPage: whole row toggles; otherwise link navigates + chevron toggles */}
                <div
                  className={cn(
                    "group mb-0.5 flex items-center rounded-lg border border-transparent transition-all duration-150",
                    active
                      ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                      : childActive
                        ? "border-border bg-muted text-foreground"
                        : "text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.noPage ? (
                    <button
                      onClick={() => toggleExpanded(item.section)}
                      className="flex flex-1 items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium"
                    >
                      <span
                        className={cn(
                          "shrink-0 transition-colors",
                          active
                            ? "text-primary-foreground"
                            : childActive
                              ? "text-foreground"
                              : "text-muted-foreground/60 group-hover:text-muted-foreground"
                        )}
                      >
                        <NavIcon section={item.section} />
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        size={12}
                        strokeWidth={2}
                        className={cn(
                          "transition-transform duration-200",
                          active
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground/60",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                  ) : (
                    <>
                      <Link
                        href={href(item.section)}
                        className="flex flex-1 items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium"
                      >
                        <span
                          className={cn(
                            "shrink-0 transition-colors",
                            active
                              ? "text-primary-foreground"
                              : childActive
                                ? "text-foreground"
                                : "text-muted-foreground/60 group-hover:text-muted-foreground"
                          )}
                        >
                          <NavIcon section={item.section} />
                        </span>
                        <span className="flex-1">{item.label}</span>
                      </Link>
                      <button
                        onClick={() => toggleExpanded(item.section)}
                        className="flex h-full items-center px-2 py-2"
                      >
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          size={12}
                          strokeWidth={2}
                          className={cn(
                            "transition-transform duration-200",
                            active
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground/60",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>
                    </>
                  )}
                </div>

                {/* Children */}
                {isOpen && (
                  <div className="mb-1 ml-5 border-l-2 border-border/50">
                    {visibleChildren.map((child, idx) => {
                      const isLast = idx === visibleChildren.length - 1
                      return (
                        <div key={child.section} className="relative">
                          {/* Mask the container border below the branch point on the last item */}
                          {isLast && (
                            <div className="absolute top-1/2 bottom-0 -left-0.5 z-10 w-1 bg-card" />
                          )}
                          {/* Curved ╰─ connector */}
                          <div className="absolute top-0 -left-px h-1/2 w-4 rounded-bl-[8px] border-b-2 border-l-2 border-border/50" />
                          <div className="pl-5">
                            <NavRow item={child} indent />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return <NavRow key={item.section} item={item} />
        })}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <Avatar className="size-7 shrink-0">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {employeeId}
            </p>
          </div>
          <div className="flex gap-1">
            <Link
              href={slugHref("/dashboard/my-company")}
              title="My Company"
              aria-label="My Company"
              className={cn(
                "flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground",
                section === "my-company"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <HugeiconsIcon
                icon={Building04Icon}
                size={13}
                strokeWidth={1.8}
              />
            </Link>
            <Link
              href={slugHref("/dashboard/settings")}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon
                icon={Settings01Icon}
                size={13}
                strokeWidth={1.8}
              />
            </Link>
            <button
              onClick={() => logoutMutation.mutate()}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
            >
              <HugeiconsIcon icon={Logout01Icon} size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
