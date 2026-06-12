import { NextRequest, NextResponse } from "next/server"

// Resolves the visitor's local currency from their location and returns USD→currency rates.
// Plan prices are canonical in USD (see wos-hr); the UI multiplies by the rate and formats locally.
// Rates come from a free, no-key FX API and are cached for a day (Next fetch revalidate).

const SUPPORTED = [
  "USD",
  "PHP",
  "EUR",
  "GBP",
  "JPY",
  "SGD",
  "AUD",
  "CAD",
  "INR",
  "AED",
]

// Country (ISO-3166 alpha-2) → currency. Unlisted countries fall back to USD.
const COUNTRY_CURRENCY: Record<string, string> = {
  PH: "PHP",
  US: "USD",
  GB: "GBP",
  JP: "JPY",
  SG: "SGD",
  AU: "AUD",
  CA: "CAD",
  IN: "INR",
  AE: "AED",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  IE: "EUR",
  PT: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
}

// Localhost/dev has no geo header — assume PH (overridable via env).
const DEFAULT_COUNTRY = (
  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "PH"
).toUpperCase()

// Last-resort static rates if the FX API is unreachable, so pricing always renders.
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  PHP: 57,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156,
  SGD: 1.35,
  AUD: 1.52,
  CAD: 1.37,
  INR: 83,
  AED: 3.67,
}

async function fetchRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 86400 }, // cache one day
    })
    const json = (await res.json()) as { rates?: Record<string, number> }
    const all = json?.rates ?? {}
    const out: Record<string, number> = { USD: 1 }
    for (const c of SUPPORTED) if (typeof all[c] === "number") out[c] = all[c]
    return Object.keys(out).length > 1 ? out : FALLBACK_RATES
  } catch {
    return FALLBACK_RATES
  }
}

export async function GET(req: NextRequest) {
  const country = (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    DEFAULT_COUNTRY
  ).toUpperCase()

  const rates = await fetchRates()
  const detected = COUNTRY_CURRENCY[country] ?? "USD"
  const currency = rates[detected] ? detected : "USD"

  return NextResponse.json({ country, currency, rates })
}
