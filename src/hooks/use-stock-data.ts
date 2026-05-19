'use client'

import { useState, useEffect, useRef } from 'react'
import type { CandleData, SplitEvent } from '@/lib/types/candlestick'

interface UseStockDataOptions {
  symbol: string
  startDate: string
  endDate: string
  buffer?: number
  interval?: '1d' | '1wk'
  enabled?: boolean
}

interface UseStockDataResult {
  candles: CandleData[]
  splits: SplitEvent[]
  isLoading: boolean
  error: string | null
}

export function useStockData({
  symbol,
  startDate,
  endDate,
  buffer = 30,
  interval = '1d',
  enabled = true,
}: UseStockDataOptions): UseStockDataResult {
  const [candles, setCandles] = useState<CandleData[]>([])
  const [splits, setSplits] = useState<SplitEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled || !symbol || !startDate || !endDate) return

    // Abort previous request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    // Normalize dates to YYYY-MM-DD to avoid encoding issues with ISO timestamps
    const normalizeDate = (d: string) => new Date(d).toISOString().split('T')[0]
    const params = new URLSearchParams({
      symbol,
      startDate: normalizeDate(startDate),
      endDate: normalizeDate(endDate),
      buffer: buffer.toString(),
      interval,
    })

    fetch(`/api/stock-data?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setCandles(json.data)
        setSplits(Array.isArray(json.splits) ? json.splits : [])
        setIsLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [symbol, startDate, endDate, buffer, interval, enabled])

  return { candles, splits, isLoading, error }
}
