"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getSessionPersona } from "@/lib/interview-voice"

/**
 * Resolves the AI interviewer's persona (a display name paired with its TTS voice) and exposes a
 * `speak` that always uses that voice. The persona is chosen once per interview session (shared via
 * `getSessionPersona`), so the intro greeting and the question runner — which call this hook
 * independently — always show the same name and voice. Voices can load asynchronously, so the name
 * may settle from the neutral default once `voiceschanged` fires.
 */
export function useBotPersona() {
  const [name, setName] = useState("Alex")
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    const apply = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      const persona = getSessionPersona(voices)
      voiceRef.current = persona.voice
      setName(persona.name)
    }
    apply()
    window.speechSynthesis.addEventListener?.("voiceschanged", apply)
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", apply)
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text)
      return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = voiceRef.current?.lang ?? "en-US"
    if (voiceRef.current) u.voice = voiceRef.current
    window.speechSynthesis.speak(u)
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel()
  }, [])

  return { name, speak, stop }
}
