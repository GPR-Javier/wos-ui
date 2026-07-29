import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TimeFormat } from "@/lib/time-format"

interface PreferencesState {
  /** 12-hour (AM/PM) or 24-hour clock, applied to time displays app-wide. */
  timeFormat: TimeFormat
  setTimeFormat: (format: TimeFormat) => void
  /**
   * Preferred camera `deviceId` for Face ID capture. Persisted because the browser's default is
   * often the wrong device on desktops with more than one camera, and re-picking it on every
   * punch is a support ticket waiting to happen. Null means "let the browser choose".
   */
  cameraDeviceId: string | null
  setCameraDeviceId: (deviceId: string | null) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      timeFormat: "12h",
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      cameraDeviceId: null,
      setCameraDeviceId: (cameraDeviceId) => set({ cameraDeviceId }),
    }),
    { name: "wos_prefs" }
  )
)
