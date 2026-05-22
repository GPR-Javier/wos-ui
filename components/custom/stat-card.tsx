import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: React.ReactNode
  delta?: string
  deltaUp?: boolean
  meta?: string
  icon?: React.ReactNode
  accent?: "blue" | "green" | "amber" | "red" | "purple" | "gray"
  className?: string
}

const accentBar: Record<string, string> = {
  blue: "bg-primary",
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-danger",
  purple: "bg-violet",
}

export function StatCard({
  title,
  value,
  delta,
  deltaUp,
  meta,
  icon,
  accent,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      {accent && (
        <div
          className={cn(
            "absolute top-0 left-0 h-full w-0.5 rounded-l-xl",
            accentBar[accent]
          )}
        />
      )}
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        {icon && (
          <span className="text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
            {icon}
          </span>
        )}
      </div>
      {/* div, not p — `value` may be a JSX node (e.g. Skeleton) which renders a div,
          and <div> is not a valid descendant of <p>. */}
      <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      {delta && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            deltaUp ? "text-success" : "text-danger"
          )}
        >
          <span>{deltaUp ? "↑" : "↓"}</span>
          {delta}
        </p>
      )}
      {meta && !delta && (
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
      )}
    </div>
  )
}
