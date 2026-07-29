"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CalendarMinus01Icon, Alert01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToastStore } from "@/store/toast-store"
import {
  useLeavePolicies,
  useUpdateLeavePolicy,
} from "@/hooks/use-leave-policy"
import type {
  LeaveAccrualMode,
  LeavePolicy,
  LeaveTypeCode,
} from "@/lib/leave-policy-api"

const TYPE_LABEL: Record<LeaveTypeCode, string> = {
  VACATION: "Vacation",
  SICK: "Sick",
  EMERGENCY: "Emergency",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
}

const ACCRUAL_LABEL: Record<LeaveAccrualMode, string> = {
  UPFRONT: "All upfront",
  MONTHLY: "Monthly",
  NONE: "Not credited",
}

const ACCRUAL_HINT: Record<LeaveAccrualMode, string> = {
  UPFRONT: "Full entitlement available from day one.",
  MONTHLY: "Earned per completed month of service.",
  NONE: "No credit limit — statutory types are uncapped.",
}

/**
 * Company leave rules per type.
 *
 * Replaces a placeholder that displayed invented figures ("1.25 days/month", "10 days carry-over")
 * no code ever read. Every field here is honoured by the balance calculation — carry-over is
 * deliberately absent until a year-end job exists to apply it, rather than shipping another number
 * that does nothing.
 */
export function LeaveConfigSection() {
  const pushToast = useToastStore((s) => s.push)
  const { data: policies = [], isLoading } = useLeavePolicies()
  const updateMutation = useUpdateLeavePolicy()

  // Only unsaved edits are held in state, merged over server data at render. Copying the fetched
  // rows into state via an effect would mean two sources of truth and a sync to keep right.
  const [edits, setEdits] = useState<
    Partial<Record<LeaveTypeCode, Partial<LeavePolicy>>>
  >({})

  const resolved = (p: LeavePolicy): LeavePolicy => ({
    ...p,
    ...edits[p.leaveType],
  })

  function patch(type: LeaveTypeCode, changes: Partial<LeavePolicy>) {
    setEdits((prev) => ({ ...prev, [type]: { ...prev[type], ...changes } }))
  }

  async function save(type: LeaveTypeCode) {
    const original = policies.find((x) => x.leaveType === type)
    if (!original) return
    const p = resolved(original)
    try {
      await updateMutation.mutateAsync({
        leaveType: type,
        payload: {
          enabled: p.enabled,
          paid: p.paid,
          defaultCredits: p.defaultCredits,
          accrualMode: p.accrualMode,
          accrualStartsAfterMonths: p.accrualStartsAfterMonths,
        },
      })
      // Drop the local edit so the refetched row becomes the source of truth again.
      setEdits((prev) => ({ ...prev, [type]: undefined }))
      pushToast(`${TYPE_LABEL[type]} leave settings saved`, "success")
    } catch {
      // error surfaced by the API interceptor toast
    }
  }

  const dirty = (original: LeavePolicy) => {
    const current = resolved(original)
    return (
      original.enabled !== current.enabled ||
      original.paid !== current.paid ||
      original.defaultCredits !== current.defaultCredits ||
      original.accrualMode !== current.accrualMode ||
      original.accrualStartsAfterMonths !== current.accrualStartsAfterMonths
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <HugeiconsIcon icon={CalendarMinus01Icon} size={18} strokeWidth={1.8} />
          Leave settings
        </h3>
        <p className="mt-0.5 max-w-2xl text-[13px] text-muted-foreground">
          Company defaults per leave type. An employment contract that sets its own credits
          still wins — these fill the gap for everyone on the standard entitlement.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3">
        <HugeiconsIcon
          icon={Alert01Icon}
          size={15}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Carry-over isn&apos;t here yet — nothing rolls unused days into the next year, so
          adding the setting would be misleading. Balances reset each January.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((original) => {
            const type = original.leaveType
            const p = resolved(original)
            const isDirty = dirty(original)
            return (
              <div
                key={type}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-semibold">
                      {TYPE_LABEL[type] ?? type}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {p.enabled
                        ? ACCRUAL_HINT[p.accrualMode]
                        : "Disabled — employees can't file this type."}
                    </p>
                  </div>
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={(enabled) => patch(type, { enabled })}
                    aria-label={`Enable ${TYPE_LABEL[type]} leave`}
                  />
                </div>

                {p.enabled && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${type}-credits`}>Annual days</Label>
                      <Input
                        id={`${type}-credits`}
                        type="number"
                        min={0}
                        value={p.defaultCredits ?? ""}
                        placeholder="From contract"
                        onChange={(e) =>
                          patch(type, {
                            defaultCredits:
                              e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Blank = contract only
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`${type}-accrual`}>Accrual</Label>
                      <select
                        id={`${type}-accrual`}
                        value={p.accrualMode}
                        onChange={(e) =>
                          patch(type, {
                            accrualMode: e.target.value as LeaveAccrualMode,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[13px]"
                      >
                        {(
                          Object.keys(ACCRUAL_LABEL) as LeaveAccrualMode[]
                        ).map((mode) => (
                          <option key={mode} value={mode}>
                            {ACCRUAL_LABEL[mode]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`${type}-probation`}>
                        Starts after (months)
                      </Label>
                      <Input
                        id={`${type}-probation`}
                        type="number"
                        min={0}
                        value={p.accrualStartsAfterMonths}
                        onChange={(e) =>
                          patch(type, {
                            accrualStartsAfterMonths: Number(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        0 = from hire date
                      </p>
                    </div>
                  </div>
                )}

                {isDirty && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => void save(type)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
