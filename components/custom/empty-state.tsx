import { cn } from "@/lib/utils"

interface EmptyStateProps {
  /** Primary line — what's missing (e.g. "No requests yet"). */
  title: string
  /** Optional secondary line with guidance. */
  description?: string
  /** Optional leading icon (e.g. a <HugeiconsIcon />). */
  icon?: React.ReactNode
  /** Optional call-to-action (e.g. a Button) rendered below the text. */
  action?: React.ReactNode
  className?: string
}

/**
 * Consistent empty-state placeholder for tables, lists and panels. Replaces the per-screen inline
 * `border border-dashed … text-center` blocks so spacing, typography and tone match everywhere.
 * Override padding/size with {@link className} for tight contexts.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className
      )}
    >
      {icon && <div className="mb-3 text-muted-foreground/60">{icon}</div>}
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
