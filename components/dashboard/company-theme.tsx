"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "@/components/custom/status-badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Tick02Icon,
  ReloadIcon,
  Login01Icon,
  Logout01Icon,
  Camera01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

// A company's color/shape theme. Drives the accent (--primary & friends) and the
// corner radius via scoped CSS variables. Kept local for now — it'll be persisted
// alongside the image branding once the company_branding model lands.
export interface BrandTheme {
  accent: string // any CSS color (oklch preset or hex from the picker)
  radius: number // base radius in px (--r); card/overlay radii derive from it
}

// Default = the app's stock brand blue + 8px radius (see app/globals.css).
export const DEFAULT_THEME: BrandTheme = {
  accent: "oklch(0.514 0.232 262.5)",
  radius: 8,
}

const ACCENTS: { name: string; value: string }[] = [
  { name: "Blue", value: "oklch(0.514 0.232 262.5)" },
  { name: "Violet", value: "oklch(0.541 0.245 293)" },
  { name: "Cyan", value: "oklch(0.620 0.130 211)" },
  { name: "Emerald", value: "oklch(0.600 0.150 156)" },
  { name: "Amber", value: "oklch(0.720 0.170 65)" },
  { name: "Rose", value: "oklch(0.620 0.220 17)" },
  { name: "Orange", value: "oklch(0.670 0.190 41)" },
  { name: "Slate", value: "oklch(0.480 0.040 257)" },
]

const RADII: { name: string; value: number }[] = [
  { name: "None", value: 0 },
  { name: "Small", value: 4 },
  { name: "Default", value: 8 },
  { name: "Large", value: 12 },
  { name: "XL", value: 16 },
]

// CSS variables that retint the accent + radius for any subtree they're set on.
// Radius scales proportionally (the app's stock 8/12/16 ratio) so "None" is truly
// square and larger steps round every component — including Card/Button (rounded-4xl)
// and Input (rounded-3xl), which derive from --rxl.
export function themeVars(theme: BrandTheme): React.CSSProperties {
  return {
    "--primary": theme.accent,
    "--ring": theme.accent,
    "--sidebar-primary": theme.accent,
    "--chart-1": theme.accent,
    "--r": `${theme.radius}px`,
    "--rl": `${theme.radius * 1.5}px`,
    "--rxl": `${theme.radius * 2}px`,
    "--radius": `${theme.radius}px`,
  } as React.CSSProperties
}

interface Props {
  theme: BrandTheme
  onChange: (next: BrandTheme) => void
  canEdit: boolean
}

