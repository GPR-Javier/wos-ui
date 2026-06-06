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
import {
  useAiSettings,
  useUpdateAiSettings,
  useTestGemini,
} from "@/hooks/use-ai-settings"
import { aiSettingsApi, type AiProvider } from "@/lib/ai-settings-api"
import {
  AVATAR_STYLES,
  dicebearUrl,
  randomSeed,
} from "@/lib/ai-persona-api"

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
  const testMut = useTestGemini()

  const [provider, setProvider] = useState<AiProvider>("ollama")
  const [ollamaModel, setOllamaModel] = useState("")
  const [geminiModel, setGeminiModel] = useState("")
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [keyTest, setKeyTest] = useState<{
    valid: boolean
    message: string
  } | null>(null)
  const [geminiModels, setGeminiModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  // Per-provider interviewer persona (name + generated avatar URL).
  const [ollamaPersonaName, setOllamaPersonaName] = useState("")
  const [ollamaAvatarUrl, setOllamaAvatarUrl] = useState("")
  const [geminiPersonaName, setGeminiPersonaName] = useState("")
  const [geminiAvatarUrl, setGeminiAvatarUrl] = useState("")
  // Whether the key INPUT is shown. Hidden by default when a key is already saved (shows a
  // "Change key" affordance instead); always shown when no key is configured yet.
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)

  // Loads the model dropdown from the given key (or the saved one when omitted).
  async function loadModels(apiKey?: string) {
    setModelsLoading(true)
    try {
      const models = await aiSettingsApi.geminiModels(apiKey)
      setGeminiModels(models)
      // If no model is chosen yet, default to a "latest" alias (or the first) so the dropdown's
      // displayed value actually matches state — otherwise it *looks* selected but isn't.
      setGeminiModel((cur) =>
        cur ? cur : (models.find((m) => m.includes("latest")) ?? models[0] ?? "")
      )
    } catch {
      setGeminiModels([])
    } finally {
      setModelsLoading(false)
    }
  }

  // Seed the form once settings load (and whenever they change underneath us).
  // The API key is never sent back, so its field starts blank (only a masked hint is shown).
  useEffect(() => {
    if (!data) return
    setProvider(data.provider)
    setOllamaModel(data.ollamaModel ?? "")
    setGeminiModel(data.geminiModel ?? "") // null until Gemini is configured
    setOllamaPersonaName(data.ollamaPersonaName ?? "")
    setOllamaAvatarUrl(data.ollamaAvatarUrl ?? "")
    setGeminiPersonaName(data.geminiPersonaName ?? "")
    setGeminiAvatarUrl(data.geminiAvatarUrl ?? "")
    if (data.geminiConfigured) loadModels() // populate Gemini dropdown from the saved key
    aiSettingsApi
      .ollamaModels()
      .then(setOllamaModels)
      .catch(() => setOllamaModels([])) // Ollama dropdown from the server's installed models
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // To activate Gemini it must have BOTH a key (saved or typed) AND a model selected.
  const geminiNeedsKey =
    provider === "gemini" && !data?.geminiConfigured && !geminiApiKey.trim()
  const geminiNeedsModel = provider === "gemini" && !geminiModel.trim()
  const geminiBlocked = geminiNeedsKey || geminiNeedsModel

  const dirty =
    !!data &&
    (provider !== data.provider ||
      ollamaModel.trim() !== (data.ollamaModel ?? "") ||
      geminiModel.trim() !== (data.geminiModel ?? "") ||
      !!geminiApiKey.trim() ||
      ollamaPersonaName.trim() !== (data.ollamaPersonaName ?? "") ||
      ollamaAvatarUrl !== (data.ollamaAvatarUrl ?? "") ||
      geminiPersonaName.trim() !== (data.geminiPersonaName ?? "") ||
      geminiAvatarUrl !== (data.geminiAvatarUrl ?? ""))

  // "latest" aliases (e.g. gemini-flash-latest) sorted to the top as the recommended choice.
  const sortedGeminiModels = [...geminiModels].sort((a, b) => {
    const al = a.includes("latest")
    const bl = b.includes("latest")
    if (al !== bl) return al ? -1 : 1
    return a.localeCompare(b)
  })

  function handleTestKey() {
    setKeyTest(null)
    const typed = geminiApiKey.trim() || undefined
    testMut.mutate(typed, {
      onSuccess: (r) => {
        setKeyTest(r)
        if (r.valid) loadModels(typed) // refresh dropdown from the just-validated key
      },
      onError: () =>
        setKeyTest({ valid: false, message: "Test request failed." }),
    })
  }

  function handleSave() {
    if (geminiNeedsKey) {
      showToast("Add a Gemini API key before switching to Gemini.", "error")
      return
    }
    if (geminiNeedsModel) {
      showToast("Select a Gemini model before switching to Gemini.", "error")
      return
    }
    updateMut.mutate(
      {
        provider,
        ollamaModel: ollamaModel.trim() || undefined,
        ollamaPersonaName: ollamaPersonaName.trim() || undefined,
        ollamaAvatarUrl: ollamaAvatarUrl.trim() || undefined,
        geminiModel: geminiModel.trim() || undefined,
        geminiApiKey: geminiApiKey.trim() || undefined,
        geminiPersonaName: geminiPersonaName.trim() || undefined,
        geminiAvatarUrl: geminiAvatarUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          setGeminiApiKey("") // clear the secret from the form; hint comes from the refetched data
          setKeyTest(null)
          setShowKeyInput(false) // collapse back to the "Saved ••••" view
          showToast("AI provider settings saved.", "success")
        },
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
          <div className="space-y-4">
            <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Ollama model</label>
            {ollamaModels.length > 0 ? (
              <select
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {/* Keep the saved value selectable even if it's not currently pulled. */}
                {ollamaModel && !ollamaModels.includes(ollamaModel) && (
                  <option value={ollamaModel}>{ollamaModel} (not installed)</option>
                )}
                {ollamaModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                className="h-9 text-[13px]"
                placeholder="e.g. qwen2.5:7b"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
              />
            )}
            <p className="text-[11px] text-muted-foreground">
              {ollamaModels.length > 0
                ? "Installed models on your Ollama server. Pull more with " +
                  "`ollama pull <name>`."
                : "Must be a model pulled on the Ollama server (e.g. qwen2.5:7b). " +
                  "Start Ollama to load the installed list."}
            </p>
            </div>
            <PersonaFields
              name={ollamaPersonaName}
              avatarUrl={ollamaAvatarUrl}
              onName={setOllamaPersonaName}
              onAvatar={setOllamaAvatarUrl}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* API key — at the top; hidden by default when one is already saved. */}
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">API key</label>
              {showKeyInput || !data?.geminiConfigured ? (
                <>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      autoComplete="off"
                      className="h-9 flex-1 text-[13px]"
                      placeholder={
                        data?.geminiConfigured
                          ? "Enter a new key to replace the saved one"
                          : "Paste your Gemini API key (AIza… or AQ.…)"
                      }
                      value={geminiApiKey}
                      onChange={(e) => {
                        setGeminiApiKey(e.target.value)
                        setKeyTest(null)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestKey}
                      disabled={
                        testMut.isPending ||
                        (!geminiApiKey.trim() && !data?.geminiConfigured)
                      }
                    >
                      {testMut.isPending ? "Testing…" : "Test key"}
                    </Button>
                  </div>
                  {keyTest && (
                    <p
                      className={cn(
                        "flex items-center gap-1.5 text-[11px] font-medium",
                        keyTest.valid
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      <HugeiconsIcon
                        icon={keyTest.valid ? CheckmarkCircle01Icon : Cancel01Icon}
                        size={13}
                        strokeWidth={2}
                      />
                      {keyTest.message}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Stored on the server (not shown again). Get a key from{" "}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-foreground"
                    >
                      Google AI Studio
                    </a>
                    .
                    {data?.geminiConfigured && (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="underline hover:text-foreground"
                          onClick={() => {
                            setShowKeyInput(false)
                            setGeminiApiKey("")
                            setKeyTest(null)
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </p>
                  {geminiNeedsKey && (
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      An API key is required to use Gemini.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-[12px] text-muted-foreground">
                    Saved <code className="text-foreground">{data?.geminiKeyHint}</code>
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowKeyInput(true)}
                  >
                    Change key
                  </Button>
                </div>
              )}
            </div>

            {/* Model — dropdown populated from the key's available models */}
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Gemini model</label>
              {geminiModels.length > 0 ? (
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  {/* Keep the saved value selectable even if it's not in the fetched list. */}
                  {geminiModel && !geminiModels.includes(geminiModel) && (
                    <option value={geminiModel}>{geminiModel} (current)</option>
                  )}
                  {sortedGeminiModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                      {m.includes("latest") ? "  —  latest (recommended)" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  className="h-9 text-[13px]"
                  placeholder="e.g. gemini-flash-latest"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                />
              )}
              <p className="text-[11px] text-muted-foreground">
                {modelsLoading
                  ? "Loading available models…"
                  : geminiModels.length > 0
                    ? "“latest” models always track Google’s newest version — a safe default."
                    : "Add a valid key to load the model list (or type one manually)."}
              </p>
              {geminiNeedsModel && (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  A model is required to use Gemini.
                </p>
              )}
            </div>

            <PersonaFields
              name={geminiPersonaName}
              avatarUrl={geminiAvatarUrl}
              onName={setGeminiPersonaName}
              onAvatar={setGeminiAvatarUrl}
            />
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

// ── Persona editor (name + generated avatar) ────────────────────────────────────

function PersonaFields({
  name,
  avatarUrl,
  onName,
  onAvatar,
}: {
  name: string
  avatarUrl: string
  onName: (v: string) => void
  onAvatar: (v: string) => void
}) {
  // Seed the style/seed controls from the current avatar URL (if it's a DiceBear one).
  const parsed = (() => {
    const styleMatch = AVATAR_STYLES.find((s) => avatarUrl.includes(`/9.x/${s}/`))
    let seed = ""
    try {
      seed = new URL(avatarUrl).searchParams.get("seed") ?? ""
    } catch {
      /* not a URL yet */
    }
    return { style: styleMatch ?? AVATAR_STYLES[0], seed }
  })()
  const [style, setStyle] = useState<string>(parsed.style)
  const [seed, setSeed] = useState<string>(parsed.seed || name || randomSeed())

  function gen(nextStyle: string, nextSeed: string) {
    setStyle(nextStyle)
    setSeed(nextSeed)
    onAvatar(dicebearUrl(nextStyle, nextSeed || "seed"))
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[12px] text-muted-foreground">Interviewer persona</label>
      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Interviewer avatar" className="size-full object-cover" />
          ) : (
            <span className="text-[10px] text-muted-foreground">No avatar</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            className="h-9 text-[13px]"
            placeholder="Interviewer name (e.g. Alex)"
            value={name}
            onChange={(e) => onName(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              value={style}
              onChange={(e) => gen(e.target.value, seed || name || randomSeed())}
              className="h-8 flex-1 rounded-lg border bg-background px-2 text-[12px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            >
              {AVATAR_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => gen(style, randomSeed())}
            >
              Randomize
            </Button>
          </div>
          <Input
            className="h-8 text-[12px]"
            placeholder="…or paste a DiceBear URL"
            value={avatarUrl}
            onChange={(e) => onAvatar(e.target.value)}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Shown as the interviewer’s name and avatar during interviews. Generate one above, or fully
        customize at{" "}
        <a
          href="https://www.dicebear.com/playground"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          dicebear.com/playground
        </a>{" "}
        and paste the URL (free).
      </p>
    </div>
  )
}
