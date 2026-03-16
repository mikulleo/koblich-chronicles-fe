// src/hooks/use-trade-replay-data.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/api/client'

/* ------------------------------------------------------------------ */
/* Per-value type coercion helpers (NOT recursive)                     */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const str = (v: any): string => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  // Payload CMS {day,month,year} date object
  if (typeof v === 'object' && 'year' in v && 'month' in v && 'day' in v) {
    return `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`
  }
  try { return JSON.stringify(v) } catch { return '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const num = (v: any): number => {
  if (typeof v === 'number' && !isNaN(v)) return v
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDate = (v: any): string => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  // Payload CMS {day,month,year} date object
  if (typeof v === 'object' && 'year' in v && 'month' in v && 'day' in v) {
    return `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`
  }
  if (v instanceof Date) return v.toISOString()
  try { return new Date(v).toISOString() } catch { return '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const numOrNull = (v: any): number | null => {
  if (v == null) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

/* ------------------------------------------------------------------ */
/* Flat return types — every field is a primitive                      */
/* ------------------------------------------------------------------ */

export interface ReplayMeta {
  ticker: string
  tradeType: string
  setupType: string
  status: string
  duration: number
  returnPct: number
  normalizedReturnPct: number | null
  rRatio: number
  chartCount: number
  eventCount: number
  notes: string
}

export interface ReplayEvent {
  date: string
  type: string
  title: string
  price: number
  positionDesc: string
  riskPct: number
  prevStop: number
  newStop: number
  notes: string
  reason: string
  plPct: number | null
  normPlPct: number | null
}

export interface ReplayChart {
  id: string
  date: string
  imageUrl: string
  annotatedUrl: string
  role: string
}

export interface ReplayTrade {
  entryDate: string
  entryPrice: number
  stopLoss: number
  type: string
  symbol: string
  stops: Array<{ date: string; price: number; notes: string }>
  exits: Array<{ date: string; price: number; shares: number; reason: string; notes: string }>
  /** Subsequent buys on the same ticker detected as add-ons */
  adds: Array<{
    date: string
    price: number
    stopLoss: number
    normalizationFactor: number
    exits: Array<{ date: string; price: number; shares: number; reason: string; notes: string }>
    stops: Array<{ date: string; price: number; notes: string }>
  }>
}

export interface UseTradeReplayDataResult {
  meta: ReplayMeta | null
  events: ReplayEvent[]
  charts: ReplayChart[]
  trade: ReplayTrade | null
  isLoading: boolean
  error: string | null
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useTradeReplayData(tradeId: string): UseTradeReplayDataResult {
  const [meta, setMeta] = useState<ReplayMeta | null>(null)
  const [events, setEvents] = useState<ReplayEvent[]>([])
  const [charts, setCharts] = useState<ReplayChart[]>([])
  const [trade, setTrade] = useState<ReplayTrade | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get(`/trades/${tradeId}/story`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let d: any = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tradeRaw: any = null

      /* ── Handle 3 API response formats ── */
      if (data?.success && data.story) {
        d = data.story
        tradeRaw = data.trade
      } else if (data?.metadata) {
        d = data
        tradeRaw = data.trade
      } else if (data?.trade) {
        const t = data.trade
        tradeRaw = t
        d = {
          metadata: {
            ticker: t.ticker,
            tradeType: t.type,
            setupType: t.setupType,
            status: t.status,
            duration: t.daysHeld,
            totalReturnPercent: t.profitLossPercent ?? 0,
            normalizedTotalReturnPercent: t.normalizedMetrics?.profitLossPercent ?? null,
            rRatio: t.rRatio ?? 0,
            chartCount: t.relatedCharts?.length ?? 0,
            eventCount: 1 + (t.modifiedStops?.length ?? 0) + (t.exits?.length ?? 0),
          },
          timeline: [],
          charts: data.charts ?? [],
          notes: t.notes,
        }
      }

      if (!d) throw new Error('Unexpected story payload')

      /* ── Extract metadata (flat) ── */
      const md = d.metadata ?? {}
      const normalizedReturn =
        numOrNull(tradeRaw?.normalizedMetrics?.profitLossPercent)
        ?? numOrNull(md.normalizedTotalReturnPercent)

      const flatMeta: ReplayMeta = {
        ticker: str(md.ticker?.symbol ?? md.ticker),
        tradeType: str(md.tradeType),
        setupType: str(md.setupType),
        status: str(md.status),
        duration: num(md.duration),
        returnPct: num(md.totalReturnPercent),
        normalizedReturnPct: normalizedReturn,
        rRatio: num(md.rRatio),
        chartCount: num(md.chartCount),
        eventCount: num(md.eventCount),
        notes: str(d.notes),
      }

      /* ── Extract charts (flat) ── */
      const base = apiClient.defaults.baseURL?.split('/api')[0] ?? ''
      const absUrl = (url: string): string => {
        const u = str(url)
        return u.startsWith('http') ? u : base + u
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flatCharts: ReplayChart[] = (d.charts ?? []).map((c: any) => ({
        id: str(c.id),
        date: toDate(c.timestamp),
        imageUrl: absUrl(c.image?.url),
        annotatedUrl: c.annotatedImage?.url ? absUrl(c.annotatedImage.url) : '',
        role: str(c.tradeStory?.chartRole || 'chart'),
      }))

      /* ── Extract trade details (flat) ── */
      let flatTrade: ReplayTrade | null = null
      const tickerSymbol = flatMeta.ticker
      if (tradeRaw && tickerSymbol) {
        flatTrade = {
          entryDate: toDate(tradeRaw.entryDate),
          entryPrice: num(tradeRaw.entryPrice),
          stopLoss: num(tradeRaw.initialStopLoss),
          type: str(tradeRaw.type),
          symbol: tickerSymbol,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stops: (tradeRaw.modifiedStops ?? []).map((s: any) => ({
            date: toDate(s.date),
            price: num(s.price),
            notes: str(s.notes),
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          exits: (tradeRaw.exits ?? []).map((x: any) => ({
            date: toDate(x.date),
            price: num(x.price),
            shares: num(x.shares),
            reason: str(x.reason),
            notes: str(x.notes),
          })),
          adds: [],
        }

        // Detect add-on trades: other trades on same ticker that overlap in time
        try {
          const tickerId = typeof tradeRaw.ticker === 'object' ? tradeRaw.ticker?.id : tradeRaw.ticker
          if (tickerId) {
            const { data: allTradesData } = await apiClient.get('/trades', {
              params: { limit: 100, depth: 0, 'where[ticker][equals]': tickerId },
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allDocs: any[] = allTradesData?.docs ?? []
            const entryDate = toDate(tradeRaw.entryDate)
            const lastExitDate = flatTrade.exits.length > 0
              ? flatTrade.exits.reduce((latest, ex) => ex.date > latest ? ex.date : latest, flatTrade.exits[0].date)
              : ''

            for (const otherTrade of allDocs) {
              if (otherTrade.id === tradeId) continue
              const otherEntry = toDate(otherTrade.entryDate)
              // Add-on: same type, entered after our entry but before our last exit
              if (
                otherEntry > entryDate &&
                lastExitDate &&
                otherEntry <= lastExitDate &&
                str(otherTrade.type) === str(tradeRaw.type)
              ) {
                flatTrade.adds.push({
                  date: otherEntry,
                  price: num(otherTrade.entryPrice),
                  stopLoss: num(otherTrade.initialStopLoss),
                  normalizationFactor: num(otherTrade.normalizationFactor),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  exits: (otherTrade.exits ?? []).map((x: any) => ({
                    date: toDate(x.date),
                    price: num(x.price),
                    shares: num(x.shares),
                    reason: str(x.reason),
                    notes: str(x.notes),
                  })),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  stops: (otherTrade.modifiedStops ?? []).map((s: any) => ({
                    date: toDate(s.date),
                    price: num(s.price),
                    notes: str(s.notes),
                  })),
                })
              }
            }
            flatTrade.adds.sort((a, b) => a.date.localeCompare(b.date))
          }
        } catch {
          // Silently ignore add detection errors
        }
      }

      /* ── Extract timeline events (flat) ── */
      let flatEvents: ReplayEvent[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const timeline: any[] = d.timeline ?? []

      if (timeline.length > 0) {
        // Extract from existing timeline
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        flatEvents = timeline.map((evt: any) => {
          const det = evt.details ?? {}
          return {
            date: toDate(evt.date),
            type: str(evt.type),
            title: str(evt.title),
            price: num(det.price),
            positionDesc: str(det.positionSizeDescription),
            riskPct: num(det.riskPercent ?? det.initialRiskPercent),
            prevStop: num(det.previousStop ?? det.initialStop),
            newStop: num(det.newStop),
            notes: str(det.notes),
            reason: str(det.reason),
            plPct: numOrNull(det.profitLossPercent),
            normPlPct: numOrNull(det.normalizedProfitLossPercent),
          }
        })

        // Enrich entry events with position size description
        if (tradeRaw) {
          flatEvents = flatEvents.map((evt) => {
            if (evt.type === 'entry') {
              return {
                ...evt,
                positionDesc: evt.positionDesc || `${((num(tradeRaw.normalizationFactor) || 0) * 100).toFixed(0)}% of a full position`,
                riskPct: evt.riskPct || num(tradeRaw.riskPercent),
              }
            }
            return evt
          })
        } else {
          flatEvents = flatEvents.map((evt) => {
            if (evt.type === 'entry' && !evt.positionDesc) {
              return { ...evt, positionDesc: 'Position size info not available' }
            }
            return evt
          })
        }

        // Calculate P/L for exit events if not already present
        const entryEvt = flatEvents.find((e) => e.type === 'entry')
        const entryPrice = entryEvt?.price || num(tradeRaw?.entryPrice)
        const tradeType = flatMeta.tradeType || str(tradeRaw?.type) || 'long'

        if (entryPrice > 0) {
          const normFactor = num(tradeRaw?.normalizationFactor) || 1
          flatEvents = flatEvents.map((evt) => {
            if (evt.type === 'exit' && evt.plPct == null && evt.price > 0) {
              const priceChange = evt.price - entryPrice
              let plPct = (priceChange / entryPrice) * 100
              if (tradeType === 'short') plPct = -plPct
              return {
                ...evt,
                plPct: Number(plPct.toFixed(2)),
                normPlPct: Number((plPct * normFactor).toFixed(2)),
              }
            }
            return evt
          })
        }
      } else if (tradeRaw) {
        // Build timeline from raw trade data
        const t = tradeRaw
        const normFactor = num(t.normalizationFactor) || 1

        // Entry event
        flatEvents.push({
          date: toDate(t.entryDate),
          type: 'entry',
          title: 'Trade Entry',
          price: num(t.entryPrice),
          positionDesc: `${(normFactor * 100).toFixed(0)}% of a full position`,
          riskPct: num(t.riskPercent),
          prevStop: num(t.initialStopLoss),
          newStop: 0,
          notes: '',
          reason: '',
          plPct: null,
          normPlPct: null,
        })

        // Stop modification events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(t.modifiedStops ?? []).forEach((s: any) => {
          flatEvents.push({
            date: toDate(s.date),
            type: 'stopModified',
            title: 'Stop Loss Modified',
            price: 0,
            positionDesc: '',
            riskPct: 0,
            prevStop: num(t.initialStopLoss),
            newStop: num(s.price),
            notes: str(s.notes),
            reason: '',
            plPct: null,
            normPlPct: null,
          })
        })

        // Exit events
        const ep = num(t.entryPrice)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(t.exits ?? []).forEach((x: any) => {
          const xPrice = num(x.price)
          let plPct = 0
          let normPlPct = 0
          if (ep > 0 && xPrice > 0) {
            const priceChange = xPrice - ep
            plPct = (priceChange / ep) * 100
            if (str(t.type) === 'short') plPct = -plPct
            normPlPct = plPct * normFactor
          }
          flatEvents.push({
            date: toDate(x.date),
            type: 'exit',
            title: 'Position Exit',
            price: xPrice,
            positionDesc: '',
            riskPct: 0,
            prevStop: 0,
            newStop: 0,
            notes: str(x.notes),
            reason: str(x.reason),
            plPct: Number(plPct.toFixed(2)),
            normPlPct: Number(normPlPct.toFixed(2)),
          })
        })

        // Sort by date
        flatEvents.sort((a, b) => +new Date(a.date) - +new Date(b.date))
      }

      // Inject add-on events (runs for both timeline and raw-trade branches)
      if (flatTrade?.adds && flatTrade.adds.length > 0) {
        const tradeType = flatMeta.tradeType || str(tradeRaw?.type) || 'long'
        for (const add of flatTrade.adds) {
          // Skip if this add event is already in the timeline
          const addDateKey = add.date.split('T')[0]
          if (flatEvents.some(e => e.type === 'add' && e.date.split('T')[0] === addDateKey && e.price === add.price)) continue

          const addNorm = add.normalizationFactor || 1
          flatEvents.push({
            date: add.date,
            type: 'add',
            title: 'Add-on',
            price: add.price,
            positionDesc: `${(addNorm * 100).toFixed(0)}% add`,
            riskPct: 0,
            prevStop: 0,
            newStop: add.stopLoss,
            notes: '',
            reason: '',
            plPct: null,
            normPlPct: null,
          })

          for (const st of add.stops) {
            if (flatEvents.some(e => e.type === 'stopModified' && e.date.split('T')[0] === st.date.split('T')[0] && e.newStop === st.price)) continue
            flatEvents.push({
              date: st.date,
              type: 'stopModified',
              title: 'Add Stop Modified',
              price: 0,
              positionDesc: '',
              riskPct: 0,
              prevStop: add.stopLoss,
              newStop: st.price,
              notes: st.notes,
              reason: '',
              plPct: null,
              normPlPct: null,
            })
          }

          for (const x of add.exits) {
            if (flatEvents.some(e => e.type === 'exit' && e.date.split('T')[0] === x.date.split('T')[0] && e.price === x.price)) continue
            let addPlPct = 0
            if (add.price > 0 && x.price > 0) {
              const change = x.price - add.price
              addPlPct = (change / add.price) * 100
              if (tradeType === 'short') addPlPct = -addPlPct
            }
            flatEvents.push({
              date: x.date,
              type: 'exit',
              title: 'Add Exit',
              price: x.price,
              positionDesc: '',
              riskPct: 0,
              prevStop: 0,
              newStop: 0,
              notes: x.notes,
              reason: x.reason,
              plPct: Number(addPlPct.toFixed(2)),
              normPlPct: Number((addPlPct * addNorm).toFixed(2)),
            })
          }
        }
        flatEvents.sort((a, b) => +new Date(a.date) - +new Date(b.date))
      }

      setMeta(flatMeta)
      setEvents(flatEvents)
      setCharts(flatCharts)
      setTrade(flatTrade)
    } catch (e) {
      console.error('TradeReplayData fetch error:', e)
      setError(e instanceof Error ? e.message : 'Failed to load trade data')
    } finally {
      setIsLoading(false)
    }
  }, [tradeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { meta, events, charts, trade, isLoading, error }
}
