"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useOvertimeRates,
  useUpdateOvertimeRates,
} from "@/hooks/use-overtime-rates"
import { OT_TYPE_LABEL, type OvertimeType } from "@/lib/overtime-api"

// Grouped for readability — each row is one configurable multiplier.
const GROUPS: { title: string; note: string; types: OvertimeType[] }[] = [
  {
    title: "Ordinary day",
    note: "Overtime beyond the standard hours on a normal workday.",
    types: ["REGULAR", "EMERGENCY"],
  },
  {
    title: "Rest day",
    note: "Work on a scheduled rest day, and overtime beyond the standard hours.",
    types: ["REST_DAY", "REST_DAY_OT"],
  },
  {
    title: "Regular holiday",
    note: "Legal holidays (e.g. Independence Day, Christmas).",
    types: [
      "REGULAR_HOLIDAY",
      "REGULAR_HOLIDAY_OT",
      "REGULAR_HOLIDAY_REST_DAY",
      "REGULAR_HOLIDAY_REST_DAY_OT",
    ],
  },
  {
    title: "Special non-working day",
    note: "Special holidays (e.g. Ninoy Aquino Day, All Saints' Day).",
    types: [
      "SPECIAL_HOLIDAY",
      "SPECIAL_HOLIDAY_OT",
      "SPECIAL_HOLIDAY_REST_DAY",
      "SPECIAL_HOLIDAY_REST_DAY_OT",
    ],
  },
]

export function PayRatesSection() {
  const { data: rates = [], isLoading } = useOvertimeRates()
  const updateMut = useUpdateOvertimeRates()

  // Defaults keyed by type, for the "reset" affordance + dirty comparison.
  const defaults = useMemo(() => {
    const m: Partial<Record<OvertimeType, number>> = {}
    for (const r of rates) m[r.overtimeType] = r.defaultMultiplier
    return m
  }, [rates])

  // Only the rows the admin has actually typed into; everything else shows the server value. Keeping
  // edits separate (rather than seeding all values from a server effect) avoids set-state-in-effect.
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)

  const serverValue = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of rates) m[r.overtimeType] = r.multiplier
    return m
  }, [rates])

  const displayed = (type: OvertimeType): string =>
    edited[type] ?? (serverValue[type] != null ? String(serverValue[type]) : "")

  const dirty = useMemo(
    () =>
      Object.entries(edited).some(([type, v]) => {
        const n = parseFloat(v)
        return !isNaN(n) && n !== serverValue[type]
      }),
    [edited, serverValue]
  )

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function reset(type: OvertimeType) {
    const d = defaults[type]
    if (d != null) setEdited((v) => ({ ...v, [type]: String(d) }))
  }

  function resetAll() {
    setEdited(
      Object.fromEntries(
        rates.map((r) => [r.overtimeType, String(r.defaultMultiplier)])
      )
    )
  }

  function handleSave() {
    const payload = {
      rates: rates.map((r) => ({
        overtimeType: r.overtimeType,
        multiplier: parseFloat(
          displayed(r.overtimeType) || String(r.multiplier)
        ),
      })),
    }
    if (payload.rates.some((r) => isNaN(r.multiplier) || r.multiplier <= 0)) {
      showToast("Every multiplier must be a number greater than 0.", "error")
      return
    }
    updateMut.mutate(payload, {
      onSuccess: () => {
        setEdited({})
        showToast("Pay rates saved.", "success")
      },
      onError: () => showToast("Failed to save pay rates.", "error"),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">
            Overtime &amp; Premium Pay Rates
          </p>
          <p className="mt-0.5 max-w-xl text-[12px] text-muted-foreground">
            Set the pay multiplier applied to the hourly rate for each kind of
            premium work. These drive how filed overtime is valued and how
            payroll computes premium pay. Leave a row at its default to follow
            the statutory PH rate.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            disabled={isLoading || updateMut.isPending}
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            Reset all
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || updateMut.isPending}
          >
            <HugeiconsIcon
              icon={FloppyDiskIcon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            {updateMut.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex justify-end">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-md",
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            )}
          >
            <HugeiconsIcon
              icon={
                toast.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon
              }
              size={14}
              strokeWidth={2}
            />
            {toast.msg}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((group) => (
            <div
              key={group.title}
              className="overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              <div className="border-b bg-muted/40 px-4 py-2.5">
                <p className="text-[12px] font-semibold">{group.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {group.note}
                </p>
              </div>
              <div className="divide-y divide-border/60">
                {group.types.map((type) => {
                  const def = defaults[type]
                  const val = displayed(type)
                  const parsed = parseFloat(val)
                  const isCustom =
                    def != null && !isNaN(parsed) && parsed !== def
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium">
                            {OT_TYPE_LABEL[type]}
                          </p>
                          {isCustom && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Customised
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Default ×{def?.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-muted-foreground">
                          ×
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          value={val}
                          onChange={(e) =>
                            setEdited((v) => ({ ...v, [type]: e.target.value }))
                          }
                          className="h-9 w-24 text-right text-[13px] tabular-nums"
                        />
                      </div>

                      <button
                        type="button"
                        title="Reset to default"
                        onClick={() => reset(type)}
                        disabled={!isCustom}
                        className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                      >
                        <HugeiconsIcon
                          icon={RefreshIcon}
                          size={12}
                          strokeWidth={2}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
