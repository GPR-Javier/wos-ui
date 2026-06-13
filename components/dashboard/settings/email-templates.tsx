"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Mail01Icon,
  PaintBoardIcon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useSlug, useSlugHref } from "@/lib/slug"
import { emailTemplateApi } from "@/lib/email-template-api"
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type EmailCategory,
  type ResolvedTemplate,
} from "@/lib/email-template-types"

export function EmailTemplatesSection() {
  const slug = useSlug()
  const slugHref = useSlugHref()
  const [items, setItems] = useState<ResolvedTemplate[] | null>(null)

  useEffect(() => {
    emailTemplateApi.list(slug).then(setItems)
  }, [slug])

  const toggleEnabled = async (key: string, enabled: boolean) => {
    setItems((prev) =>
      prev
        ? prev.map((it) =>
            it.template.key === key
              ? { ...it, config: { ...it.config, enabled } }
              : it
          )
        : prev
    )
    await emailTemplateApi.setEnabled(slug, key, enabled)
  }

  const grouped = (cat: EmailCategory) =>
    items?.filter((it) => it.template.category === cat) ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold">Email templates</h3>
        <p className="text-[13px] text-muted-foreground">
          Customize the emails your company sends. Each template starts from a
          system default — drag and drop to make it yours.
        </p>
      </div>
      <Separator />

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map((cat) => {
            const rows = grouped(cat)
            if (rows.length === 0) return null
            return (
              <div key={cat} className="space-y-3">
                <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {CATEGORY_LABEL[cat]}
                </h4>
                <div className="overflow-hidden rounded-xl border border-border">
                  {rows.map((it, i) => (
                    <TemplateRow
                      key={it.template.key}
                      item={it}
                      first={i === 0}
                      editHref={slugHref(
                        `/dashboard/config?tab=email&sub=${it.template.key}`
                      )}
                      onToggle={(v) => toggleEnabled(it.template.key, v)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TemplateRow({
  item,
  first,
  editHref,
  onToggle,
}: {
  item: ResolvedTemplate
  first: boolean
  editHref: string
  onToggle: (enabled: boolean) => void
}) {
  const { template, config, customized } = item
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40",
        !first && "border-t border-border"
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <HugeiconsIcon icon={Mail01Icon} size={17} strokeWidth={1.8} />
      </div>

      <Link href={editHref} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium">{template.name}</p>
          {customized ? (
            <Badge variant="secondary" className="gap-1">
              <HugeiconsIcon icon={PaintBoardIcon} size={11} strokeWidth={2} />
              Customized
            </Badge>
          ) : (
            <Badge variant="outline">Default</Badge>
          )}
          {template.isMarketing && (
            <Badge variant="outline" className="text-[10px]">
              Marketing
            </Badge>
          )}
        </div>
        <p className="truncate text-[12px] text-muted-foreground">
          {template.description}
        </p>
      </Link>

      <div
        className="flex items-center gap-3"
        // Stop the row link from firing when toggling.
        onClick={(e) => e.stopPropagation()}
      >
        <Switch
          checked={config.enabled}
          onCheckedChange={onToggle}
          aria-label={`Enable ${template.name}`}
        />
        <Link
          href={editHref}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Customize
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
        </Link>
      </div>
    </div>
  )
}
