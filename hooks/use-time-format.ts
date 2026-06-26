"use client"

import { usePreferencesStore } from "@/store/preferences-store"
import {
  formatTime as formatTimeRaw,
  type FormatTimeOptions,
} from "@/lib/time-format"

/**
 * Reactive access to the user's time-format preference. Components that display
 * times should use this so toggling 12h/24h in settings re-renders them.
 */
export function useTimeFormat() {
  const timeFormat = usePreferencesStore((s) => s.timeFormat)
  return {
    timeFormat,
    is24h: timeFormat === "24h",
    formatTime: (
      input: Date | string | null | undefined,
      opts?: FormatTimeOptions
    ) => formatTimeRaw(input, timeFormat, opts),
  }
}
