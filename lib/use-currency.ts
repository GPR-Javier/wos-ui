"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatMoney } from "@/lib/money"

// Visitor-local currency derived from USD canonical prices. The /api/pricing-locale route detects
// the country and returns USD→currency rates; here we pick the currency (auto, or a manual override
// persisted in localStorage) and expose convert/format helpers.

export interface LocalePricing {
  country: string
  currency: string
  rates: Record<string, number>
}

const STORAGE_KEY = "wos.currency"

export function useCurrency() {
  const { data } = useQuery<LocalePricing>({
    queryKey: ["pricing-locale"],
    queryFn: () => fetch("/api/pricing-locale").then((r) => r.json()),
    staleTime: 60 * 60_000,
    retry: false,
  })

  const [override, setOverride] = useState<string | null>(null)
  useEffect(() => {
    setOverride(localStorage.getItem(STORAGE_KEY))
  }, [])

  const rates = data?.rates ?? { USD: 1 }
  const auto = data?.currency ?? "USD"
  const currency = override && rates[override] ? override : rates[auto] ? auto : "USD"
  const rate = rates[currency] ?? 1
  const converted = currency !== "USD"

  function setCurrency(c: string) {
    setOverride(c)
    localStorage.setItem(STORAGE_KEY, c)
  }

  /** USD amount → local whole-unit amount. */
  const convert = (usd: number) => Math.round(usd * rate)
  /** USD amount → formatted local string, e.g. "₱1,653". */
  const format = (usd: number) => formatMoney(convert(usd), currency)

  return {
    currency,
    rate,
    converted,
    available: Object.keys(rates),
    setCurrency,
    convert,
    format,
  }
}
