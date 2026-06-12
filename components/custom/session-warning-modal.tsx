"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Clock01Icon,
  Logout01Icon,
  ShieldUserIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useInactivity } from "@/hooks/use-inactivity"
import { useLogout } from "@/hooks/use-auth"
import { authApi } from "@/lib/auth-api"
import { useSlug } from "@/lib/slug"

function fmtCountdown(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function SessionWarningModal() {
  const { phase, countdown, dismiss } = useInactivity()
  const slug = useSlug()
  const logoutMutation = useLogout()
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-logout when grace period expires
  useEffect(() => {
    if (phase === "expired") {
      logoutMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (phase === "active") return null

  const isExpired = phase === "expired"
  const pctLeft = (countdown / 120) * 100 // 120 s = 2 min grace

  async function handleStayLoggedIn() {
    setError(null)
    setRefreshing(true)
    try {
      await authApi.refresh() // browser sends refresh_token cookie automatically; server rotates access_token
      dismiss()
    } catch {
      setError("Failed to refresh session. Please log in again.")
    } finally {
      setRefreshing(false)
    }
  }

  function handleLogout() {
    logoutMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm animate-in rounded-2xl border border-border bg-card shadow-2xl duration-200 zoom-in-95 fade-in">
        {/* Header strip */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-t-2xl px-6 py-4",
            isExpired ? "bg-danger-light" : "bg-warning/10"
          )}
        >
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              isExpired ? "bg-danger/10" : "bg-warning/15"
            )}
          >
            <HugeiconsIcon
              icon={Clock01Icon}
              size={20}
              strokeWidth={1.8}
              className={isExpired ? "text-danger" : "text-warning"}
            />
          </div>
          <div>
            <h2
              className={cn(
                "text-[14px] font-semibold",
                isExpired ? "text-danger" : "text-warning"
              )}
            >
              {isExpired ? "Session expired" : "Session expiring soon"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {isExpired
                ? "You have been logged out due to inactivity"
                : "You've been inactive for 15 minutes"}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {!isExpired && (
            <>
              {/* Countdown ring */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex size-24 items-center justify-center">
                  <svg
                    className="absolute inset-0 -rotate-90"
                    width="96"
                    height="96"
                  >
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      fill="none"
                      stroke={
                        countdown <= 30
                          ? "var(--red, #ef4444)"
                          : "var(--warning, #f59e0b)"
                      }
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - pctLeft / 100)}
                      style={{
                        transition: "stroke-dashoffset 1s linear, stroke 0.5s",
                      }}
                    />
                  </svg>
                  <div className="text-center">
                    <p
                      className={cn(
                        "text-2xl leading-none font-bold tabular-nums",
                        countdown <= 30 ? "text-danger" : "text-warning"
                      )}
                    >
                      {fmtCountdown(countdown)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      remaining
                    </p>
                  </div>
                </div>
                <p className="text-center text-[13px] text-muted-foreground">
                  Your session will automatically expire and you&apos;ll be
                  logged out.
                </p>
              </div>

              {error && (
                <p className="rounded-lg border border-danger-border bg-danger-light px-3 py-2 text-[12px] text-danger">
                  {error}
                </p>
              )}
            </>
          )}

          {/* Actions */}
          {isExpired ? (
            <Button
              className="w-full gap-2"
              onClick={() => {
                window.location.href = `/${slug}/login`
              }}
            >
              <HugeiconsIcon icon={ShieldUserIcon} size={14} strokeWidth={2} />
              Go to login
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 border-danger-border text-danger hover:bg-danger-light"
                disabled={logoutMutation.isPending || refreshing}
                onClick={handleLogout}
              >
                <HugeiconsIcon icon={Logout01Icon} size={13} strokeWidth={2} />
                Logout
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={refreshing || logoutMutation.isPending}
                onClick={handleStayLoggedIn}
              >
                <HugeiconsIcon
                  icon={ShieldUserIcon}
                  size={13}
                  strokeWidth={2}
                />
                {refreshing ? "Refreshing…" : "Stay logged in"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
