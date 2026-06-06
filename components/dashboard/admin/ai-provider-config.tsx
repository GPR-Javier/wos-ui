"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  FloppyDiskIcon,
} from "@hugeicons/core-free-icons"
import { useAiSettings, useUpdateAiSettings } from "@/hooks/use-ai-settings"
import type { AiProvider } from "@/lib/ai-settings-api"

const PROVIDERS: {
  key: AiProvider
  name: string
  blurb: string
}[] = [
  {
    key: "ollama",
    name: "Ollama (local)",
    blurb: "Runs a model on your own server. Private, no API cost, no key needed.",
  },
  {
    key: "gemini",
    name: "Google Gemini",
    blurb: "Google's hosted models. Fast and capable; needs a server API key.",
  },
]

export function AiProviderConfigSection() {
  const { data, isLoading } = useAiSettings()
  const updateMut = useUpdateAiSettings()

  const [provider, setProvider] = useState<AiProvider>("ollama")
  const [ollamaModel, setOllamaModel] = useState("")
  const [geminiModel, setGeminiModel] = useState("")
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)

  // Seed the form once settings load (and whenever they change underneath us).
  useEffect(() => {
    if (!data) return
    setProvider(data.provider)
    setOllamaModel(data.ollamaModel)
    setGeminiModel(data.geminiModel)
  }, [data])

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const geminiBlocked = provider === "gemini" && data?.geminiConfigured === false

  const dirty =
    !!data &&
    (provider !== data.provider ||
      ollamaModel.trim() !== data.ollamaModel ||
      geminiModel.trim() !== data.geminiModel)

  function handleSave() {
    if (geminiBlocked) {
      showToast("Set GEMINI_API_KEY on the server before switching to Gemini.", "error")
      return
    }
    updateMut.mutate(
      {
        provider,
        ollamaModel: ollamaModel.trim() || undefined,
        geminiModel: geminiModel.trim() || undefined,
      },
      {
        onSuccess: () => showToast("AI provider settings saved.", "success"),
        onError: (e) => {
          const msg =
            (e as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? "Failed to save settings."
          showToast(msg, "error")
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[14px] font-semibold">AI Provider</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Choose which AI model powers every AI feature — interview grading, question
          generation, resume/cover-letter review, and rejection drafts. The switch applies
          instantly to the whole system; no restart needed.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex justify-end">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-md",
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            )}
          >
            <HugeiconsIcon
              icon={
                toast.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon
              }
              size={14}
              strokeWidth={2}
            />
            {toast.msg}
          </div>
        </div>
      )}

      {/* Provider cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((p) => {
          const selected = provider === p.key
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setProvider(p.key)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/40"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[13px] font-semibold">{p.name}</span>
                {selected && (
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={16}
                    strokeWidth={2}
                    className="text-primary"
                  />
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{p.blurb}</span>
              {p.key === "gemini" && data?.geminiConfigured === false && (
                <span className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  API key not configured
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Model for the selected provider */}
      <div className="rounded-xl border border-border p-5">
        {provider === "ollama" ? (
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Ollama model</label>
            <Input
              className="h-9 text-[13px]"
              placeholder="e.g. qwen2.5:7b"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Must be a model pulled on the Ollama server (e.g. <code>qwen2.5:7b</code>,{" "}
              <code>llama3.1:8b</code>).
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Gemini model</label>
            <Input
              className="h-9 text-[13px]"
              placeholder="e.g. gemini-2.0-flash"
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              A Gemini model id (e.g. <code>gemini-2.0-flash</code>,{" "}
              <code>gemini-1.5-pro</code>). The API key is a server secret
              (<code>GEMINI_API_KEY</code>) — set in the environment, never here.
            </p>
            {data?.geminiConfigured === false && (
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Gemini can’t be used until <code>GEMINI_API_KEY</code> is set on the server.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {data?.updatedAt
            ? `Last changed ${new Date(data.updatedAt).toLocaleString()}${
                data.updatedBy ? ` by ${data.updatedBy}` : ""
              }`
            : "Using defaults."}
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || geminiBlocked || updateMut.isPending}
        >
          <HugeiconsIcon
            icon={FloppyDiskIcon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          {updateMut.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
