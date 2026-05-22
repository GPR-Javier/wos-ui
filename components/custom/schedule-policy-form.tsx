"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { SchedulePolicyPayload, Weekday } from "@/lib/schedule-policy-api"

const WEEKDAYS: { code: Weekday; label: string }[] = [
  { code: "MON", label: "Mon" },
  { code: "TUE", label: "Tue" },
  { code: "WED", label: "Wed" },
  { code: "THU", label: "Thu" },
  { code: "FRI", label: "Fri" },
  { code: "SAT", label: "Sat" },
  { code: "SUN", label: "Sun" },
]

export interface SchedulePolicyFormValue {
  payload: SchedulePolicyPayload
  note: string
}

interface Props {
  value: SchedulePolicyFormValue
  onChange: (next: SchedulePolicyFormValue) => void
  showNote?: boolean
}

/**
 * Shared editor for a {@link SchedulePolicyPayload}. Used by:
 *   - admin policy editor (org/role/user)
 *   - employee change-request modal (without the note field)
 */
export function SchedulePolicyForm({
  value,
  onChange,
  showNote = true,
}: Props) {
  const p = value.payload
  const set = (patch: Partial<SchedulePolicyPayload>) =>
    onChange({ ...value, payload: { ...p, ...patch } })

  const toggleDay = (d: Weekday) => {
    const current = p.workdays ?? []
    const next = current.includes(d)
      ? current.filter((w) => w !== d)
      : [...current, d]
    set({ workdays: next })
  }

  return (
    <div className="space-y-4">
      {/* ── Clock-in window ───────────────────────────────────────── */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Clock-in window
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Earliest</Label>
            <Input
              type="time"
              className="h-9 text-[13px]"
              value={p.earliestClockIn ?? ""}
              onChange={(e) =>
                set({ earliestClockIn: e.target.value || undefined })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Latest (on-time)</Label>
            <Input
              type="time"
              className="h-9 text-[13px]"
              value={p.latestClockIn ?? ""}
              onChange={(e) =>
                set({ latestClockIn: e.target.value || undefined })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-[12px]">
              Late grace (minutes after latest before status flips to late)
            </Label>
            <Input
              type="number"
              min={0}
              max={120}
              className="h-9 text-[13px]"
              value={p.lateGraceMins ?? ""}
              onChange={(e) =>
                set({
                  lateGraceMins:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      </section>

      {/* ── Clock-out window ──────────────────────────────────────── */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Clock-out window
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Earliest acceptable</Label>
            <Input
              type="time"
              className="h-9 text-[13px]"
              value={p.earliestClockOut ?? ""}
              onChange={(e) =>
                set({ earliestClockOut: e.target.value || undefined })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Latest</Label>
            <Input
              type="time"
              className="h-9 text-[13px]"
              value={p.latestClockOut ?? ""}
              onChange={(e) =>
                set({ latestClockOut: e.target.value || undefined })
              }
            />
          </div>
        </div>
      </section>

      {/* ── Required hours ─────────────────────────────────────────── */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Required hours
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Hours / day</Label>
            <Input
              type="number"
              min={1}
              max={24}
              className="h-9 text-[13px]"
              value={p.requiredHours ?? ""}
              onChange={(e) =>
                set({
                  requiredHours:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Undertime grace (mins)</Label>
            <Input
              type="number"
              min={0}
              max={120}
              className="h-9 text-[13px]"
              value={p.undertimeGraceMins ?? ""}
              onChange={(e) =>
                set({
                  undertimeGraceMins:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      </section>

      {/* ── Workdays ──────────────────────────────────────────────── */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Workdays
        </p>
        <div className="flex gap-1.5">
          {WEEKDAYS.map((d) => {
            const on = (p.workdays ?? []).includes(d.code)
            return (
              <button
                key={d.code}
                type="button"
                onClick={() => toggleDay(d.code)}
                className={cn(
                  "h-8 flex-1 rounded-md border text-[12px] font-medium transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                )}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Timezone ───────────────────────────────────────────────── */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Timezone
        </p>
        <Input
          className="h-9 text-[13px]"
          placeholder="Asia/Manila"
          value={p.timezone ?? ""}
          onChange={(e) => set({ timezone: e.target.value || undefined })}
        />
      </section>

      {/* ── Note (admin only) ─────────────────────────────────────── */}
      {showNote && (
        <section className="space-y-1.5">
          <Label className="text-[12px]">Change note (audit trail)</Label>
          <Textarea
            className="min-h-16 resize-none text-[13px]"
            placeholder="Why are you making this change? Stored against the version row."
            value={value.note}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          />
        </section>
      )}
    </div>
  )
}
