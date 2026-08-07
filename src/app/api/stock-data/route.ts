import { NextRequest, NextResponse } from 'next/server'
import type { CandleData, SplitEvent, StockMeta } from '@/lib/types/candlestick'
import { getYahooFinance, resolveCurrency } from '@/lib/server/yahoo-finance'

// In-memory cache: key → { data, timestamp }
const cache = new Map<
  string,
  { data: CandleData[]; splits: SplitEvent[]; meta: StockMeta; timestamp: number }
>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getCacheKey(symbol: string, startDate: string, endDate: string): string {
  return `${symbol}:${startDate}:${endDate}`
}

/** Extract YYYY-MM-DD from any date string (ISO, plain date, etc.) */
function toDateStr(input: string): string {
  return new Date(input).toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const buffer = parseInt(searchParams.get('buffer') ?? '30', 10)
  const interval = searchParams.get('interval') === '1wk' ? '1wk' : '1d'

  if (!symbol || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required parameters: symbol, startDate, endDate' },
      { status: 400 }
    )
  }

  // Compute buffered start date (buffer trading days before entry)
  const start = new Date(startDate)
  start.setDate(start.getDate() - Math.ceil(buffer * 1.5)) // ~1.5x to account for weekends
  const bufferedStartDate = toDateStr(start.toISOString())

  // Add a few days buffer after end date too
  const end = new Date(endDate)
  end.setDate(end.getDate() + 5)
  const bufferedEndDate = toDateStr(end.toISOString())

  const cacheKey = getCacheKey(symbol, bufferedStartDate, bufferedEndDate) + `:${interval}`

  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ data: cached.data, splits: cached.splits, meta: cached.meta })
  }

  try {
    const yahooFinance = await getYahooFinance()

    const result = await yahooFinance.chart(symbol, {
      period1: bufferedStartDate,
      period2: bufferedEndDate,
      interval,
      events: 'split',
    })

    const quotes = result?.quotes
    if (!quotes || quotes.length === 0) {
      return NextResponse.json(
        { error: `No data found for ${symbol}` },
        { status: 404 }
      )
    }

    // Non-US listings may be quoted in a minor unit (LSE in pence, JSE in cents).
    // Convert to the major unit so trade prices entered in pounds/rand line up.
    const { currency, quotedIn, divisor } = resolveCurrency(result?.meta?.currency)

    const candles: CandleData[] = quotes
      .filter((item: any) => item.open != null && item.high != null && item.low != null && item.close != null)
      .map((item: any) => ({
        time: item.date instanceof Date
          ? item.date.toISOString().split('T')[0]
          : new Date(item.date).toISOString().split('T')[0],
        open: item.open / divisor,
        high: item.high / divisor,
        low: item.low / divisor,
        close: item.close / divisor,
        volume: item.volume,
      }))

    // Sort by date ascending
    candles.sort((a, b) => a.time.localeCompare(b.time))

    // Extract splits. yahoo-finance2 returns either an array or a keyed object depending on version.
    const splitsRaw = result?.events?.splits
    const splitsArr: unknown[] = Array.isArray(splitsRaw)
      ? splitsRaw
      : splitsRaw && typeof splitsRaw === 'object'
        ? Object.values(splitsRaw)
        : []
    const splits: SplitEvent[] = splitsArr
      .map((raw) => raw as { date?: unknown; numerator?: unknown; denominator?: unknown })
      .filter((s) => s.numerator && s.denominator && s.date)
      .map((s) => ({
        date: s.date instanceof Date
          ? s.date.toISOString().split('T')[0]
          : new Date(s.date as string | number).toISOString().split('T')[0],
        numerator: Number(s.numerator),
        denominator: Number(s.denominator),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const meta: StockMeta = {
      symbol: String(result?.meta?.symbol ?? symbol),
      currency,
      quotedIn,
      exchange: String(result?.meta?.fullExchangeName ?? result?.meta?.exchangeName ?? ''),
    }

    // Store in cache
    cache.set(cacheKey, { data: candles, splits, meta, timestamp: Date.now() })

    return NextResponse.json({ data: candles, splits, meta })
  } catch (error: any) {
    const msg = error?.message ?? 'Unknown error'
    console.error(`Failed to fetch stock data for ${symbol}:`, msg)

    return NextResponse.json(
      { error: `Failed to fetch data for ${symbol}: ${msg}` },
      { status: 500 }
    )
  }
}
