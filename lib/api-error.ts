import { useToastStore } from "@/store/toast-store"

/** The error body shape returned by the backend GlobalExceptionHandler. */
interface BackendError {
  status?: number
  error?: string
  message?: string
}

function extract(e: unknown): BackendError {
  return (e as { response?: { data?: BackendError } })?.response?.data ?? {}
}

/**
 * Shows a backend error as a toast: the {@code error} field (e.g. "Too Many Requests") becomes the
 * title and {@code message} the content. Falls back gracefully when the error isn't a structured
 * backend response (network failure, etc.). Use in mutation/query onError handlers.
 */
export function toastApiError(e: unknown, fallback = "Something went wrong. Please try again.") {
  const data = extract(e)
  const title = data.error?.trim() || "Error"
  const message = data.message?.trim() || fallback
  useToastStore.getState().push(message, "error", 6000, title)
}

/** The backend message string (or a fallback) — for places that show inline text, not a toast. */
export function apiErrorMessage(e: unknown, fallback = "Something went wrong.") {
  return extract(e).message?.trim() || fallback
}
