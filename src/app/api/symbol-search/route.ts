import { NextRequest, NextResponse } from 'next/server'
import type { SymbolSearchResult } from '@/lib/types/candlestick'
import { getYahooFinance } from '@/lib/server/yahoo-finance'

// In-memory cache: query → { results, timestamp }
const cache = new Map<string, { results: SymbolSearchResult[]; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour — listings change rarely

/** Only tradeable instruments belong in the picker */
const ALLOWED_TYPES = new Set(['EQUITY', 'ETF'])

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('q') ?? '').trim()

  if (query.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const cacheKey = query.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ results: cached.results })
  }

  try {
    const yahooFinance = await getYahooFinance()
    const raw = await yahooFinance.search(query, { quotesCount: 12, newsCount: 0 })

    const results: SymbolSearchResult[] = (raw?.quotes ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q?.symbol && ALLOWED_TYPES.has(String(q.quoteType ?? '')))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((q: any) => ({
        symbol: String(q.symbol),
        // Yahoo pads some international names with trailing marker chars ("SAP SE   I")
        name: String(q.longname ?? q.shortname ?? '').replace(/\s{2,}\S{0,2}$/, '').trim(),
        exchange: String(q.exchDisp ?? q.exchange ?? ''),
        type: String(q.quoteType ?? ''),
      }))
      .slice(0, 8)

    cache.set(cacheKey, { results, timestamp: Date.now() })

    return NextResponse.json({ results })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Symbol search failed for "${query}":`, msg)
    // A failed lookup must not block submission — the user can still type a symbol.
    return NextResponse.json({ results: [], error: msg })
  }
}
