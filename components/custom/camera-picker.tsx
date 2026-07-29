"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Camera01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { usePreferencesStore } from "@/store/preferences-store"

/**
 * Camera selector for the Face ID capture surfaces.
 *
 * Desktops routinely expose several video inputs and the browser's default is frequently the
 * wrong one — which presents identically to a broken feature ("no face detected" forever). The
 * choice persists so nobody has to rediscover it on every punch.
 *
 * Renders nothing when there's at most one camera, so the common case stays uncluttered.
 */
export function CameraPicker({
  className,
  disabled,
}: {
  className?: string
  disabled?: boolean
}) {
  const deviceId = usePreferencesStore((s) => s.cameraDeviceId)
  const setDeviceId = usePreferencesStore((s) => s.setCameraDeviceId)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!navigator.mediaDevices?.enumerateDevices) return
      try {
        const all = await navigator.mediaDevices.enumerateDevices()
        if (!cancelled) setDevices(all.filter((d) => d.kind === "videoinput"))
      } catch {
        // Enumeration is best-effort; without it we simply don't offer a choice.
      }
    }

    load()
    // Labels are blank until camera permission is granted, and the list changes when a USB
    // camera is plugged in — re-read on both.
    navigator.mediaDevices?.addEventListener?.("devicechange", load)
    return () => {
      cancelled = true
      navigator.mediaDevices?.removeEventListener?.("devicechange", load)
    }
  }, [])

  // A stored id can go stale when the device is unplugged; fall back to the browser default.
  useEffect(() => {
    if (!deviceId || devices.length === 0) return
    if (!devices.some((d) => d.deviceId === deviceId)) setDeviceId(null)
  }, [devices, deviceId, setDeviceId])

  if (devices.length < 2) return null

  return (
    <label
      className={cn(
        "flex items-center gap-2 text-[12px] text-muted-foreground",
        className
      )}
    >
      <HugeiconsIcon icon={Camera01Icon} size={14} strokeWidth={2} />
      <span className="shrink-0">Camera</span>
      <select
        value={deviceId ?? ""}
        disabled={disabled}
        onChange={(e) => setDeviceId(e.target.value || null)}
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-[12px] text-foreground disabled:opacity-50"
      >
        <option value="">Default camera</option>
        {devices.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Camera ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  )
}
