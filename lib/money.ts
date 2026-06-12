// Currency formatting via the platform Intl API — no FX conversion here.
// Each plan declares the currency its prices are quoted in (server-side `Plan.currency`),
// so the UI only formats; it never converts. Multi-currency = a price book per plan, not math.

export const DEFAULT_CURRENCY = "PHP"

/** Locale to format in. Currency symbol comes from the currency code, not the locale. */
function nf(currency: string, withDecimals: boolean) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })
}

/** "₱1,800" (or "₱1,800.00" with decimals). */
export function formatMoney(
  amount: number,
  currency = DEFAULT_CURRENCY,
  withDecimals = false
): string {
  return nf(currency, withDecimals).format(amount)
}

/** The currency symbol alone, e.g. "₱". For layouts that style the symbol separately from the number. */
export function currencySymbol(currency = DEFAULT_CURRENCY): string {
  const part = nf(currency, false)
    .formatToParts(0)
    .find((p) => p.type === "currency")
  return part?.value ?? currency
}

/** Grouped number without a symbol, e.g. "1,800". */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    amount
  )
}
