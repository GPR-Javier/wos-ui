import { cn } from "@/lib/utils"

interface TableSkeletonProps {
  /** Number of placeholder rows to render (default 5). */
  rows?: number
  /** Height utility for each row bar (default "h-12"). */
  rowClassName?: string
  className?: string
}

/**
 * Consistent loading placeholder for tables and lists — a stack of pulsing bars. Replaces the
 * per-screen inline `[1,2,3].map(... animate-pulse ...)` loaders so loading states look the same
 * across the app.
 */
export function TableSkeleton({
  rows = 5,
  rowClassName,
  className,
}: TableSkeletonProps) {
  return (
    <div
      className={cn("space-y-2", className)}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse rounded-xl bg-muted",
            rowClassName ?? "h-12"
          )}
        />
      ))}
    </div>
  )
}
