'use client'

import React, { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
  type IPriceLine,
} from 'lightweight-charts'
import type { CandlestickChartProps, CandleData } from '@/lib/types/candlestick'

/* ------------------------------------------------------------------ */
/* SMA helper                                                          */
/* ------------------------------------------------------------------ */

function computeSMA(
  candles: CandleData[],
  period: number,
): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = []
  if (candles.length < period) return result
  let sum = 0
  for (let i = 0; i < period; i++) sum += candles[i].close
  result.push({ time: candles[period - 1].time, value: sum / period })
  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close
    result.push({ time: candles[i].time, value: sum / period })
  }
  return result
}

/* MA configs per interval */
const DAILY_MA = [
  { period: 10, color: '#3b82f6' },  // blue
  { period: 21, color: '#f59e0b' },  // amber
  { period: 50, color: '#ef4444' },  // red
]

const WEEKLY_MA = [
  { period: 10, color: '#3b82f6' },  // blue
  { period: 30, color: '#f59e0b' },  // amber
  { period: 40, color: '#ef4444' },  // red
]

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CandlestickChart({
  candles,
  revealCount,
  markers = [],
  priceLines = [],
  onPredictionClick,
  predictionMarkers = [],
  isPredictionMode = false,
  onPriceSelect,
  isPriceSelectMode = false,
  lastCandleOverride,
  height = 500,
  interval = '1d',
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const maSeriesRefs = useRef<ISeriesApi<'Line'>[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersPluginRef = useRef<any>(null)
  const priceLineMap = useRef<Map<string, IPriceLine>>(new Map())
  const prevRevealCountRef = useRef(0)
  const predictionCallbackRef = useRef(onPredictionClick)
  const isPredictionModeRef = useRef(isPredictionMode)
  const priceSelectCallbackRef = useRef(onPriceSelect)
  const isPriceSelectModeRef = useRef(isPriceSelectMode)

  predictionCallbackRef.current = onPredictionClick
  isPredictionModeRef.current = isPredictionMode
  priceSelectCallbackRef.current = onPriceSelect
  isPriceSelectModeRef.current = isPriceSelectMode

  // Create chart + all series ONCE
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#9ca3af',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#6b7280', labelBackgroundColor: '#374151' },
        horzLine: { color: '#6b7280', labelBackgroundColor: '#374151' },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#4b5563',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      visible: false,
    })

    // Create 3 MA line series
    const maConfigs = interval === '1wk' ? WEEKLY_MA : DAILY_MA
    const maSeries = maConfigs.map((cfg) =>
      chart.addSeries(LineSeries, {
        color: cfg.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      }),
    )

    const markersPlugin = createSeriesMarkers(series)

    chartRef.current = chart
    seriesRef.current = series
    volumeSeriesRef.current = volumeSeries
    maSeriesRefs.current = maSeries
    markersPluginRef.current = markersPlugin

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) chart.applyOptions({ width: entry.contentRect.width })
    })
    observer.observe(containerRef.current)

    chart.subscribeClick((param) => {
      if (!param.point) return
      const price = series.coordinateToPrice(param.point.y)
      if (price === null) return
      if (isPriceSelectModeRef.current && priceSelectCallbackRef.current) {
        priceSelectCallbackRef.current(price as number)
        return
      }
      if (isPredictionModeRef.current && predictionCallbackRef.current && param.time) {
        predictionCallbackRef.current(price as number, param.time as string)
      }
    })

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      volumeSeriesRef.current = null
      maSeriesRefs.current = []
      markersPluginRef.current = null
      priceLineMap.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, interval])

  // ── Data + markers + price lines + MAs: single coordinated effect ──
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !candles.length) return

    const series = seriesRef.current
    let visibleCandles = candles.slice(0, revealCount)

    if (lastCandleOverride && visibleCandles.length > 0) {
      const last = visibleCandles[visibleCandles.length - 1]
      visibleCandles = [
        ...visibleCandles.slice(0, -1),
        { ...last, ...lastCandleOverride },
      ]
    }

    // Deduplicate by time — lightweight-charts requires strictly ascending timestamps.
    // Keep the last entry for each timestamp (most up-to-date data).
    const seen = new Set<string>()
    const deduped: typeof visibleCandles = []
    for (let i = visibleCandles.length - 1; i >= 0; i--) {
      const t = String(visibleCandles[i].time)
      if (!seen.has(t)) {
        seen.add(t)
        deduped.push(visibleCandles[i])
      }
    }
    deduped.reverse()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    series.setData(deduped as any)

    // Volume — use deduped candles to stay in sync
    if (volumeSeriesRef.current) {
      const volumeData = deduped
        .filter(c => c.volume != null && c.volume > 0)
        .map(c => ({
          time: c.time,
          value: c.volume!,
          color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
        }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      volumeSeriesRef.current.setData(volumeData as any)
    }

    // Moving averages — use deduped to avoid duplicate-time assertion
    const maConfigs = interval === '1wk' ? WEEKLY_MA : DAILY_MA
    maSeriesRefs.current.forEach((maSeries, idx) => {
      if (idx < maConfigs.length) {
        const maData = computeSMA(deduped, maConfigs[idx].period)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        maSeries.setData(maData as any)
      }
    })

    // Markers
    if (markersPluginRef.current) {
      const visibleTimes = new Set(deduped.map((c) => c.time))

      const snapToCandle = (time: string): string | null => {
        if (visibleTimes.has(time)) return time
        let best: string | null = null
        for (const c of deduped) {
          if (c.time <= time) best = c.time
          else break
        }
        return best
      }

      const allMarkers = [...markers, ...predictionMarkers]
      const snapped = allMarkers
        .map((m) => {
          const t = snapToCandle(m.time)
          return t ? { ...m, time: t } : null
        })
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .sort((a, b) => a.time.localeCompare(b.time))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markersPluginRef.current.setMarkers(snapped.map((m) => ({
        time: m.time,
        position: m.position,
        color: m.color,
        shape: m.shape,
        text: m.text,
      })) as any)
    }

    // Price lines
    const desiredTitles = new Set(priceLines.map((pl) => pl.title))
    priceLineMap.current.forEach((lineRef, title) => {
      if (!desiredTitles.has(title)) {
        try {
          lineRef.applyOptions({
            price: 0,
            color: 'transparent',
            title: '',
            axisLabelVisible: false,
          })
        } catch { /* ignore */ }
      }
    })

    priceLines.forEach((pl) => {
      const existing = priceLineMap.current.get(pl.title)
      if (existing) {
        try {
          existing.applyOptions({
            price: pl.price,
            color: pl.color,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lineWidth: pl.lineWidth as any,
            lineStyle: pl.lineStyle,
            title: pl.title,
            axisLabelVisible: true,
          })
        } catch {
          try { series.removePriceLine(existing) } catch { /* ignore */ }
          const newRef = series.createPriceLine({
            price: pl.price,
            color: pl.color,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lineWidth: pl.lineWidth as any,
            lineStyle: pl.lineStyle,
            title: pl.title,
            axisLabelVisible: true,
          })
          priceLineMap.current.set(pl.title, newRef)
        }
      } else {
        const newRef = series.createPriceLine({
          price: pl.price,
          color: pl.color,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: pl.lineWidth as any,
          lineStyle: pl.lineStyle,
          title: pl.title,
          axisLabelVisible: true,
        })
        priceLineMap.current.set(pl.title, newRef)
      }
    })

    // Auto-scroll
    if (visibleCandles.length > 0 && revealCount !== prevRevealCountRef.current) {
      prevRevealCountRef.current = revealCount
      chartRef.current!.timeScale().scrollToPosition(5, false)
    }
  }, [candles, revealCount, markers, predictionMarkers, priceLines, lastCandleOverride, interval])

  const maConfigs = interval === '1wk' ? WEEKLY_MA : DAILY_MA
  const maLabels = interval === '1wk'
    ? ['10W', '30W', '40W']
    : ['10D', '21D', '50D']

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
      {/* MA Legend */}
      <div className="absolute bottom-6 left-2 z-20 flex items-center gap-2.5 bg-black/70 backdrop-blur-sm rounded px-2.5 py-1 pointer-events-none">
        {maConfigs.map((cfg, i) => (
          <div key={cfg.period} className="flex items-center gap-1">
            <div className="w-4 h-[2px] rounded-full" style={{ backgroundColor: cfg.color }} />
            <span className="text-[10px] font-mono leading-none" style={{ color: cfg.color }}>{maLabels[i]}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-1 right-2 text-[9px] text-gray-600 pointer-events-none">
        Powered by TradingView Lightweight Charts
      </div>
    </div>
  )
}
