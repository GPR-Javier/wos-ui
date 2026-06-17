import { api } from "./api"
import type { PageResponse } from "./admin-api"

// In-app notifications (wos-hr). Realtime delivery is via SSE (see use-notifications);
// these REST calls back the bell badge, dropdown list, and read-state mutations.

export type NotificationType =
  | "LEAVE_REQUESTED"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "SCHEDULE_CHANGE"
  | "PAYSLIP_RELEASED"
  | "EVALUATION_DUE"
  | "DOCUMENT_REQUEST"
  | "APPLICATION_UPDATE"
  | "ANNOUNCEMENT"
  | "GENERIC"

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body: string | null
  linkUrl: string | null
  actorUserId: number | null
  read: boolean
  createdAt: string // ISO
}

// Served by the dedicated wos-notification service, under its /api/notification context-path.
export const notificationApi = {
  list: (params: { unread?: boolean; page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<AppNotification>>("/notification", {
        params: { page: 0, size: 15, ...params },
      })
      .then((r) => r.data),

  unreadCount: () =>
    api
      .get<{ count: number }>("/notification/unread-count")
      .then((r) => r.data.count),

  markRead: (id: number) => api.post(`/notification/${id}/read`),

  markAllRead: () => api.post("/notification/read-all"),

  /** Dev convenience — raise a notification addressed to yourself to verify realtime. */
  selfTest: () =>
    api.post<AppNotification>("/notification/self-test").then((r) => r.data),
}

// The SSE endpoint goes through the same /api proxy; EventSource sends the auth cookie automatically.
export const NOTIFICATION_STREAM_URL = "/api/notification/stream"