export function CompanyTheme({ theme, onChange, canEdit }: Props) {
  const [showcaseOpen, setShowcaseOpen] = useState(false)
  const isCustom = !ACCENTS.some((a) => a.value === theme.accent)

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* ── Controls ── */}
      <div className="space-y-5">
        {/* Accent color */}
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
            Accent color
          </p>
          <div className="grid grid-cols-4 gap-2">
            {ACCENTS.map((a) => {
              const active = a.value === theme.accent
              return (
                <button
                  key={a.name}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onChange({ ...theme, accent: a.value })}
                  title={a.name}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg ring-1 ring-border transition-transform disabled:cursor-not-allowed disabled:opacity-60",
                    canEdit && "hover:scale-105",
                    active && "ring-2 ring-foreground"
                  )}
                  style={{ backgroundColor: a.value }}
                >
                  {active && (
                    <HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2.5} className="text-white" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Custom color */}
          <div className="mt-2 flex items-center gap-2">
            <label
              className={cn(
                "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border",
                isCustom && "ring-2 ring-foreground",
                !canEdit && "opacity-60"
              )}
              style={{ backgroundColor: isCustom ? theme.accent : "transparent" }}
            >
              <input
                type="color"
                disabled={!canEdit}
                value={isCustom ? toHex(theme.accent) : "#2563eb"}
                onChange={(e) => onChange({ ...theme, accent: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              {!isCustom && (
                <span className="text-[15px] leading-none text-muted-foreground">+</span>
              )}
            </label>
            <Input
              value={theme.accent}
              disabled={!canEdit}
              onChange={(e) => onChange({ ...theme, accent: e.target.value })}
              className="h-9 font-mono text-[12px]"
              aria-label="Custom accent color"
            />
          </div>
        </div>

        {/* Radius */}
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
            Radius
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {RADII.map((r) => (
              <button
                key={r.name}
                type="button"
                disabled={!canEdit}
                onClick={() => onChange({ ...theme, radius: r.value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border border-border py-2 text-[10.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  theme.radius === r.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span
                  className="size-5 border-2 border-current border-r-transparent border-b-transparent"
                  style={{ borderTopLeftRadius: `${r.value}px` }}
                />
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[12px] text-muted-foreground"
            onClick={() => onChange(DEFAULT_THEME)}
          >
            <HugeiconsIcon icon={ReloadIcon} size={13} strokeWidth={2} className="mr-1.5" />
            Reset to default
          </Button>
        )}
      </div>

      {/* ── Live preview ── */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
            Preview
          </p>
          <button
            type="button"
            onClick={() => setShowcaseOpen(true)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            View detailed preview →
          </button>
        </div>
        <DevicePreview theme={theme} />
      </div>

      {/* Detailed component gallery */}
      <Dialog open={showcaseOpen} onOpenChange={setShowcaseOpen}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-5xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Detailed preview</DialogTitle>
            <DialogDescription>
              A sample of components themed with your accent and radius.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(88vh-5rem)] overflow-y-auto bg-muted/30 p-6">
            <ThemeShowcase theme={theme} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Device family (laptop + tablet + phone) showing the dashboard re-tinted live by
// the theme — fills the preview width and shows responsive behavior.
function DevicePreview({ theme }: { theme: BrandTheme }) {
  return (
    <div
      style={themeVars(theme)}
      className="flex flex-wrap items-end justify-center gap-x-12 gap-y-8"
    >
      {/* Laptop */}
      <figure className="flex flex-col items-center gap-2">
        <div className="w-[420px] max-w-full">
          <div className="rounded-t-[14px] border-[6px] border-b-0 border-neutral-800 bg-neutral-800 shadow-raised dark:border-neutral-700 dark:bg-neutral-700">
            <div className="overflow-hidden rounded-t-[8px] bg-background">
              <DashboardMock />
            </div>
          </div>
          <div className="relative left-1/2 h-2.5 w-[112%] -translate-x-1/2 rounded-b-[14px] bg-neutral-800 dark:bg-neutral-700">
            <div className="absolute top-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-b-[5px] bg-neutral-700 dark:bg-neutral-600" />
          </div>
        </div>
        <figcaption className="text-[10px] text-muted-foreground">Desktop</figcaption>
      </figure>

      {/* Tablet */}
      <figure className="flex flex-col items-center gap-2">
        <div className="rounded-[20px] border-[5px] border-neutral-800 bg-neutral-800 shadow-raised dark:border-neutral-700 dark:bg-neutral-700">
          <div className="relative w-[164px] overflow-hidden rounded-[8px] bg-background">
            <span className="absolute top-1 left-1/2 z-10 size-1 -translate-x-1/2 rounded-full bg-neutral-600" />
            <TabletMock />
          </div>
        </div>
        <figcaption className="text-[10px] text-muted-foreground">Tablet</figcaption>
      </figure>

      {/* Phone */}
      <figure className="flex flex-col items-center gap-2">
        <div className="rounded-[1.4rem] border-[4px] border-neutral-800 bg-neutral-800 shadow-raised dark:border-neutral-700 dark:bg-neutral-700">
          <div className="relative w-[84px] overflow-hidden rounded-[12px] bg-background">
            <span className="absolute top-1 left-1/2 z-10 h-1 w-7 -translate-x-1/2 rounded-full bg-neutral-800/70" />
            <PhoneMock />
          </div>
        </div>
        <figcaption className="text-[10px] text-muted-foreground">Mobile</figcaption>
      </figure>
    </div>
  )
}

// Bars shared by the smaller mocks.
function MiniBars({ count = 6, h = 9 }: { count?: number; h?: number }) {
  return (
    <div className="flex items-end gap-0.5" style={{ height: h * 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-xs"
          style={{
            height: `${40 + ((i * 13) % 60)}%`,
            backgroundColor: "var(--chart-1)",
            opacity: 0.5 + i * 0.08,
          }}
        />
      ))}
    </div>
  )
}

function TabletMock() {
  return (
    <div className="flex h-[196px] flex-col gap-1.5 bg-background p-2 text-[6px] leading-tight">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="h-1.5 w-12 rounded bg-foreground/70" />
        <span className="rounded-md bg-primary px-1.5 py-0.5 text-primary-foreground">+ New</span>
      </div>
      {/* Stat cards 2×2 */}
      <div className="grid grid-cols-2 gap-1.5">
        {["bg-primary", "bg-amber", "bg-blue", "bg-green"].map((dot, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-1.5">
            <div className="flex items-center justify-between">
              <span className="h-1 w-5 rounded bg-muted-foreground/40" />
              <span className={cn("size-1.5 rounded-full", dot)} />
            </div>
            <span className="mt-1 block h-2 w-7 rounded bg-foreground/70" />
          </div>
        ))}
      </div>
      {/* Chart card */}
      <div className="flex-1 rounded-xl border border-border bg-card p-2">
        <span className="block h-1 w-10 rounded bg-foreground/60" />
        <div className="mt-2">
          <MiniBars count={7} h={10} />
        </div>
      </div>
    </div>
  )
}

function PhoneMock() {
  return (
    <div className="flex h-[168px] flex-col gap-1.5 bg-background p-1.5 pt-3 text-[5px] leading-tight">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="h-1 w-8 rounded bg-foreground/70" />
        <span className="size-2.5 rounded-full bg-primary/20" />
      </div>
      {/* Highlight card */}
      <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
        <span className="block h-1 w-6 rounded bg-white/40" />
        <span className="mt-1 block h-2 w-10 rounded bg-white/80" />
      </div>
      {/* List rows */}
      <div className="flex-1 space-y-1 rounded-lg border border-border bg-card p-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="size-2.5 shrink-0 rounded-full bg-primary/15" />
            <span className="h-1 flex-1 rounded bg-muted-foreground/30" />
            <span className="h-1 w-3 rounded bg-muted-foreground/20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardMock() {
  return (
    <div className="flex h-[230px] text-[7px] leading-tight">
      {/* Sidebar */}
      <aside className="flex w-1/5 flex-col gap-2 border-r border-border bg-card p-2">
        <div className="flex items-center gap-1">
          <span className="size-3 rounded-lg bg-primary" />
          <span className="h-1 w-8 rounded bg-foreground/70" />
        </div>
        <div className="mt-1 space-y-1.5">
          <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-1 py-1">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="h-1 w-8 rounded bg-primary/70" />
          </div>
          {[10, 8, 9, 7].map((w, i) => (
            <div key={i} className="flex items-center gap-1 px-1 py-1">
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              <span className="h-1 rounded bg-muted-foreground/30" style={{ width: w }} />
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 space-y-2 overflow-hidden bg-background p-2.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="block h-1.5 w-20 rounded bg-foreground/80" />
            <span className="block h-1 w-14 rounded bg-muted-foreground/40" />
          </div>
          <span className="rounded-lg bg-primary px-2 py-1 text-primary-foreground">+ New</span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-1.5">
          {["bg-primary", "bg-amber", "bg-blue", "bg-green"].map((dot, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-1.5">
              <div className="flex items-center justify-between">
                <span className="h-1 w-4 rounded bg-muted-foreground/40" />
                <span className={cn("size-1.5 rounded-full", dot)} />
              </div>
              <span className="mt-1 block h-2 w-6 rounded bg-foreground/70" />
            </div>
          ))}
        </div>

        {/* Chart + side panel */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="col-span-2 rounded-xl border border-border bg-card p-2">
            <span className="block h-1 w-10 rounded bg-foreground/60" />
            <div className="mt-2 flex h-12 items-end gap-1">
              {[45, 70, 55, 85, 60, 95, 72].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-xs"
                  style={{ height: `${h}%`, backgroundColor: "var(--chart-1)", opacity: 0.5 + i * 0.07 }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5 rounded-xl border border-border bg-card p-2">
            <span className="block h-1 w-8 rounded bg-foreground/60" />
            {[68, 84, 52].map((w, i) => (
              <div key={i} className="space-y-0.5">
                <span className="block h-1 w-6 rounded bg-muted-foreground/30" />
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// input[type=color] only accepts hex; best-effort pass-through for hex values,
// fallback for non-hex (oklch) presets so the swatch still opens sensibly.
function toHex(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#2563eb"
}

// ── Detailed component gallery — HR / DTR domain ────────────────────────────────

const STATS: { label: string; value: string; hint: string; dot: string }[] = [
  { label: "Present today", value: "128", hint: "Workforce active", dot: "bg-green" },
  { label: "Late", value: "6", hint: "Attendance issues", dot: "bg-amber" },
  { label: "On leave", value: "9", hint: "Leave visibility", dot: "bg-blue" },
  { label: "OT hours", value: "23.5", hint: "Overtime today", dot: "bg-primary" },
]

const ATT: {
  date: string
  day: string
  in: string
  out: string
  hrs: string
  ot: string
  status: string
  variant: "green" | "amber" | "blue" | "gray"
}[] = [
  { date: "Jun 11", day: "Wed", in: "9:01 AM", out: "6:04 PM", hrs: "8h 03m", ot: "—", status: "Present", variant: "green" },
  { date: "Jun 10", day: "Tue", in: "9:18 AM", out: "7:12 PM", hrs: "8h 54m", ot: "0.9", status: "Late", variant: "amber" },
  { date: "Jun 9", day: "Mon", in: "—", out: "—", hrs: "—", ot: "—", status: "On leave", variant: "blue" },
  { date: "Jun 8", day: "Sun", in: "—", out: "—", hrs: "—", ot: "—", status: "Rest day", variant: "gray" },
]

// Mirrors the "Quick attendance punch" widget on the login screen.
function QuickPunchCard() {
  const [punch, setPunch] = useState<"in" | "out">("in")
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {/* Header (accent) */}
      <div className="flex items-start justify-between bg-primary px-5 py-4">
        <div>
          <p className="text-[10px] font-medium tracking-widest text-white/60 uppercase">
            Friday, June 12, 2026
          </p>
          <p className="mt-0.5 text-[24px] leading-none font-bold tabular-nums text-white">
            09:13:59 PM
          </p>
        </div>
        <span className="rounded-lg p-1.5 text-white/60">
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
        </span>
      </div>

      <div className="p-5">
        <p className="mb-4 text-[14px] font-semibold text-foreground">Quick attendance punch</p>

        {/* Punch type toggle */}
        <div className="mb-4 flex gap-2">
          {(["in", "out"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPunch(t)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-semibold transition-all duration-150",
                punch === t
                  ? t === "in"
                    ? "border-green-500 bg-green-500/10 text-green-600"
                    : "border-red-500 bg-red-500/10 text-red-600"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <HugeiconsIcon icon={t === "in" ? Login01Icon : Logout01Icon} size={15} strokeWidth={2} />
              Time {t === "in" ? "In" : "Out"}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="emp-id-preview">Employee ID</Label>
          <Input id="emp-id-preview" placeholder="e.g. EMP-0042" className="h-11" />
        </div>

        <Button
          className={cn(
            "mt-4 h-11 w-full justify-center gap-2 text-[14px] font-semibold",
            punch === "out" && "bg-red-500 hover:bg-red-600"
          )}
        >
          <HugeiconsIcon icon={Camera01Icon} size={15} strokeWidth={2} />
          Continue to camera
        </Button>
      </div>
    </div>
  )
}

function ThemeShowcase({ theme }: { theme: BrandTheme }) {
  return (
    <div style={themeVars(theme)} className="space-y-4">
      {/* Overview stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {s.label}
              </span>
              <span className={cn("size-1.5 rounded-full", s.dot)} />
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* DTR — quick attendance punch (mirrors the login widget) */}
        <QuickPunchCard />

        {/* Request correction form */}
        <Card>
          <CardHeader>
            <CardTitle>Request correction</CardTitle>
            <CardDescription>Appeal an attendance record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Shift</Label>
              <Select defaultValue="day">
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day shift · 9:00 AM – 6:00 PM</SelectItem>
                  <SelectItem value="mid">Mid shift · 2:00 PM – 11:00 PM</SelectItem>
                  <SelectItem value="grave">Graveyard · 10:00 PM – 7:00 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Correct time in</Label>
                <Input defaultValue="9:00 AM" className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Correct time out</Label>
                <Input defaultValue="6:00 PM" className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label className="text-[12px]">Require camera on clock-in</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline">Cancel</Button>
              <Button size="sm">Submit appeal</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance log */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance log</CardTitle>
          <CardDescription>June 2026 · 22 days worked · 1 late · 1 on leave</CardDescription>
          <CardAction>
            <Badge variant="outline">Export</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["Date", "Day", "Time in", "Time out", "Hours", "OT", "Status"].map((h) => (
                  <TableHead key={h} className={h === "Hours" || h === "OT" ? "text-right" : undefined}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ATT.map((r) => (
                <TableRow key={r.date}>
                  <TableCell className="font-medium">{r.date}</TableCell>
                  <TableCell className="text-muted-foreground">{r.day}</TableCell>
                  <TableCell className="tabular-nums">{r.in}</TableCell>
                  <TableCell className="tabular-nums">{r.out}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.hrs}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.ot !== "—" ? (
                      <span className="font-medium text-primary">+{r.ot}h</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={r.variant}>{r.status}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
