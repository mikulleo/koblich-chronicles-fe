/**
 * Prices in the trade log are quoted in the currency of the exchange the ticker
 * trades on. That currency lives on the ticker (`ticker.currency`, filled in
 * from the market — see the backend's markets table), so a Prague trade is CZK
 * and a XETRA trade is EUR. Formatting everything as USD would mislabel every
 * non-US listing, so price cells format through here.
 *
 * Tickers saved before the market field existed carry no currency; those are
 * all US listings, hence the USD fallback.
 */

export const DEFAULT_CURRENCY = 'USD'

/**
 * Formats a price in the ticker's trading currency. A code Intl doesn't
 * recognize degrades to the plain number plus the code, rather than silently
 * showing dollars.
 */
export function formatCurrency(
  amount: number,
  currency?: string | null,
  options?: Intl.NumberFormatOptions,
): string {
  const code = (currency ?? '').trim().toUpperCase() || DEFAULT_CURRENCY

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      ...options,
    }).format(amount)
  } catch {
    const number = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount)
    return `${number} ${code}`
  }
}
