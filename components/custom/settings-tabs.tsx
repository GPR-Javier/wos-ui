"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSlugHref } from "@/lib/slug"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Setting06Icon,
  ShieldUserIcon,
  Notification01Icon,
  Sun01Icon,
} from "@hugeicons/core-free-icons"

const TABS: { label: string; href: string; icon: IconSvgElement }[] = [
  {
    label: "General",
    href: "/dashboard/settings/general",
    icon: Setting06Icon,
  },
  {
    label: "Account",
    href: "/dashboard/settings/account",
    icon: ShieldUserIcon,
  },
  {
    label: "Security",
    href: "/dashboard/settings/security",
    icon: ShieldUserIcon,
  },
  {
    label: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: Notification01Icon,
  },
  {
    label: "Appearance",
    href: "/dashboard/settings/appearance",
    icon: Sun01Icon,
  },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const slugHref = useSlugHref()

  return (
    <div className="shrink-0 border-b border-border px-6">
      <div className="flex gap-0.5">
        {TABS.map((tab) => {
          const href = slugHref(tab.href)
          const isActive = pathname === href
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-3.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              <HugeiconsIcon icon={tab.icon} size={13} strokeWidth={1.8} />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
