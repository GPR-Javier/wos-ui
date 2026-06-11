import { create } from "zustand"
import { toast as sonnerToast } from "sonner"

export type ToastType = "success" | "error" | "info"

interface ToastState {
  /**
   * Show a toast. Thin adapter over sonner (shadcn toast) so existing call sites keep the same API
   * while rendering through the shared <Toaster />. When {@code title} is given it's the bold heading
   * and {@code message} becomes the description; otherwise {@code message} is the toast text.
   */
  push: (
    message: string,
    type?: ToastType,
    durationMs?: number,
    title?: string
  ) => void
}

export const useToastStore = create<ToastState>()(() => ({
  push: (message, type = "info", durationMs = 4500, title) => {
    const fn =
      type === "success"
        ? sonnerToast.success
        : type === "error"
          ? sonnerToast.error
          : sonnerToast.info
    fn(title ?? message, {
      description: title ? message : undefined,
      duration: durationMs,
    })
  },
}))
