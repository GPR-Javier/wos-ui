"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Notification01Icon, Calendar03Icon } from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSlugHref } from "@/lib/slug"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/hooks/use-notifications"
import type { AppNotification, NotificationType } from "@/lib/notification-api"

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 60) return "now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

// Calendar-ish events get a calendar glyph; everything else uses the bell.
const CALENDAR_TYPES: NotificationType[] = [
  "LEAVE_REQUESTED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "SCHEDULE_CHANGE",
]

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const slugHref = useSlugHref()
  const {
    unreadCount,
    notifications,
    isLoading,
    markRead,
    markAllRead,
    enabled,
  } = useNotifications()

  if (!enabled) return null

  const openNotification = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id)
    setOpen(false)
    if (n.linkUrl) router.push(slugHref(n.linkUrl))
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="notification-bell"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
          className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon
            icon={Notification01Icon}
            size={16}
            strokeWidth={1.8}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-[13px] font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              Loading…
            </p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
              <HugeiconsIcon
                icon={Notification01Icon}
                size={22}
                strokeWidth={1.6}
                className="text-muted-foreground/50"
              />
              <p className="text-[12px] text-muted-foreground">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                data-testid="notification-item"
                onClick={() => openNotification(n)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60",
                  !n.read && "bg-primary/4"
                )}
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <HugeiconsIcon
                    icon={
                      CALENDAR_TYPES.includes(n.type)
                        ? Calendar03Icon
                        : Notification01Icon
                    }
                    size={14}
                    strokeWidth={1.8}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="line-clamp-2 text-[11.5px] text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground/70">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
