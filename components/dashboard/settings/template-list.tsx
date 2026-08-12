"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  File01Icon,
  Mail01Icon,
  MoneyBag02Icon,
  PaintBoardIcon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useSlug, useSlugHref } from "@/lib/slug"
import { templateApi } from "@/lib/template-api"
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type EmailCategory,
  type ResolvedTemplate,
  type TemplateKind,
} from "@/lib/template-types"

/**
 * The template list for one Communications tab. `kind` scopes the fetch, `tab` is the config tab
 * value the edit links carry so the editor can send the user back where they came from.
 */
export function TemplateListSection({
  kind,
  tab,
  title,
  description,
  /** Emails can be switched off per company; a payslip format has nothing to switch off. */
  toggleable = true,
}: {
  kind: TemplateKind
  tab: string
  title: string
  description: string
  toggleable?: boolean
}) {
  const slug = useSlug()
  const slugHref = useSlugHref()
  const [items, setItems] = useState<ResolvedTemplate[] | null>(null)

  // Keyed on slug so switching company refetches; the company itself comes from the session.
  // `kind` is fixed per instance (each Communications tab mounts its own panel), but it belongs in
  // the deps so this stays correct if that ever changes.
  useEffect(() => {
    templateApi.list(kind).then(setItems)
  }, [slug, kind])

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
    await templateApi.setEnabled(key, enabled)
  }

  const grouped = (cat: EmailCategory) =>
    items?.filter((it) => it.template.category === cat) ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      <Separator />

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
                        `/dashboard/config?tab=${tab}&sub=${it.template.key}`
                      )}
                      toggleable={toggleable}
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

const KIND_ICON: Record<TemplateKind, typeof Mail01Icon> = {
  EMAIL: Mail01Icon,
  DOCUMENT: File01Icon,
  PAYSLIP: MoneyBag02Icon,
}

function TemplateRow({
  item,
  first,
  editHref,
  toggleable,
  onToggle,
}: {
  item: ResolvedTemplate
  first: boolean
  editHref: string
  toggleable: boolean
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
        <HugeiconsIcon
          icon={KIND_ICON[template.kind]}
          size={17}
          strokeWidth={1.8}
        />
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
        {toggleable && (
          <Switch
            checked={config.enabled}
            onCheckedChange={onToggle}
            aria-label={`Enable ${template.name}`}
          />
        )}
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
