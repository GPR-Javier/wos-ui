"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  LEAVE_TYPES,
  activeLeaveTypes,
  monthlyRate,
  type LeaveCredits,
  type LeaveTypeKey,
} from "@/lib/contract-api"

interface Props {
  value: LeaveCredits
  onChange: (next: LeaveCredits) => void
  /**
   * Company defaults from Config → Leave, keyed the same way as {@link LeaveCredits}.
   *
   * Shown as placeholders rather than pre-filled values, because a blank field genuinely
   * *inherits*: the backend falls back to the company policy when a contract leaves the number
   * unset. Pre-filling would bake today's default into the contract and sever that link, so a
   * later change to the company standard wouldn't reach this employee.
   */
  policyDefaults?: Partial<Record<LeaveTypeKey, number | null>>
}

function fmtRate(annual?: number | null) {
  const r = monthlyRate(annual)
  return r % 1 === 0 ? String(r) : r.toFixed(1)
}

/**
 * Shared editor for a contract's {@link LeaveCredits}: flexi-vs-dedicated toggle,
 * monthly-accrual toggle, and the per-pool annual entitlement inputs.
 * Used by the contract form and the employment-offer modal.
 */
export function LeaveCreditsForm({ value, onChange, policyDefaults }: Props) {
  const accrue = !!value.accrueMonthly

  const setNum = (k: LeaveTypeKey, v: string) =>
    onChange({ ...value, [k]: v === "" ? null : Number(v) })

  const setUseFlexi = (on: boolean) =>
    onChange(
      on
        ? {
            ...value,
            useFlexi: true,
            sick: null,
            vacation: null,
            emergency: null,
          }
        : { ...value, useFlexi: false, flexi: null }
    )

  const setAccrue = (on: boolean) => onChange({ ...value, accrueMonthly: on })

  const fields = activeLeaveTypes(value)

  return (
    <div className="space-y-4">
      {/* Flexi toggle */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-[12px] font-medium">
            Use Flexi Leave (single pool)
          </Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {value.useFlexi
              ? "One flexible pool covers all leave kinds."
              : "Separate Sick / Vacation / Emergency balances."}
          </p>
        </div>
        <Switch checked={!!value.useFlexi} onCheckedChange={setUseFlexi} />
      </div>

      {/* Accrual toggle */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-[12px] font-medium">Accrue monthly</Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {accrue
              ? "Earned gradually each month (rate = annual ÷ 12)."
              : "Full annual entitlement granted upon hire."}
          </p>
        </div>
        <Switch checked={accrue} onCheckedChange={setAccrue} />
      </div>

      {/* Per-pool annual entitlement */}
      <div className="grid grid-cols-2 gap-3">
        {fields.map((lt) => {
          const annual = value[lt.key]
          const fallback = policyDefaults?.[lt.key]
          const inheriting = annual == null && fallback != null
          return (
            <div key={lt.key} className="space-y-1">
              <Label className="text-[12px]">{lt.label} (days / year)</Label>
              <Input
                type="number"
                min={0}
                className="h-9 text-[13px]"
                placeholder={fallback != null ? String(fallback) : "—"}
                value={annual ?? ""}
                onChange={(e) => setNum(lt.key, e.target.value)}
              />
              {inheriting ? (
                <p className="text-[10px] text-muted-foreground">
                  Inherits {fallback} days from company settings
                </p>
              ) : (
                accrue &&
                annual != null &&
                annual > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {fmtRate(annual)} days/month
                  </p>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Re-export for callers that only need the labels list. */
export { LEAVE_TYPES }
