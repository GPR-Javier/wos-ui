"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { usePreferencesStore } from "@/store/preferences-store"
import { useTimeFormat } from "@/hooks/use-time-format"
import type { TimeFormat } from "@/lib/time-format"

const TIMEZONES = [
  "Asia/Manila (UTC+8)",
  "Asia/Singapore (UTC+8)",
  "Asia/Tokyo (UTC+9)",
  "America/New_York (UTC-5)",
  "America/Los_Angeles (UTC-8)",
  "Europe/London (UTC+0)",
  "Europe/Paris (UTC+1)",
]

const LANGUAGES = [
  "English (US)",
  "English (UK)",
  "Filipino",
  "Japanese",
  "Spanish",
]

export function AppearanceSection() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [timezone, setTimezone] = useState("Asia/Manila (UTC+8)")
  const [language, setLanguage] = useState("English (US)")
  const setTimeFormat = usePreferencesStore((s) => s.setTimeFormat)
  const { timeFormat, formatTime } = useTimeFormat()
  useEffect(() => setMounted(true), [])

  const TIME_FORMATS: { value: TimeFormat; label: string; example: Date }[] = [
    { value: "12h", label: "12-hour (AM/PM)", example: new Date() },
    { value: "24h", label: "24-hour", example: new Date() },
  ]

  const themes = [
    { value: "light", label: "Light", desc: "Clean and bright" },
    { value: "dark", label: "Dark", desc: "Easy on the eyes" },
    { value: "system", label: "System", desc: "Matches OS preference" },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold">Appearance</h3>
        <p className="text-[13px] text-muted-foreground">
          Customize how WorkOS looks and feels on your device
        </p>
      </div>
      <Separator />

      <div>
        <p className="mb-3 text-[13px] font-medium">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all duration-150",
                mounted && resolvedTheme === t.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "mb-2 h-12 rounded-lg border",
                  t.value === "dark"
                    ? "border-zinc-700 bg-zinc-900"
                    : t.value === "light"
                      ? "border-zinc-200 bg-white"
                      : "border-zinc-300 bg-linear-to-br from-white to-zinc-900"
                )}
              />
              <p className="text-[13px] font-medium">{t.label}</p>
              <p className="text-[11px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Tip: press{" "}
          <kbd className="rounded border border-border bg-muted px-1 text-[10px]">
            D
          </kbd>{" "}
          anywhere to toggle dark mode
        </p>
      </div>

      <Separator />

      <div>
        <p className="mb-1 text-[13px] font-medium">Locale &amp; language</p>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Controls date formats, time display, and UI language
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-[13px] focus:ring-1 focus:ring-ring focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Language</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-[13px] focus:ring-1 focus:ring-ring focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Time format */}
        <div className="mt-4 space-y-1.5">
          <Label>Time format</Label>
          <div className="grid grid-cols-2 gap-3">
            {TIME_FORMATS.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeFormat(tf.value)}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-150",
                  timeFormat === tf.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <div>
                  <p className="text-[13px] font-medium">{tf.label}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {formatTime(tf.example, { seconds: true })}
                  </p>
                </div>
                <span
                  className={cn(
                    "size-3.5 shrink-0 rounded-full border-2",
                    timeFormat === tf.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Applies to time displays across the dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
