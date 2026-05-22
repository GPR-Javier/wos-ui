"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert01Icon,
  CheckmarkCircle01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { useToastStore } from "@/store/toast-store"
import { cn } from "@/lib/utils"

export function AppToaster() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-100 flex w-[min(92vw,28rem)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto animate-in rounded-xl border px-4 py-3 text-[13px] shadow-xl duration-200 fade-in-0 slide-in-from-right-6",
            toast.type === "success" &&
              "border-emerald-300 bg-emerald-50 text-emerald-900",
            toast.type === "error" && "border-red-300 bg-red-50 text-red-900",
            toast.type === "info" && "border-border bg-card text-foreground"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5 pr-1">
              {toast.type === "success" && (
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />
              )}
              {toast.type === "error" && (
                <HugeiconsIcon
                  icon={Alert01Icon}
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-red-700"
                />
              )}
              {toast.type === "info" && (
                <HugeiconsIcon
                  icon={InformationCircleIcon}
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
              )}
              <span className="leading-snug font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="inline-flex size-6 items-center justify-center rounded-md text-[12px] opacity-70 transition hover:bg-black/5 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
