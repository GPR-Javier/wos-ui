"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { sectionTitles } from "@/lib/nav-config"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Sun01Icon,
  Moon02Icon,
  ArrowDown01Icon,
  Setting06Icon,
  Logout01Icon,
  UserShield01Icon,
  CheckmarkCircle01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { useAuthStore } from "@/store/auth-store"
import { useToastStore } from "@/store/toast-store"
import { useLogout, useSwitchRole } from "@/hooks/use-auth"

export function Topbar() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  useEffect(() => setMounted(true), [])

  const logoutMutation = useLogout()
  const switchRoleMutation = useSwitchRole()
  const pushToast = useToastStore((s) => s.push)
  const { user, userRoleNames, availableRoles, activeUserRoleId } =
    useAuthStore()

  const segments = pathname.split("/")
  const section = segments[2] // top-level: "dtr", "settings", undefined
  const subSection = segments[3] // settings sub-page

  const isSettings = section === "settings"

  // Show a Back button on settings pages and on any detail route (one with a sub-segment,
  // e.g. /dashboard/assessment/123, /dashboard/careers/12).
  const showBack = isSettings || Boolean(subSection)

  // For settings pages, title comes from the sub-section; otherwise from the top-level section
  const titleKey = isSettings
    ? (subSection ?? "general")
    : (section ?? "overview")
  const title =
    sectionTitles[titleKey] ??
    titleKey.charAt(0).toUpperCase() + titleKey.slice(1)

  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "—"
  const displayName = user ? `${user.firstName} ${user.lastName}` : "—"
  const roleLabel = userRoleNames[0] ?? ""

  return (
    <div className="flex h-15 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card px-5 shadow-sm">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
          Back
        </button>
      )}
      <span className="flex-1 text-[15px] font-semibold text-foreground">
        {title}
      </span>

      {/* Dark mode toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Toggle dark mode"
        aria-label="Toggle dark mode"
      >
        {mounted && resolvedTheme === "dark" ? (
          <HugeiconsIcon icon={Sun01Icon} size={15} strokeWidth={1.8} />
        ) : (
          <HugeiconsIcon icon={Moon02Icon} size={15} strokeWidth={1.8} />
        )}
      </button>

      {/* User menu */}
      <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button className="outline-none" aria-label="User menu">
            <Avatar className="size-8 cursor-pointer ring-2 ring-transparent transition-all hover:ring-primary/30">
              <AvatarImage
                src={user?.profilePhoto ?? undefined}
                alt={displayName}
              />
              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <p className="text-[13px] font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </DropdownMenuLabel>
          {availableRoles.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="py-1 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                Switch Role
              </DropdownMenuLabel>
              {availableRoles.map((r) => {
                const isActive = r.id === activeUserRoleId
                const isPending =
                  switchRoleMutation.isPending &&
                  switchRoleMutation.variables?.userRoleId === r.id
                return (
                  <DropdownMenuItem
                    key={r.id}
                    disabled={isActive || switchRoleMutation.isPending}
                    onSelect={() =>
                      switchRoleMutation.mutate(
                        { userRoleId: r.id },
                        {
                          onSuccess: () => {
                            pushToast(
                              `Successfully switched to ${r.name}.`,
                              "success"
                            )
                          },
                        }
                      )
                    }
                    className="cursor-pointer gap-2"
                  >
                    {isPending ? (
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        size={13}
                        strokeWidth={2}
                        className="animate-spin text-muted-foreground"
                      />
                    ) : isActive ? (
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        size={13}
                        strokeWidth={2}
                        className="text-primary"
                      />
                    ) : (
                      <HugeiconsIcon
                        icon={UserShield01Icon}
                        size={13}
                        strokeWidth={1.8}
                        className="text-muted-foreground/50"
                      />
                    )}
                    <span
                      className={cn(isActive && "font-medium text-foreground")}
                    >
                      {r.name}
                    </span>
                    {r.isTemporary && (
                      <Badge
                        variant="outline"
                        className="h-4 border-amber-300 bg-amber-50 px-1.5 text-[9px] font-semibold text-amber-700"
                      >
                        Temp
                      </Badge>
                    )}
                    {isActive && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        Active
                      </span>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <HugeiconsIcon
                icon={Setting06Icon}
                size={13}
                strokeWidth={1.8}
                className="mr-2"
              />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => logoutMutation.mutate()}
            className={cn(
              "cursor-pointer text-destructive focus:text-destructive"
            )}
          >
            <HugeiconsIcon
              icon={Logout01Icon}
              size={13}
              strokeWidth={1.8}
              className="mr-2"
            />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
