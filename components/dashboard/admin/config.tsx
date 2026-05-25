"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Coins01Icon,
  Timer02Icon,
  CreditCardIcon,
  Calendar01Icon,
  TimeScheduleIcon,
  Setting06Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SchedulePoliciesSection } from "@/components/dashboard/admin/schedule-policies"
import { AttendanceConfigSection } from "@/components/dashboard/admin/attendance-config"
import {
  PayrollSchedule,
  DEFAULT_PAYROLL_CONFIG,
  type PayrollScheduleConfig,
  type PayType,
  type PayFrequency,
} from "@/components/dashboard/payroll/payroll-schedule"
import { useAuthStore } from "@/store/auth-store"

// ── PlaceholderSection ─────────────────────────────────────────────────────

interface PlaceholderItem { label: string; value: string; tag?: string }

function PlaceholderSection({ title, description, items }: {
  title: string; description: string; items: PlaceholderItem[]
}) {
  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        </div>
        <Button size="xs" variant="outline" disabled>Edit</Button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.value}</span>
              {item.tag && <StatusBadge variant="amber" dot={false}>{item.tag}</StatusBadge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── form helpers ───────────────────────────────────────────────────────────

function ordinal(n: number) {
  const s = ["th","st","nd","rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}


const WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

const MONTH_OPTIONS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
].map((m, i) => ({ value: String(i + 1), label: m }))

// Days 1–28 for cutoff (safe across all months)
const CUTOFF_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${ordinal(i + 1)} of each month`,
}))

// Days 1–31 + last day for payout
const PAYOUT_DAY_OPTIONS = [
  { value: "0", label: "Last day of month" },
  ...Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: `${ordinal(i + 1)} of each month`,
  })),
]

const WORKING_DAYS_OPTIONS = Array.from({ length: 7 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} day${i > 0 ? "s" : ""}`,
}))

function SmallSelect({ value, onChange, options, wide }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  wide?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-8 text-[12px] ${wide ? "w-56" : "w-48"}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── PayrollSettingsCard ────────────────────────────────────────────────────

const PAY_TYPES: { value: PayType; label: string; desc: string; icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]; color: string }[] = [
  { value: "fixed",      label: "Fixed Salary",     desc: "Standard monthly or bi-monthly pay",  icon: Coins01Icon,    color: "text-blue-500"   },
  { value: "daily",      label: "Daily Rate",        desc: "Paid per day worked",                  icon: Timer02Icon,    color: "text-green-500"  },
  { value: "commission", label: "Commission-based",  desc: "Base salary + % on sales or revenue",  icon: CreditCardIcon, color: "text-violet-500" },
]

const PAY_FREQS: { value: PayFrequency; label: string; sub: string }[] = [
  { value: "weekly",        label: "Weekly",       sub: "Every 7 days"     },
  { value: "semi-monthly",  label: "Semi-monthly", sub: "Every 15th"       },
  { value: "monthly",       label: "Monthly",      sub: "Once a month"     },
  { value: "yearly",        label: "Yearly",       sub: "Once a year"      },
]

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  )
}

function SummaryCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-[13px] font-semibold", accent ?? "text-foreground")}>{value}</p>
    </div>
  )
}

