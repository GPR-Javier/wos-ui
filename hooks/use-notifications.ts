"use client"

import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  notificationApi,
  NOTIFICATION_STREAM_URL,
  type AppNotification,
} from "@/lib/notification-api"
import { useAuthStore } from "@/store/auth-store"
import { useToastStore } from "@/store/toast-store"

const UNREAD_KEY = ["notifications", "unread-count"] as const
const LIST_KEY = ["notifications", "list"] as const

// ── Arrival chime ────────────────────────────────────────────────────────────
// Synthesised with the Web Audio API so there's no audio asset to ship. Reuses one
// AudioContext; browsers only let it produce sound after the user has interacted with
// the page (autoplay policy), so the first chime may be silent until then — harmless.
let audioCtx: AudioContext | null = null
function playChime() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return
    audioCtx ??= new Ctor()
    if (audioCtx.state === "suspended") void audioCtx.resume()
    const now = audioCtx.currentTime
    const gain = audioCtx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    gain.connect(audioCtx.destination)
    // Two quick rising notes — a friendly "ding-dong".
    for (const [freq, at] of [
      [660, 0],
      [880, 0.13],
    ] as const) {
      const osc = audioCtx.createOscillator()
      osc.type = "sine"
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(now + at)
      osc.stop(now + at + 0.2)
    }
  } catch {
    // Audio not available / blocked — the visual bell still updates.
  }
}

/**
 * Backs the notification bell: unread count, recent list, read-state mutations, and a realtime SSE
 * connection that pushes new notifications instantly (with a chime). A polling fallback on the unread
 * count keeps things fresh if the stream drops (e.g. during a token refresh).
 *
 * Gated to signed-in, company-affiliated users — applicants/guests have no company-scoped inbox.
 */
/**
 * Data-only: react-query reads + read-state mutations + per-section unread counts. Opens NO stream,
 * so it's safe to call from multiple components (e.g. the sidebar). The single SSE stream is owned by
 * {@link useNotifications}. Both share the same query cache, so they always see identical data.
 */
export function useNotificationData() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  // Any signed-in identity has a personal inbox — including applicants (review-outcome pings).
  // Notifications are addressed by userId, not company, so company-less applicants work too.
  const enabled = !!user

  // SSE pushes instant updates, but it can miss (tab unfocused, flaky stream, token refresh). The
  // app's global defaults disable focus-refetch and keep data fresh for 5 min, which would leave the
  // bell/sidebar stale — so these notification queries opt back into short polling + focus refetch.
  const liveOptions = {
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  } as const

  const unreadQuery = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: notificationApi.unreadCount,
    ...liveOptions,
  })

  const listQuery = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => notificationApi.list({ size: 15 }),
    ...liveOptions,
  })

  // Unread notifications (a wider page) used to badge sidebar nav items by their target section.
  const unreadListQuery = useQuery({
    queryKey: ["notifications", "unread-list"],
    queryFn: () => notificationApi.list({ unread: true, size: 50 }),
    ...liveOptions,
  })

  // Count unread per top-level dashboard section, derived from each notification's linkUrl
  // ("/dashboard/<section>/..." → "<section>"). Drives the sidebar ping badges.
  const unreadBySection: Record<string, number> = {}
  for (const n of unreadListQuery.data?.content ?? []) {
    const seg = n.linkUrl?.split("/").filter(Boolean) // ["dashboard","applicants",...]
    if (seg && seg[0] === "dashboard" && seg[1]) {
      unreadBySection[seg[1]] = (unreadBySection[seg[1]] ?? 0) + 1
    }
  }

  const markRead = useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const markAllRead = useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })

  return {
    unreadCount: unreadQuery.data ?? 0,
    notifications: listQuery.data?.content ?? [],
    unreadBySection,
    isLoading: listQuery.isLoading,
    markRead,
    markAllRead,
    enabled,
  }
}

/**
 * Full hook for the ONE component that owns the realtime channel (the topbar bell): everything from
 * {@link useNotificationData} plus the SSE stream, arrival chime, and toast. Call this exactly once.
 */
export function useNotifications() {
  const qc = useQueryClient()
  const pushToast = useToastStore((s) => s.push)
  const data = useNotificationData()
  const { enabled } = data

  // Realtime stream. EventSource sends the auth cookie on same-origin requests and auto-reconnects.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const es = new EventSource(NOTIFICATION_STREAM_URL, {
      withCredentials: true,
    })

    es.addEventListener("notification", (e) => {
      // Refresh the bell AND every on-screen data table: invalidate all queries so whatever list the
      // user is viewing (overtime, change-time, leave, applicants, …) reflects the change immediately.
      // Only ACTIVE (mounted) queries actually refetch, so this is cheap — typically a handful.
      qc.invalidateQueries()
      playChime()
      try {
        const n = JSON.parse((e as MessageEvent).data) as AppNotification
        pushToast(n.body ?? "", "info", 4500, n.title)
      } catch {
        // payload parse failed — the invalidation above still refreshes the open view + bell
      }
    })

    // EventSource retries on its own; nothing to do on error beyond letting it reconnect.
    return () => es.close()
  }, [enabled, qc, pushToast])

  return data
}
