import { NextRequest, NextResponse } from 'next/server'
import type { CandleData } from '@/lib/types/candlestick'

// In-memory cache: key → { data, timestamp }
const cache = new Map<string, { data: CandleData[]; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Singleton yahoo-finance2 v3 instance (created lazily)
let yfInstance: any = null

async function getYahooFinance() {
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
    return NextResponse.json({ data: cached.data })
  }

  try {
    const yahooFinance = await getYahooFinance()

    const result = await yahooFinance.chart(symbol, {
      period1: bufferedStartDate,
      period2: bufferedEndDate,
      interval,
    })

    const quotes = result?.quotes
    if (!quotes || quotes.length === 0) {
      return NextResponse.json(
        { error: `No data found for ${symbol}` },
        { status: 404 }
      )
    }

    const candles: CandleData[] = quotes
      .filter((item: any) => item.open != null && item.high != null && item.low != null && item.close != null)
      .map((item: any) => ({
        time: item.date instanceof Date
          ? item.date.toISOString().split('T')[0]
          : new Date(item.date).toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }))

    // Sort by date ascending
    candles.sort((a, b) => a.time.localeCompare(b.time))

    // Store in cache
    cache.set(cacheKey, { data: candles, timestamp: Date.now() })

    return NextResponse.json({ data: candles })
  } catch (error: any) {
    const msg = error?.message ?? 'Unknown error'
    console.error(`Failed to fetch stock data for ${symbol}:`, msg)

    return NextResponse.json(
      { error: `Failed to fetch data for ${symbol}: ${msg}` },
      { status: 500 }
    )
  }
}
