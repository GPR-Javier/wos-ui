export function ComingSoon({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="flex h-[calc(100vh-5rem)] items-center justify-center p-6">
      <div className="text-center">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
        )}
        <p className="mt-3 text-[12px] text-muted-foreground/60">Coming soon</p>
      </div>
    </div>
  )
}
