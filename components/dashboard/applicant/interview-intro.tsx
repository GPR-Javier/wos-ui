"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiBrain01Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { useBotPersona } from "@/hooks/use-bot-persona"
import { useAiPersona } from "@/hooks/use-ai-persona"
import { FALLBACK_AVATAR_URL } from "@/lib/ai-persona-api"

/**
 * Conversational warm-up shown right before the AI interview begins: the bot introduces itself
 * (spoken in its own voice) and asks the candidate if they're ready. While the candidate reads the
 * greeting, the first question is generated in the background, so "Yes" leads straight into it.
 */
export function InterviewIntro({
  ready,
  error,
  onYes,
  onNo,
}: {
  /** True once the opening question has been fetched and the interview can begin. */
  ready: boolean
  error: string | null
  onYes: () => void
  onNo: () => void
}) {
  const { name: voiceName, speak, stop } = useBotPersona()
  const { data: persona } = useAiPersona()
  // Admin-configured name/avatar (per active provider) wins; fall back to the voice-derived name.
  const name = persona?.name ?? voiceName
  const avatarUrl = persona?.avatarUrl ?? FALLBACK_AVATAR_URL

  // Greet once the persona name has settled (debounced so it isn't spoken twice as voices load).
  useEffect(() => {
    const t = setTimeout(
      () =>
        speak(
          `Hi, I'm ${name}. I'll be your interviewer today. When you're ready, we can begin.`
        ),
      450
    )
    return () => {
      clearTimeout(t)
      stop()
    }
  }, [name, speak, stop])

  return (
    <div className="mx-auto max-w-md px-6 py-12 text-center">
      <div className="mx-auto mb-5 flex size-20 items-center justify-center overflow-hidden rounded-full bg-primary/10">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="size-full rounded-full object-cover"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <HugeiconsIcon icon={AiBrain01Icon} size={28} strokeWidth={1.8} />
          </div>
        )}
      </div>

      <h1 className="text-xl font-bold tracking-tight">Hi, I&apos;m {name}</h1>
      <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
        I&apos;ll be running your initial interview today. I&apos;ll ask a few
        questions out loud and listen to your answers — just speak naturally.
      </p>

      <p className="mt-6 text-[15px] font-medium">Are you ready to begin?</p>

      {error ? (
        <p className="mt-3 text-[12px] font-medium text-destructive">{error}</p>
      ) : !ready ? (
        <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={14}
            strokeWidth={2}
            className="animate-spin"
          />
          Preparing your first question…
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button variant="outline" onClick={onNo}>
          Not yet
        </Button>
        <Button onClick={onYes} disabled={!ready}>
          Yes, I&apos;m ready
        </Button>
      </div>
    </div>
  )
}
