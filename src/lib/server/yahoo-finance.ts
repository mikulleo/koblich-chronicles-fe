// Server-only singleton for yahoo-finance2, shared by the stock-data and
// symbol-search routes. Created lazily so the dependency is not pulled into
// the bundle until a route actually needs it.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let yfInstance: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getYahooFinance(): Promise<any> {
  if (!yfInstance) {
    // Suppress the "Unsupported environment" warning from yahoo-finance2
    const origWarn = console.warn
    console.warn = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('yahoo-finance2')) return
      origWarn.apply(console, args)
    }
    const YahooFinance = (await import('yahoo-finance2')).default
    yfInstance = new YahooFinance()
    console.warn = origWarn
  }
  return yfInstance
}

/**
 * Exchanges that quote in a minor unit (London in pence, Johannesburg in cents,
 * Tel Aviv in agorot). Yahoo returns OHLC in that minor unit, so a trade entered
 * in the major unit would sit 100x away from the candles. Normalize to the major
 * unit at the boundary so everything downstream deals in one scale.
 */
const MINOR_UNIT_CURRENCIES: Record<string, { major: string; divisor: number }> = {
  GBp: { major: 'GBP', divisor: 100 },
  ZAc: { major: 'ZAR', divisor: 100 },
  ILA: { major: 'ILS', divisor: 100 },
}

export interface CurrencyNormalization {
  /** Currency the prices are expressed in after normalization */
  currency: string
  /** Minor unit the provider originally quoted in, when it differed */
  quotedIn: string | null
  /** Factor applied to every price (1 when no conversion was needed) */
  divisor: number
}

export function resolveCurrency(rawCurrency: string | undefined | null): CurrencyNormalization {
  const raw = rawCurrency ?? ''
  const minor = MINOR_UNIT_CURRENCIES[raw]
  if (minor) {
    return { currency: minor.major, quotedIn: raw, divisor: minor.divisor }
  }
  return { currency: raw.toUpperCase(), quotedIn: null, divisor: 1 }
}