function PayrollSettingsCard({
  value, onChange,
}: {
  value: PayrollScheduleConfig
  onChange: (cfg: PayrollScheduleConfig) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PayrollScheduleConfig>(value)

  function startEdit() { setDraft(value); setEditing(true) }
  function save() { onChange(draft); setEditing(false) }
  function cancel() { setDraft(value); setEditing(false) }
  function set<K extends keyof PayrollScheduleConfig>(key: K, val: PayrollScheduleConfig[K]) {
    setDraft((p) => ({ ...p, [key]: val }))
  }
function setCommission<K extends keyof PayrollScheduleConfig["commission"]>(key: K, val: PayrollScheduleConfig["commission"][K]) {
    setDraft((p) => ({ ...p, commission: { ...p.commission, [key]: val } }))
  }

  const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
  const pd2 = value.payoutDay2 === 0 ? "Last day" : ordinal(value.payoutDay2)
  const mpd = value.monthPayoutDay === 0 ? "Last day" : ordinal(value.monthPayoutDay)

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* ── header ── */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <HugeiconsIcon icon={Setting06Icon} size={15} strokeWidth={1.8} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Payroll settings</p>
            <p className="text-[11px] text-muted-foreground">Compensation type, pay schedule &amp; overtime rules</p>
          </div>
        </div>
        {!editing ? (
          <Button size="xs" variant="outline" onClick={startEdit}>Edit settings</Button>
        ) : (
          <div className="flex gap-2">
            <Button size="xs" variant="ghost" onClick={cancel}>Cancel</Button>
            <Button size="xs" onClick={save}>Save changes</Button>
          </div>
        )}
      </div>

      <div className="p-5">
        {!editing ? (
          // ── view mode ─────────────────────────────────────────────────────
          <div className="space-y-4">
            {/* Type + Frequency hero row */}
            <div className="flex flex-wrap items-center gap-3">
              {(() => {
                const t = PAY_TYPES.find((p) => p.value === value.payType)!
                return (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <HugeiconsIcon icon={t.icon} size={14} strokeWidth={1.8} className={t.color} />
                    <span className="text-[13px] font-semibold text-foreground">{t.label}</span>
                  </div>
                )
              })()}
              {(() => {
                const f = PAY_FREQS.find((p) => p.value === value.payFrequency)!
                return (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <HugeiconsIcon icon={Calendar01Icon} size={14} strokeWidth={1.8} className="text-primary" />
                    <span className="text-[13px] font-semibold text-foreground">{f.label}</span>
                    <span className="text-[11px] text-muted-foreground">({f.sub})</span>
                  </div>
                )
              })()}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <span className="text-[12px] text-muted-foreground">OT</span>
                <span className="text-[13px] font-semibold text-foreground">{value.overtimeMultiplier.toFixed(2)}×</span>
              </div>
            </div>

            {/* Schedule summary grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {value.payFrequency === "semi-monthly" && (<>
                <SummaryCell label="Period 1 Cutoff" value={ordinal(value.cutoffDay1)} />
                <SummaryCell label="Period 1 Payout" value={ordinal(value.payoutDay1)} accent="text-green-500" />
                <SummaryCell label="Period 2 Cutoff" value={ordinal(value.cutoffDay2)} />
                <SummaryCell label="Period 2 Payout" value={pd2} accent="text-green-500" />
              </>)}
              {value.payFrequency === "weekly" && (<>
                <SummaryCell label="Cutoff Day" value={weekdays[value.weekCutoffDay]} />
                <SummaryCell label="Payout Day" value={weekdays[value.weekPayoutDay]} accent="text-green-500" />
              </>)}
              {value.payFrequency === "monthly" && (<>
                <SummaryCell label="Cutoff Day" value={ordinal(value.monthCutoffDay)} />
                <SummaryCell label="Payout Day" value={mpd} accent="text-green-500" />
              </>)}
              {value.payFrequency === "yearly" && (<>
                <SummaryCell label="Payout Month" value={MONTH_OPTIONS[value.yearPayoutMonth - 1]?.label ?? ""} />
                <SummaryCell label="Payout Day" value={ordinal(value.yearPayoutDay)} accent="text-green-500" />
              </>)}
            </div>

            {/* Type-specific summary */}
            {value.payType === "daily" && (
              <div className="grid grid-cols-2 gap-2">
                <SummaryCell label="Daily Rate" value={`₱${value.dailyRate.toLocaleString("en-PH")}`} accent="text-primary" />
                <SummaryCell label="Working Days / Week" value={`${value.workingDaysPerWeek} days`} />
              </div>
            )}
            {value.payType === "commission" && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryCell label="Base Salary" value={`₱${value.commission.baseSalary.toLocaleString("en-PH")}`} />
                <SummaryCell label="Commission Rate" value={`${value.commission.commissionRate}%`} accent="text-primary" />
                <SummaryCell label="Basis" value={{ per_sale: "Per sale", revenue_pct: "% revenue", per_unit: "Per unit" }[value.commission.commissionBasis]} />
                <SummaryCell label="Cap" value={value.commission.cap > 0 ? `₱${value.commission.cap.toLocaleString("en-PH")}` : "No cap"} />
              </div>
            )}
          </div>
        ) : (
          // ── edit mode ─────────────────────────────────────────────────────
          <div className="space-y-5">

            {/* ── 1. Compensation Type ─────────────────────────────────── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <HugeiconsIcon icon={Coins01Icon} size={13} strokeWidth={2} className="text-muted-foreground" />
                <p className="text-[12px] font-semibold text-foreground">Compensation Type</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("payType", t.value)}
                    className={cn(
                      "flex flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-all",
                      draft.payType === t.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      draft.payType === t.value ? "bg-primary/10" : "bg-muted",
                    )}>
                      <HugeiconsIcon icon={t.icon} size={14} strokeWidth={1.8} className={draft.payType === t.value ? "text-primary" : t.color} />
                    </div>
                    <div>
                      <p className={cn("text-[12px] font-semibold leading-tight", draft.payType === t.value ? "text-primary" : "text-foreground")}>
                        {t.label}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{t.desc}</p>
                    </div>
                    {draft.payType === t.value && (
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} strokeWidth={2} className="ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Compensation sub-fields ──────────────────────────────── */}
            {draft.payType === "daily" && (
              <SubCard title="Daily Rate Configuration">
                <FormRow label="Daily rate">
                  <span className="text-[12px] text-muted-foreground">₱</span>
                  <Input type="number" min={0} value={draft.dailyRate} onChange={(e) => set("dailyRate", Number(e.target.value))} className="h-8 w-32 text-[12px]" />
                  <span className="text-[12px] text-muted-foreground">per day</span>
                </FormRow>
                <FormRow label="Working days / week">
                  <SmallSelect value={String(draft.workingDaysPerWeek)} onChange={(v) => set("workingDaysPerWeek", Number(v))} options={WORKING_DAYS_OPTIONS} />
                </FormRow>
              </SubCard>
            )}


            {draft.payType === "commission" && (
              <SubCard title="Commission Configuration">
                <FormRow label="Base salary">
                  <span className="text-[12px] text-muted-foreground">₱</span>
                  <Input type="number" min={0} value={draft.commission.baseSalary} onChange={(e) => setCommission("baseSalary", Number(e.target.value))} className="h-8 w-32 text-[12px]" />
                </FormRow>
                <FormRow label="Commission rate">
                  <Input type="number" min={0} max={100} step={0.5} value={draft.commission.commissionRate} onChange={(e) => setCommission("commissionRate", Number(e.target.value))} className="h-8 w-24 text-[12px]" />
                  <span className="text-[12px] text-muted-foreground">%</span>
                </FormRow>
                <FormRow label="Commission basis">
                  <SmallSelect
                    value={draft.commission.commissionBasis}
                    onChange={(v) => setCommission("commissionBasis", v as "per_sale" | "revenue_pct" | "per_unit")}
                    options={[
                      { value: "per_sale", label: "Per sale" },
                      { value: "revenue_pct", label: "% of revenue" },
                      { value: "per_unit", label: "Per unit" },
                    ]}
                  />
                </FormRow>
                <FormRow label="Commission cap">
                  <span className="text-[12px] text-muted-foreground">₱</span>
                  <Input type="number" min={0} value={draft.commission.cap} onChange={(e) => setCommission("cap", Number(e.target.value))} className="h-8 w-32 text-[12px]" />
                  <span className="text-[12px] text-muted-foreground">(0 = no cap)</span>
                </FormRow>
              </SubCard>
            )}

            {/* ── 2. Pay Frequency ─────────────────────────────────────── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <HugeiconsIcon icon={Calendar01Icon} size={13} strokeWidth={2} className="text-muted-foreground" />
                <p className="text-[12px] font-semibold text-foreground">Pay Frequency</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAY_FREQS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => set("payFrequency", f.value)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                      draft.payFrequency === f.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    <p className={cn("text-[12px] font-semibold", draft.payFrequency === f.value ? "text-primary" : "text-foreground")}>{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.sub}</p>
                    {draft.payFrequency === f.value && (
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} strokeWidth={2} className="ml-auto text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Pay schedule detail ──────────────────────────────────── */}
            {draft.payFrequency === "weekly" && (
              <SubCard title="Weekly Schedule">
                <FormRow label="Cutoff day">
                  <SmallSelect value={String(draft.weekCutoffDay)} onChange={(v) => set("weekCutoffDay", Number(v))} options={WEEKDAY_OPTIONS} />
                </FormRow>
                <FormRow label="Payout day">
                  <SmallSelect value={String(draft.weekPayoutDay)} onChange={(v) => set("weekPayoutDay", Number(v))} options={WEEKDAY_OPTIONS} />
                </FormRow>
              </SubCard>
            )}

            {draft.payFrequency === "semi-monthly" && (
              <SubCard title="Semi-monthly Schedule">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormRow label="Period 1 cutoff">
                    <SmallSelect value={String(draft.cutoffDay1)} onChange={(v) => set("cutoffDay1", Number(v))} options={CUTOFF_DAY_OPTIONS} />
                  </FormRow>
                  <FormRow label="Period 1 payout">
                    <SmallSelect value={String(draft.payoutDay1)} onChange={(v) => set("payoutDay1", Number(v))} options={CUTOFF_DAY_OPTIONS} />
                  </FormRow>
                  <FormRow label="Period 2 cutoff">
                    <SmallSelect value={String(draft.cutoffDay2)} onChange={(v) => set("cutoffDay2", Number(v))} options={CUTOFF_DAY_OPTIONS} />
                  </FormRow>
                  <FormRow label="Period 2 payout">
                    <SmallSelect value={String(draft.payoutDay2)} onChange={(v) => set("payoutDay2", Number(v))} options={PAYOUT_DAY_OPTIONS} />
                  </FormRow>
                </div>
              </SubCard>
            )}

            {draft.payFrequency === "monthly" && (
              <SubCard title="Monthly Schedule">
                <FormRow label="Cutoff day">
                  <SmallSelect value={String(draft.monthCutoffDay)} onChange={(v) => set("monthCutoffDay", Number(v))} options={CUTOFF_DAY_OPTIONS} />
                </FormRow>
                <FormRow label="Payout day">
                  <SmallSelect value={String(draft.monthPayoutDay)} onChange={(v) => set("monthPayoutDay", Number(v))} options={PAYOUT_DAY_OPTIONS} />
                </FormRow>
              </SubCard>
            )}

            {draft.payFrequency === "yearly" && (
              <SubCard title="Yearly Schedule">
                <FormRow label="Payout month">
                  <SmallSelect value={String(draft.yearPayoutMonth)} onChange={(v) => set("yearPayoutMonth", Number(v))} options={MONTH_OPTIONS} />
                </FormRow>
                <FormRow label="Payout day">
                  <SmallSelect value={String(draft.yearPayoutDay)} onChange={(v) => set("yearPayoutDay", Number(v))} options={CUTOFF_DAY_OPTIONS} />
                </FormRow>
              </SubCard>
            )}

            {/* ── 3. Other Rules ───────────────────────────────────────── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <HugeiconsIcon icon={TimeScheduleIcon} size={13} strokeWidth={2} className="text-muted-foreground" />
                <p className="text-[12px] font-semibold text-foreground">Other Rules</p>
              </div>
              <SubCard title="Overtime">
                <FormRow label="Overtime multiplier">
                  <Input type="number" min={1} max={3} step={0.05} value={draft.overtimeMultiplier} onChange={(e) => set("overtimeMultiplier", Number(e.target.value))} className="h-8 w-24 text-center text-[12px]" />
                  <span className="text-[12px] text-muted-foreground">× hourly rate</span>
                </FormRow>
              </SubCard>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── ConfigSection ──────────────────────────────────────────────────────────

export function ConfigSection() {
  const canViewSchedulePolicy = useAuthStore((s) =>
    s.authorities.includes("SCHEDULE_POLICY:VIEW")
  )
  const canEditAttendance = useAuthStore((s) =>
    s.authorities.includes("CONFIGURATION:EDIT_ATTENDANCE_SETTINGS")
  )
  const canEditPayroll = useAuthStore((s) =>
    s.authorities.includes("CONFIGURATION:EDIT_PAYROLL_SETTINGS")
  )
  const canEditLeave = useAuthStore((s) =>
    s.authorities.includes("CONFIGURATION:EDIT_LEAVE_SETTINGS")
  )

  const defaultTab = useMemo(() => {
    if (canViewSchedulePolicy) return "schedule"
    if (canEditAttendance) return "attendance"
    if (canEditPayroll) return "payroll"
    if (canEditLeave) return "leave"
    return "schedule"
  }, [canViewSchedulePolicy, canEditAttendance, canEditPayroll, canEditLeave])

  const [payrollConfig, setPayrollConfig] = useState<PayrollScheduleConfig>(DEFAULT_PAYROLL_CONFIG)

  return (
    <Tabs defaultValue={defaultTab} className="gap-6">
      <TabsList variant="line" className="border-b border-border">
        {canViewSchedulePolicy && <TabsTrigger value="schedule">Schedule policy</TabsTrigger>}
        {canEditAttendance && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
        {canEditPayroll && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
        {canEditLeave && <TabsTrigger value="leave">Leave</TabsTrigger>}
      </TabsList>

      {canViewSchedulePolicy && (
        <TabsContent value="schedule" className="space-y-4">
          <div>
            <p className="text-[13px] font-semibold">Schedule policy</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Set the clock-in window, late grace, required hours, and workdays.
              Saves create a new immutable version — past attendance keeps its original snapshot.
            </p>
          </div>
          <SchedulePoliciesSection />
        </TabsContent>
      )}

      {canEditAttendance && (
        <TabsContent value="attendance">
          <AttendanceConfigSection />
        </TabsContent>
      )}

      {canEditPayroll && (
        <TabsContent value="payroll">
          <Tabs defaultValue="settings" className="gap-5">
            <TabsList variant="line" className="border-b border-border">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="forecast">Schedule & Forecast</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <PayrollSettingsCard value={payrollConfig} onChange={setPayrollConfig} />
            </TabsContent>

            <TabsContent value="forecast" className="space-y-1">
              <div>
                <p className="text-[13px] font-semibold">Schedule & Forecasting</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Calendar, upcoming pay periods, cash flow forecast, and 13th month tracker —
                  driven by the Payroll Settings tab.
                </p>
              </div>
              <PayrollSchedule config={payrollConfig} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      )}

      {canEditLeave && (
        <TabsContent value="leave">
          <PlaceholderSection
            title="Leave settings"
            description="Coming soon."
            items={[
              { label: "Vacation leave accrual", value: "1.25 days/month" },
              { label: "Sick leave accrual", value: "1.25 days/month" },
              { label: "Leave carry-over", value: "10 days max" },
            ]}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}
