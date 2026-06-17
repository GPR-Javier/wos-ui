"use client"

import { useEffect } from "react"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
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
export function useNotifications() {
  const qc = useQueryClient()
  const pushToast = useToastStore((s) => s.push)
  const user = useAuthStore((s) => s.user)
  const dashboardRole = useAuthStore((s) => s.dashboardRole)
  const enabled = !!user && dashboardRole !== "applicant"

  const unreadQuery = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: notificationApi.unreadCount,
    enabled,
    refetchInterval: 60_000, // fallback if the SSE stream is down
    refetchOnWindowFocus: true,
  })

  const listQuery = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => notificationApi.list({ size: 15 }),
    enabled,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const markAllRead = useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })

  // Realtime stream. EventSource sends the auth cookie on same-origin requests and auto-reconnects.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const es = new EventSource(NOTIFICATION_STREAM_URL, { withCredentials: true })

    es.addEventListener("notification", (e) => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
      playChime()
      try {
        const n = JSON.parse((e as MessageEvent).data) as AppNotification
        pushToast(n.body ?? "", "info", 4500, n.title)
      } catch {
        // payload parse failed — the query invalidation above still refreshes the bell
      }
    })

    // EventSource retries on its own; nothing to do on error beyond letting it reconnect.
    return () => es.close()
  }, [enabled, qc, pushToast])

  return {
    unreadCount: unreadQuery.data ?? 0,
    notifications: listQuery.data?.content ?? [],
    isLoading: listQuery.isLoading,
    markRead,
    markAllRead,
    enabled,
  }
}
