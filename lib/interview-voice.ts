// Gives the AI interviewer a name while using the browser's OWN default voice — the natural one the
// system/browser picks when no voice is specified. (Forcing specific Microsoft voices like "Zira"
// sounds robotic, so we deliberately don't.) The name is matched to the default voice's inferred
// gender, since the Web Speech API has no reliable gender field. Resolved once per interview session
// so the intro greeting and the question runner always agree; `resetSessionPersona()` clears it.

export interface BotPersona {
  name: string
  voice: SpeechSynthesisVoice | null
}

// The interviewer is a fixed female persona ("Genette"), so we must pick a FEMALE voice — the system
// default can be male. Among the female voices we prefer the natural-sounding ones (Google / "Natural"
// / "Online") over the robotic Microsoft "Zira".
const BOT_NAME = "Gennette"

function isFemaleVoice(name: string): boolean {
  const n = name.toLowerCase()
  // "Google US English" is female but doesn't say so in its name.
  if (n.includes("google us english")) return true
  if (n.includes("google uk english female")) return true
  return [
    "zira",
    "aria",
    "jenny",
    "samantha",
    "victoria",
    "karen",
    "moira",
    "tessa",
    "fiona",
    "susan",
    "linda",
    "catherine",
    "serena",
    "sonia",
    "libby",
    "michelle",
    "eva",
    "hazel",
    "female",
    "woman",
  ].some((h) => n.includes(h))
}

function isMaleVoice(name: string): boolean {
  const n = name.toLowerCase()
  if (n.includes("google uk english male")) return true
  return [
    "guy",
    "david",
    "mark",
    "daniel",
    "fred",
    "george",
    "james",
    "oliver",
    "arthur",
    "ryan",
    "male",
    "man",
  ].some((h) => n.includes(h))
}

/** Naturalness preference among candidate female voices (higher = more natural). */
function naturalness(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase()
  let s = 0
  if (n.includes("natural") || n.includes("online")) s += 4
  if (n.includes("google")) s += 3
  if (n.includes("aria") || n.includes("jenny") || n.includes("samantha"))
    s += 2
  if (n.includes("zira")) s -= 1 // robotic — last resort
  if (v.default) s += 1
  return s
}

/** A female voice (preferring the most natural-sounding), named "Genette". */
export function pickPersona(voices: SpeechSynthesisVoice[]): BotPersona {
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"))
  const pool = english.length ? english : voices

  const females = pool
    .filter((v) => isFemaleVoice(v.name) && !isMaleVoice(v.name))
    .sort((a, b) => naturalness(b) - naturalness(a))

  const voice = females[0] ?? pool.find((v) => v.default) ?? pool[0] ?? null
  return { name: BOT_NAME, voice }
}

// One persona per interview session, shared across the intro + runner so they never diverge.
let sessionPersona: BotPersona | null = null

/**
 * The persona for the current interview, resolved once (when voices first become available) and
 * reused thereafter. Returns a transient default while voices are still loading.
 */
export function getSessionPersona(voices: SpeechSynthesisVoice[]): BotPersona {
  if (sessionPersona) return sessionPersona
  if (!voices.length) return { name: BOT_NAME, voice: null }
  const persona = pickPersona(voices)
  if (persona.voice) sessionPersona = persona
  return persona
}

/** Clear the cached persona (call when starting a new interview). */
export function resetSessionPersona() {
  sessionPersona = null
}
