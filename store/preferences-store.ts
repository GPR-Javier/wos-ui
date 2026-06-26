import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TimeFormat } from "@/lib/time-format"

interface PreferencesState {
  /** 12-hour (AM/PM) or 24-hour clock, applied to time displays app-wide. */
  timeFormat: TimeFormat
  setTimeFormat: (format: TimeFormat) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      timeFormat: "12h",
      setTimeFormat: (timeFormat) => set({ timeFormat }),
    }),
    { name: "wos_prefs" }
  )
)
