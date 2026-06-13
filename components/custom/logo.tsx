import { cn } from "@/lib/utils"

interface LogoProps {
  showText?: boolean
  size?: "sm" | "md"
  className?: string
  // Optional company-branding overrides. When provided, the uploaded mark + name
  // replace the default WorkOS logo (callers fetch branding and pass these in;
  // Logo itself stays presentational so it's safe in server components).
  iconSrc?: string | null
  name?: string | null
}

export function Logo({
  showText = true,
  size = "md",
  className,
  iconSrc,
  name,
}: LogoProps) {
  const boxSize = size === "sm" ? "size-7" : "size-[30px]"
  const textSize = size === "sm" ? "text-sm" : "text-[15px]"
  const label = name || "WorkOS"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          boxSize,
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
          iconSrc ? "bg-muted" : "bg-primary"
        )}
      >
        {iconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconSrc}
            alt={`${label} logo`}
            className="size-full object-cover"
          />
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white" />
              <rect
                x="9"
                y="2"
                width="5"
                height="5"
                rx="1.5"
                fill="white"
                opacity=".7"
              />
              <rect
                x="2"
                y="9"
                width="5"
                height="5"
                rx="1.5"
                fill="white"
                opacity=".7"
              />
              <rect
                x="9"
                y="9"
                width="5"
                height="5"
                rx="1.5"
                fill="white"
                opacity=".4"
              />
            </svg>
            <div className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-cyan-400 opacity-70" />
          </>
        )}
      </div>
      {showText && (
        <span
          className={cn(textSize, "font-bold tracking-tight text-foreground")}
        >
          {label}
        </span>
      )}
    </div>
  )
}
