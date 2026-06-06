import { create } from "zustand"

export type ToastType = "success" | "error" | "info"

export interface ToastItem {
  id: number
  message: string
  type: ToastType
  /** Optional bold heading shown above the message (e.g. a backend error name). */
  title?: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (
    message: string,
    type?: ToastType,
    durationMs?: number,
    title?: string
  ) => void
  remove: (id: number) => void
}

let nextToastId = 1

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  push: (message, type = "info", durationMs = 4500, title) => {
    const id = nextToastId++
    set((state) => ({ toasts: [...state.toasts, { id, message, type, title }] }))

    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }))
    }, durationMs)
  },

  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}))
