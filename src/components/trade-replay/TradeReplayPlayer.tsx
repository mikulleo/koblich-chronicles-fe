// src/components/trade-replay/TradeReplayPlayer.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { format, differenceInDays } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  TrendingUp,
  Shield,
  LogOut,
  Eye,
  EyeOff,
  FastForward,
  RotateCcw,
  CandlestickChart as CandlestickIcon,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useAnalytics } from '@/hooks/use-analytics'
import { useStockData } from '@/hooks/use-stock-data'
import { useUserPortfolio } from '@/hooks/use-user-portfolio'
import { useTradeReplayData } from '@/hooks/use-trade-replay-data'
import type { ReplayEvent, ReplayChart } from '@/hooks/use-trade-replay-data'
import CandlestickChart from './CandlestickChart'
import UserActionOverlay from './UserActionOverlay'
import PerformanceSummary from './PerformanceSummary'
import type { TradeDetails, TradeMarker, PriceLine, DecisionPoint, CandleData } from '@/lib/types/candlestick'

/* ------------------------------------------------------------------ */
/* Safe-string helper: wraps EVERY dynamic value rendered as JSX child */
/* ------------------------------------------------------------------ */

const s = (v: unknown): string => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return String(v)
  if (typeof v === 'object' && v !== null) {
    if ('year' in v && 'month' in v && 'day' in v) {
      const o = v as Record<string, unknown>
      return `${o.year}-${String(o.month).padStart(2, '0')}-${String(o.day).padStart(2, '0')}`
    }
    try { return JSON.stringify(v) } catch { return '[object]' }
  }
  return String(v)
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

interface TradeReplayPlayerProps {
  tradeId: string
  onClose: () => void
}

const CANDLE_SPEED_OPTIONS = [
  { label: '0.5x', ms: 500 },
  { label: '1x', ms: 250 },
  { label: '2x', ms: 120 },
  { label: '3x', ms: 60 },
]

/** How many candles before entry to start the replay */
const PRE_ENTRY_CANDLES = 10

/* ------------------------------------------------------------------ */
/* Small UI helpers                                                    */
/* ------------------------------------------------------------------ */

const getEventIcon = (type: string) => {
  switch (type) {
    case 'entry': return <TrendingUp className="h-4 w-4" />
    case 'add': return <TrendingUp className="h-4 w-4" />
    case 'stopModified': return <Shield className="h-4 w-4" />
    case 'exit': return <LogOut className="h-4 w-4" />
    default: return <TrendingUp className="h-4 w-4" />
  }
}

const getEventColor = (type: string) => {
  switch (type) {
    case 'entry': return 'bg-green-500'
    case 'add': return 'bg-blue-500'
    case 'stopModified': return 'bg-yellow-500'
    case 'exit': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

const getEventBorderColor = (type: string) => {
  switch (type) {
    case 'entry': return 'border-green-500/50'
    case 'add': return 'border-blue-500/50'
    case 'stopModified': return 'border-yellow-500/50'
    case 'exit': return 'border-red-500/50'
    default: return 'border-gray-500/50'
  }
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'entry': return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'management': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'stopAdjustment': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'exit': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'analysis': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

/* ------------------------------------------------------------------ */
/* ErrorBoundary — last-resort crash guard                             */
/* ------------------------------------------------------------------ */

interface EBProps { onClose: () => void; children: React.ReactNode }
interface EBState { hasError: boolean; error: string }

class ReplayErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  componentDidCatch(error: Error) {
    console.error('TradeReplayPlayer crashed:', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <p className="text-red-400 text-lg mb-2">Replay crashed</p>
            <p className="text-gray-500 text-sm mb-6">{this.state.error}</p>
            <Button variant="outline" onClick={this.props.onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Close
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* ------------------------------------------------------------------ */
/* Exported component (ErrorBoundary wrapper)                          */
/* ------------------------------------------------------------------ */

export default function TradeReplayPlayer(props: TradeReplayPlayerProps) {
  return (
    <ReplayErrorBoundary onClose={props.onClose}>
      <ReplayInner {...props} />
    </ReplayErrorBoundary>
  )
}

/* ------------------------------------------------------------------ */
/* Inner component — all hooks + render                                */
/* ------------------------------------------------------------------ */

function ReplayInner({ tradeId, onClose }: TradeReplayPlayerProps) {
  /* ── Data from the flat-extraction hook ── */
  const { meta, events, charts, trade, isLoading: dataLoading, error: dataError } = useTradeReplayData(tradeId)

  /* ── Playback state ── */
  const [phase, setPhase] = useState<'intro' | 'replay' | 'done'>('intro')
  const [candleIdx, setCandleIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(1)
  // paused is now derived from portfolioBusy (see below)
  const [predictions, setPredictions] = useState(true)  // prediction mode toggle
  const [candlestickView, setCandlestickView] = useState(true)
  const [chartInterval, setChartInterval] = useState<'1d' | '1wk'>('1d')
  const [showControls, setShowControls] = useState(true)
  const [showSetupPrompt, setShowSetupPrompt] = useState(false)
  const [revealedDecisionKeys, setRevealedDecisionKeys] = useState<string[]>([])
  const controlsTimer = useRef<NodeJS.Timeout | null>(null)
  const { trackEvent } = useAnalytics()

  /* ── TradeDetails for CandlestickChart (constructed from flat trade) ── */
  const tradeDetails: TradeDetails | undefined = useMemo(() => {
    if (!trade) return undefined
    return {
      entryDate: trade.entryDate,
      entryPrice: trade.entryPrice,
      initialStopLoss: trade.stopLoss,
      type: trade.type as 'long' | 'short',
      modifiedStops: trade.stops.map((st) => ({ price: st.price, date: st.date, notes: st.notes })),
      exits: trade.exits.map((ex) => ({ price: ex.price, shares: ex.shares, date: ex.date, reason: ex.reason, notes: ex.notes })),
      tickerSymbol: trade.symbol,
    }
  }, [trade])

  /* ── Stock data for candlestick chart ── */
  const lastExitDate = useMemo(() => {
    if (!tradeDetails?.exits?.length) return tradeDetails?.entryDate ?? ''
    return tradeDetails.exits.reduce((latest, exit) => (exit.date > latest ? exit.date : latest), tradeDetails.exits[0].date)
  }, [tradeDetails])

  const chartEndDate = useMemo(() => {
    const d = new Date(lastExitDate || new Date().toISOString())
    d.setDate(d.getDate() + 14)
    return d.toISOString()
  }, [lastExitDate])

  // Daily candles — always fetched, used for playback engine
  const { candles: dailyCandles, isLoading: dailyCandlesLoading, error: dailyCandlesError } = useStockData({
    symbol: tradeDetails?.tickerSymbol ?? '',
    startDate: tradeDetails?.entryDate ?? '',
    endDate: chartEndDate,
    buffer: 500,
    interval: '1d',
    enabled: !!tradeDetails?.tickerSymbol && !!tradeDetails?.entryDate && candlestickView,
  })

  // Weekly candles — fetched only when weekly view is active
  const { candles: weeklyCandles, isLoading: weeklyLoading } = useStockData({
    symbol: tradeDetails?.tickerSymbol ?? '',
    startDate: tradeDetails?.entryDate ?? '',
    endDate: chartEndDate,
    buffer: 1500,
    interval: '1wk',
    enabled: !!tradeDetails?.tickerSymbol && !!tradeDetails?.entryDate && candlestickView && chartInterval === '1wk',
  })

  // Playback always uses daily candles; chart display uses selected interval
  const candles = dailyCandles
  const candlesLoading = dailyCandlesLoading || (chartInterval === '1wk' && weeklyLoading)
  const candlesError = dailyCandlesError
  const displayCandles = chartInterval === '1wk' ? weeklyCandles : dailyCandles

  // For weekly: compute reveal count from currentCandleDate
  const weeklyRevealCount = useMemo(() => {
    if (chartInterval !== '1wk' || !weeklyCandles.length || candleIdx < 0) return 0
    const currentDate = dailyCandles[Math.min(candleIdx, dailyCandles.length - 1)]?.time ?? ''
    if (!currentDate) return 0
    let count = 0
    for (const wc of weeklyCandles) {
      if (wc.time <= currentDate) count++
      else break
    }
    return count
  }, [chartInterval, weeklyCandles, dailyCandles, candleIdx])

  const chartRevealCount = chartInterval === '1wk' ? weeklyRevealCount : candleIdx + 1
  const hasCandleData = candles.length > 0 && !candlesError && candlestickView

  /* ── Portfolio / Think Along system ── */
  const portfolio = useUserPortfolio()
  const promptedDecisionsRef = useRef<Set<string>>(new Set())
  const currentPromptedEventRef = useRef<ReplayEvent | null>(null)
  const entryPromptedRef = useRef(false)
  const stopCheckedCandlesRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!predictions) {
      portfolio.reset()
      promptedDecisionsRef.current.clear()
      entryPromptedRef.current = false
      stopCheckedCandlesRef.current.clear()
      setRevealedDecisionKeys([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions])

  const portfolioBusy = predictions && portfolio.phase !== 'idle'

  /* ── Candle animation state ── */
  const [stopHitAnimating, setStopHitAnimating] = useState(false)
  const [lastCandleOverride, setLastCandleOverride] = useState<{ open: number; high: number; low: number; close: number } | null>(null)
  const stopHitAnimCandleRef = useRef<CandleData | null>(null)
  const stopHitAnimatingRef = useRef(false) // synced ref for cross-effect communication
  const candleAnimTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const skipCandleAnimRef = useRef(-1)

  /* ── Entry candle index ── */
  const entryDateStr = tradeDetails?.entryDate?.split('T')[0] ?? ''
  const entryCandleIdx = useMemo(() => {
    if (!candles.length || !entryDateStr) return 0
    for (let i = 0; i < candles.length; i++) {
      if (candles[i].time >= entryDateStr) return i
    }
    return candles.length - 1
  }, [candles, entryDateStr])

  /* ── Current candle date string ── */
  const currentCandleDate = useMemo(() => {
    if (candleIdx < 0 || !candles.length) return ''
    const idx = Math.min(candleIdx, candles.length - 1)
    return candles[idx].time
  }, [candleIdx, candles])

  /* ── Visible events based on current candle date ── */
  const visibleEvents = useMemo((): ReplayEvent[] => {
    if (!currentCandleDate) return []
    return events.filter((evt) => {
      const evtDate = evt.date.split('T')[0]
      return evtDate <= currentCandleDate
    })
  }, [events, currentCandleDate])

  /* ── Decision events at CURRENT candle (supports multiple on same day) ── */
  const currentDecisionEvents = useMemo((): ReplayEvent[] => {
    if (!currentCandleDate) return []
    return events.filter((evt) => {
      const evtDate = evt.date.split('T')[0]
      return evtDate === currentCandleDate && (evt.type === 'stopModified' || evt.type === 'exit' || evt.type === 'add')
    })
  }, [events, currentCandleDate])

  /* ── Sidebar events: hide unrevealed decisions when guessing game is on ── */
  const sidebarEvents = useMemo((): ReplayEvent[] => {
    if (!predictions) return visibleEvents
    if (portfolio.hasDeclinedEntry) return visibleEvents
    const revealed = new Set(revealedDecisionKeys)
    return visibleEvents.filter((evt) => {
      const key = evt.type === 'entry'
        ? `entry-${evt.date.split('T')[0]}`
        : `${evt.type}-${evt.date.split('T')[0]}`
      return revealed.has(key)
    })
  }, [visibleEvents, predictions, revealedDecisionKeys, portfolio.hasDeclinedEntry])

  /* ── Live metrics — use sidebarEvents so Leoš's data is hidden until revealed ── */
  const liveMetrics = useMemo(() => {
    const source = predictions && !portfolio.hasDeclinedEntry ? sidebarEvents : visibleEvents
    const entry = source.find((e) => e.type === 'entry')
    let currentStop = entry ? (entry.prevStop || entry.price) : 0
    let lastExitPL: number | null = null
    let lastExitNormPL: number | null = null
    let tradeCompleted = false
    let daysFromEntry = 0
    const exitReasons: string[] = []

    source.forEach((evt) => {
      if (evt.type === 'stopModified' && evt.newStop > 0) {
        currentStop = evt.newStop
      }
      if (evt.type === 'exit') {
        lastExitPL = evt.plPct
        lastExitNormPL = evt.normPlPct
        tradeCompleted = true
        if (evt.reason) exitReasons.push(evt.reason)
      }
    })

    if (entry && currentCandleDate) {
      try {
        daysFromEntry = differenceInDays(new Date(currentCandleDate + 'T12:00:00'), new Date(entry.date))
      } catch {
        daysFromEntry = 0
      }
    }

    return {
      entryPrice: entry ? entry.price : null,
      currentStop,
      positionSize: entry ? entry.positionDesc : null,
      initialRisk: entry ? entry.riskPct : null,
      profitLossPercent: lastExitPL,
      normalizedProfitLossPercent: lastExitNormPL,
      tradeCompleted,
      daysFromEntry,
      exitReasons,
    }
  }, [visibleEvents, sidebarEvents, currentCandleDate, predictions, portfolio.hasDeclinedEntry])

  /* ── Trade markers for CandlestickChart ── */
  const tradeMarkers = useMemo((): TradeMarker[] => {
    if (!hasCandleData || !tradeDetails) return []
    const mkrs: TradeMarker[] = []
    const isLong = tradeDetails.type === 'long'

    visibleEvents.forEach((evt) => {
      const evtDate = evt.date.split('T')[0]
      if (evt.type === 'entry') {
        mkrs.push({
          time: evtDate,
          position: isLong ? 'belowBar' : 'aboveBar',
          color: '#22c55e',
          shape: isLong ? 'arrowUp' : 'arrowDown',
          text: '',
          type: 'entry',
        })
      } else if (evt.type === 'add') {
        mkrs.push({
          time: evtDate,
          position: isLong ? 'belowBar' : 'aboveBar',
          color: '#3b82f6',
          shape: isLong ? 'arrowUp' : 'arrowDown',
          text: '',
          type: 'add',
        })
      } else if (evt.type === 'stopModified') {
        mkrs.push({
          time: evtDate,
          position: isLong ? 'belowBar' : 'aboveBar',
          color: '#eab308',
          shape: 'square',
          text: '',
          type: 'stopModified',
        })
      } else if (evt.type === 'exit') {
        mkrs.push({
          time: evtDate,
          position: isLong ? 'aboveBar' : 'belowBar',
          color: '#ef4444',
          shape: isLong ? 'arrowDown' : 'arrowUp',
          text: '',
          type: 'exit',
        })
      }
    })
    return mkrs
  }, [hasCandleData, tradeDetails, visibleEvents])

  /* ── Leoš's price lines — filtered by what's been revealed ── */
  const leosPriceLines = useMemo((): PriceLine[] => {
    if (!hasCandleData || !tradeDetails) return []
    if (!visibleEvents.some((e) => e.type === 'entry')) return []

    // When Think Along is active, only show after user has seen the reveal
    if (predictions && !portfolio.hasDeclinedEntry) {
      const revealed = new Set(revealedDecisionKeys)
      const entryRevealed = [...revealed].some(k => k.startsWith('entry-'))
      if (!entryRevealed) return []

      const lines: PriceLine[] = []
      lines.push({ price: tradeDetails.entryPrice, color: '#22c55e', lineWidth: 1, lineStyle: 2, title: 'Leo' })

      let currentStop = tradeDetails.initialStopLoss
      visibleEvents.forEach((evt) => {
        if (evt.type === 'stopModified' && evt.newStop > 0) {
          const key = `stopModified-${evt.date.split('T')[0]}`
          if (revealed.has(key)) currentStop = evt.newStop
        }
      })
      if (currentStop > 0) {
        lines.push({ price: currentStop, color: '#eab308', lineWidth: 1, lineStyle: 1, title: 'LStp' })
      }
      return lines
    }

    // Not in Think Along — show everything
    const lines: PriceLine[] = []
    lines.push({ price: tradeDetails.entryPrice, color: '#22c55e', lineWidth: 1, lineStyle: 2, title: 'Entry' })
    let currentStop = tradeDetails.initialStopLoss
    visibleEvents.forEach((evt) => {
      if (evt.type === 'stopModified' && evt.newStop > 0) currentStop = evt.newStop
    })
    if (currentStop > 0) {
      lines.push({ price: currentStop, color: '#eab308', lineWidth: 1, lineStyle: 1, title: 'Stop' })
    }
    return lines
  }, [hasCandleData, tradeDetails, visibleEvents, predictions, portfolio.hasDeclinedEntry, revealedDecisionKeys])

  /* ── Leoš's trade markers — filtered by revealed ── */
  const filteredTradeMarkers = useMemo((): TradeMarker[] => {
    if (!predictions || portfolio.hasDeclinedEntry) return tradeMarkers
    const revealed = new Set(revealedDecisionKeys)
    return tradeMarkers.filter(m => {
      // 'add' markers should check add- key, others use their own type
      const key = `${m.type}-${m.time}`
      if (revealed.has(key)) return true
      // Also check entry- key for add markers (in case revealed as part of entry flow)
      if (m.type === 'add' && revealed.has(`entry-${m.time}`)) return true
      return false
    })
  }, [predictions, portfolio.hasDeclinedEntry, tradeMarkers, revealedDecisionKeys])

  /* ── User portfolio price lines (entries + stops) ── */
  const userPortfolioPriceLines = useMemo((): PriceLine[] => {
    if (!predictions || !portfolio.isActive) return []
    return portfolio.userPriceLines
  }, [predictions, portfolio.isActive, portfolio.userPriceLines])

  /* ── Combined price lines ── */
  const allPriceLines = useMemo((): PriceLine[] => {
    return [...leosPriceLines, ...userPortfolioPriceLines]
  }, [leosPriceLines, userPortfolioPriceLines])

  /* ── Build decision point from one or more events on the same day ── */
  const buildDecisionPoint = useCallback(
    (evts: ReplayEvent[], idx: number): DecisionPoint | null => {
      if (evts.length === 0) return null

      const actualDecisions: ('buy' | 'sell' | 'hold' | 'tightenStop')[] = []
      const optionsSet = new Set<'buy' | 'sell' | 'hold' | 'tightenStop'>()
      let price: number | undefined

      for (const evt of evts) {
        if (evt.type === 'add') {
          actualDecisions.push('buy')
          optionsSet.add('buy')
          optionsSet.add('sell')
          optionsSet.add('hold')
          optionsSet.add('tightenStop')
          if (!price) price = evt.price
        }
        if (evt.type === 'stopModified') {
          actualDecisions.push('tightenStop')
          optionsSet.add('hold')
          optionsSet.add('tightenStop')
          optionsSet.add('sell')
          if (!price) price = evt.newStop
        }
        if (evt.type === 'exit') {
          actualDecisions.push('sell')
          optionsSet.add('buy')
          optionsSet.add('sell')
          optionsSet.add('hold')
          optionsSet.add('tightenStop')
          if (!price) price = evt.price
        }
      }

      if (actualDecisions.length === 0) return null

      const prompt = evts.length > 1
        ? 'Multiple things could happen here. What would you do?'
        : evts[0].type === 'stopModified'
          ? 'The stock has moved. What would you do with the stop loss?'
          : "Conditions have changed. What's your move?"

      return {
        prompt,
        options: [...optionsSet],
        actualDecision: actualDecisions[0],
        actualDecisions,
        actualPrice: price,
        stepIndex: idx,
      }
    },
    []
  )

  /* ── Auto-pause: prompt entry at entry candle ── */
  useEffect(() => {
    if (!predictions || !tradeDetails || portfolio.phase !== 'idle') return
    if (portfolio.isActive || portfolio.hasDeclinedEntry) return
    if (entryPromptedRef.current) return
    if (candleIdx >= entryCandleIdx && candleIdx >= 0) {
      entryPromptedRef.current = true
      setPlaying(false)
      portfolio.promptEntry(tradeDetails.type as 'long' | 'short')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candleIdx, entryCandleIdx, predictions, portfolio.phase, portfolio.isActive, portfolio.hasDeclinedEntry])

  /* ── Auto-pause: prompt at decision points one at a time (sequential) ── */
  useEffect(() => {
    if (!predictions || !portfolio.isActive || portfolio.phase !== 'idle') return
    if (currentDecisionEvents.length === 0) return

    // Find the first event on this day that hasn't been prompted yet
    const nextEvt = currentDecisionEvents.find(evt => {
      const key = `${evt.type}-${evt.date}-${evt.price}-${evt.newStop}`
      return !promptedDecisionsRef.current.has(key)
    })
    if (!nextEvt) return

    const key = `${nextEvt.type}-${nextEvt.date}-${nextEvt.price}-${nextEvt.newStop}`
    const dp = buildDecisionPoint([nextEvt], candleIdx)
    if (dp) {
      promptedDecisionsRef.current.add(key)
      currentPromptedEventRef.current = nextEvt
      setPlaying(false)
      portfolio.promptDecision(dp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDecisionEvents, candleIdx, predictions, portfolio.phase, portfolio.isActive])

  /* ── Stop hit detection on each new candle (manual stepping) ── */
  useEffect(() => {
    if (!predictions || candleIdx < 0 || candleIdx >= candles.length) return
    if (stopCheckedCandlesRef.current.has(candleIdx)) return
    if (stopHitAnimatingRef.current) return // animation handles this
    stopCheckedCandlesRef.current.add(candleIdx)

    if (!portfolio.isActive || portfolio.phase !== 'idle') return
    const candle = candles[candleIdx]
    if (portfolio.checkStopHit(candle.low, candle.high)) {
      setPlaying(false)
      stopHitAnimatingRef.current = true
      setStopHitAnimating(true)
      stopHitAnimCandleRef.current = candle
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candleIdx])

  /* ── Stop-hit candle animation: grow candle from open toward stop (slow) ── */
  useEffect(() => {
    if (!stopHitAnimating || !stopHitAnimCandleRef.current) return

    const candle = stopHitAnimCandleRef.current
    const stopPrice = portfolio.currentStop

    const startPrice = candle.open
    const endPrice = stopPrice
    const steps = 20
    const stepDuration = 80 // ~1.6 seconds total
    let step = 0

    const timer = setInterval(() => {
      step++
      const t = Math.min(step / steps, 1)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const currentPrice = startPrice + (endPrice - startPrice) * eased

      setLastCandleOverride({
        open: candle.open,
        high: Math.max(candle.open, currentPrice),
        low: Math.min(candle.open, currentPrice),
        close: currentPrice,
      })

      if (step >= steps) {
        clearInterval(timer)
        setLastCandleOverride(null)
        setStopHitAnimating(false)
        stopHitAnimatingRef.current = false
        stopHitAnimCandleRef.current = null
        skipCandleAnimRef.current = candleIdx
        stopCheckedCandlesRef.current.add(candleIdx)
        portfolio.triggerStopHit()
      }
    }, stepDuration)

    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopHitAnimating])

  /* ── Auto-reveal remaining Leoš events when user's position is fully closed ── */
  useEffect(() => {
    if (!predictions) return
    if (portfolio.isActive || portfolio.hasDeclinedEntry) return
    if (portfolio.closedPortions.length === 0) return
    if (!currentCandleDate || currentDecisionEvents.length === 0) return

    const newKeys: string[] = []
    for (const evt of currentDecisionEvents) {
      const key = `${evt.type}-${evt.date.split('T')[0]}`
      if (!revealedDecisionKeys.includes(key)) newKeys.push(key)
    }
    if (newKeys.length > 0) {
      setRevealedDecisionKeys(prev => [...prev, ...newKeys])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions, portfolio.isActive, portfolio.hasDeclinedEntry, portfolio.closedPortions.length, currentDecisionEvents, currentCandleDate])

  /* ── Candle grow animation: every new candle grows from its open price ── */
  useEffect(() => {
    if (candleAnimTimerRef.current) {
      clearInterval(candleAnimTimerRef.current)
      candleAnimTimerRef.current = null
    }

    if (candleIdx < 0 || candleIdx >= candles.length) {
      setLastCandleOverride(null)
      return
    }
    if (stopHitAnimatingRef.current) return
    if (skipCandleAnimRef.current === candleIdx) {
      skipCandleAnimRef.current = -1
      return
    }

    const candle = candles[candleIdx]
    const steps = 8
    const stepDuration = 30 // ~240ms total
    let step = 0

    setLastCandleOverride({
      open: candle.open,
      high: candle.open,
      low: candle.open,
      close: candle.open,
    })

    candleAnimTimerRef.current = setInterval(() => {
      step++
      const t = Math.min(step / steps, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out

      setLastCandleOverride({
        open: candle.open,
        high: candle.open + (candle.high - candle.open) * eased,
        low: candle.open + (candle.low - candle.open) * eased,
        close: candle.open + (candle.close - candle.open) * eased,
      })

      if (step >= steps) {
        clearInterval(candleAnimTimerRef.current!)
        candleAnimTimerRef.current = null
        setLastCandleOverride(null)
      }
    }, stepDuration)

    return () => {
      if (candleAnimTimerRef.current) {
        clearInterval(candleAnimTimerRef.current)
        candleAnimTimerRef.current = null
      }
      setLastCandleOverride(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candleIdx])

  const revealCurrentDecisionEvents = useCallback(() => {
    const evt = currentPromptedEventRef.current
    if (evt) {
      const key = `${evt.type}-${evt.date.split('T')[0]}`
      setRevealedDecisionKeys((prev) => prev.includes(key) ? prev : [...prev, key])
      currentPromptedEventRef.current = null
    }
  }, [])

  const handlePortfolioContinue = useCallback(() => {
    revealCurrentDecisionEvents()
    portfolio.continueFromReveal()
  }, [portfolio, revealCurrentDecisionEvents])

  const handlePortfolioEntryRevealContinue = useCallback(() => {
    // Reveal the entry event in sidebar
    const entryEvt = events.find((e) => e.type === 'entry')
    if (entryEvt) {
      const key = `entry-${entryEvt.date.split('T')[0]}`
      setRevealedDecisionKeys((prev) => [...prev, key])
    }
    portfolio.continueFromEntryReveal()
  }, [portfolio, events])

  /** Route chart click to the correct portfolio action based on current phase */
  const handlePriceSelect = useCallback(
    (price: number) => {
      const date = currentCandleDate
      switch (portfolio.phase) {
        case 'entry_price':
          portfolio.confirmEntryPrice(price)
          break
        case 'entry_stop':
          portfolio.confirmEntryStop(price, date)
          break
        case 'sell_price':
          portfolio.confirmSellPrice(price, date)
          break
        case 'add_price':
          portfolio.confirmAddPrice(price)
          break
        case 'add_stop':
          portfolio.confirmAddStop(price, date)
          break
        case 'move_stop':
          portfolio.confirmMoveStop(price)
          break
      }
    },
    [portfolio, currentCandleDate],
  )

  /* ── Candle-driven playback timer ── */
  useEffect(() => {
    if (!playing || !hasCandleData || showSetupPrompt || stopHitAnimating) return
    if (candleIdx >= candles.length - 1) {
      setPlaying(false)
      // Don't auto-jump to summary — let user see the end and click "Go to Summary"
      return
    }
    if (portfolioBusy) { setPlaying(false); return }

    // Pre-check: will next candle hit user's stop? If so, start stop-hit animation.
    const nextIdx = candleIdx + 1
    if (predictions && portfolio.isActive && portfolio.phase === 'idle' && nextIdx < candles.length) {
      const nextCandle = candles[nextIdx]
      if (portfolio.checkStopHit(nextCandle.low, nextCandle.high)) {
        // Advance to the candle, then start animation
        setCandleIdx(nextIdx)
        setPlaying(false)
        stopHitAnimatingRef.current = true
        setStopHitAnimating(true)
        stopHitAnimCandleRef.current = nextCandle
        return
      }
    }

    const timer = setTimeout(() => {
      setCandleIdx((prev) => Math.min(prev + 1, candles.length - 1))
    }, CANDLE_SPEED_OPTIONS[speedIdx].ms)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, candleIdx, candles.length, speedIdx, hasCandleData, portfolioBusy, showSetupPrompt, stopHitAnimating])

  /* ── Controls auto-hide ── */
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)
      if (controlsTimer.current) clearTimeout(controlsTimer.current)
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (controlsTimer.current) clearTimeout(controlsTimer.current)
    }
  }, [])

  /* ── Navigation callbacks ── */
  const goNext = useCallback(() => {
    if (!hasCandleData || portfolioBusy) return
    setCandleIdx((prev) => Math.min(prev + 1, candles.length - 1))
    setPlaying(false)
  }, [candles.length, hasCandleData, portfolioBusy])

  const goPrev = useCallback(() => {
    if (!hasCandleData) return
    portfolio.cancelAction()
    if (phase === 'done') setPhase('replay')
    setCandleIdx((prev) => Math.max(prev - 1, 0))
    setPlaying(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCandleData, phase])

  const restart = useCallback(() => {
    setCandleIdx(-1)
    setPlaying(false)
    setPhase('intro')
    setShowSetupPrompt(false)
    setRevealedDecisionKeys([])
    setStopHitAnimating(false)
    stopHitAnimatingRef.current = false
    setLastCandleOverride(null)
    stopHitAnimCandleRef.current = null
    skipCandleAnimRef.current = -1
    if (candleAnimTimerRef.current) {
      clearInterval(candleAnimTimerRef.current)
      candleAnimTimerRef.current = null
    }
    portfolio.reset()
    promptedDecisionsRef.current.clear()
    entryPromptedRef.current = false
    stopCheckedCandlesRef.current.clear()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismissSetupPrompt = useCallback(() => {
    setShowSetupPrompt(false)
  }, [])

  const handleStart = useCallback(() => {
    setPhase('replay')
    // Start a few candles before entry so the user can study the setup
    const startIdx = Math.max(0, entryCandleIdx - PRE_ENTRY_CANDLES)
    setCandleIdx(startIdx)
    setPlaying(false)
    setShowSetupPrompt(true)
    trackEvent('replay_start', { ticker: meta?.ticker ?? '' })
  }, [meta?.ticker, trackEvent, entryCandleIdx])

  const jumpToCandle = useCallback((index: number) => {
    portfolio.cancelAction()
    if (phase === 'done') setPhase('replay')
    setCandleIdx(index)
    setPlaying(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((prev) => (prev + 1) % CANDLE_SPEED_OPTIONS.length)
  }, [])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (showSetupPrompt) { setShowSetupPrompt(false) }
          else if (!portfolioBusy) { setPlaying((p) => !p) }
          break
        case 'ArrowRight':
          e.preventDefault()
          goNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goPrev()
          break
        case 'Escape':
          onClose()
          break
        case 'p': case 'P':
          setPredictions((p) => !p)
          break
        case 'r': case 'R':
          restart()
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candleIdx, candles.length, portfolioBusy, showSetupPrompt])

  /* ── Derived display values ── */
  const progress = candles.length > 0 ? ((candleIdx + 1) / candles.length) * 100 : 0
  const isComplete = liveMetrics.tradeCompleted && candleIdx >= candles.length - 1

  // No auto-transition to done — user clicks "Go to Summary" button

  const latestChart = useMemo((): ReplayChart | null => {
    if (!currentCandleDate) return null
    const visible = charts.filter((c) => c.date.split('T')[0] <= currentCandleDate)
    return visible.length > 0 ? visible[visible.length - 1] : null
  }, [charts, currentCandleDate])

  const currentDateDisplay = useMemo(() => {
    if (!currentCandleDate) return ''
    try { return format(new Date(currentCandleDate + 'T12:00:00'), 'MMM dd, yyyy') } catch { return currentCandleDate }
  }, [currentCandleDate])

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */

  /* ── Loading ── */
  if (dataLoading || !meta) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-gray-500 mx-auto mb-3 animate-spin" />
          <p className="text-gray-400 text-sm">Loading trade data...</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white h-8 w-8 p-0 z-10">
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  /* ── Error ── */
  if (dataError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg mb-2">Failed to load trade</p>
          <p className="text-gray-500 text-sm mb-6">{s(dataError)}</p>
          <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800">Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* ── Top progress bar ── */}
      <div className="h-1 bg-gray-800">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          animate={{ width: `${Math.max(progress, 0)}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left side: Chart display ── */}
        <div className="flex-1 flex flex-col relative">
          <AnimatePresence mode="wait">
            {phase === 'intro' ? (
              /* ──── INTRO SCREEN ──── */
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center px-8">
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="text-center">
                  <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">Trade Replay</p>
                  <h1 className="text-6xl font-bold text-white mb-3">{s(meta.ticker)}</h1>
                  <p className="text-xl text-gray-400 mb-2">
                    {s(meta.tradeType).toUpperCase()} &bull; {s(meta.setupType) || 'Swing Trade'}
                  </p>
                  <p className="text-gray-500 mb-10">
                    {s(Number(meta.duration) + 1)} days &bull; {s(events.length)} events
                  </p>

                  <div className="flex gap-4 justify-center mb-10">
                    <Button size="lg" onClick={handleStart} disabled={candlesLoading} className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg rounded-full">
                      {candlesLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
                      {candlesLoading ? 'Loading Chart...' : 'Start Replay'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-6 text-gray-500 text-sm">
                    <span>Space = Play/Pause</span>
                    <span>Arrows = Step candle</span>
                    <span>P = Think Along</span>
                    <span>R = Restart</span>
                    <span>Esc = Close</span>
                  </div>
                </motion.div>
              </motion.div>
            ) : phase === 'done' ? (
              /* ──── SUMMARY SCREEN ──── */
              <motion.div key="summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center px-8">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-center max-w-2xl">
                  <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">Trade Complete</p>
                  <h1 className="text-5xl font-bold text-white mb-8">{s(meta.ticker)}</h1>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-900 rounded-xl p-5">
                      <p className="text-xs text-gray-500 mb-1">Return</p>
                      <p className={cn('text-2xl font-bold', Number(meta.returnPct) >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {Number(meta.returnPct) >= 0 ? '+' : ''}{Number(meta.returnPct).toFixed(2)}%
                      </p>
                      {meta.normalizedReturnPct != null && meta.normalizedReturnPct !== meta.returnPct && (
                        <p className="text-xs text-gray-500 mt-1">
                          {Number(meta.normalizedReturnPct) >= 0 ? '+' : ''}{Number(meta.normalizedReturnPct).toFixed(2)}% norm.
                        </p>
                      )}
                    </div>
                    <div className="bg-gray-900 rounded-xl p-5">
                      <p className="text-xs text-gray-500 mb-1">R-Ratio</p>
                      <p className="text-2xl font-bold text-white">{Number(meta.rRatio).toFixed(2)}R</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-5">
                      <p className="text-xs text-gray-500 mb-1">Duration</p>
                      <p className="text-2xl font-bold text-white">{s(Number(meta.duration) + 1)}d</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-5">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <p className="text-2xl font-bold text-white capitalize">{s(meta.status)}</p>
                    </div>
                  </div>

                  {(portfolio.lots.length > 0 || portfolio.closedPortions.length > 0) && (
                    <div className="bg-purple-950/50 rounded-xl p-5 mb-8">
                      <PerformanceSummary
                        lots={portfolio.lots}
                        closedPortions={portfolio.closedPortions}
                        tradeType={portfolio.tradeType}
                        currentPrice={candles.length > 0 ? candles[candles.length - 1].close : 0}
                      />
                    </div>
                  )}

                  {/* Add-on stats */}
                  {trade && trade.adds.length > 0 && (
                    <div className="bg-gray-900 rounded-xl p-5 text-left mb-8">
                      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Add-on Trades ({trade.adds.length})</p>
                      <div className="space-y-3">
                        {trade.adds.map((add, idx) => {
                          const addType = trade.type === 'short' ? 'short' : 'long'
                          const totalExitPl = add.exits.length > 0
                            ? add.exits.reduce((sum, x) => {
                                if (add.price > 0 && x.price > 0) {
                                  let pl = ((x.price - add.price) / add.price) * 100
                                  if (addType === 'short') pl = -pl
                                  return sum + pl
                                }
                                return sum
                              }, 0) / add.exits.length
                            : null
                          const risk = addType === 'long'
                            ? add.price - add.stopLoss
                            : add.stopLoss - add.price
                          const rRatio = totalExitPl !== null && risk > 0 && add.price > 0
                            ? ((totalExitPl / 100) * add.price) / risk
                            : null
                          const norm = add.normalizationFactor || 1

                          return (
                            <div key={idx} className="flex items-center gap-4 bg-gray-800/50 rounded-lg px-4 py-3">
                              <div className="text-xs text-blue-400 font-mono shrink-0">Add #{idx + 1}</div>
                              <div className="text-xs text-gray-400">
                                {(() => { try { return format(new Date(add.date), 'MMM dd') } catch { return add.date.split('T')[0] } })()}
                              </div>
                              <div className="text-xs text-gray-300 font-mono">${add.price.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">{(norm * 100).toFixed(0)}% size</div>
                              {totalExitPl !== null && (
                                <div className={cn('text-xs font-mono font-medium', totalExitPl >= 0 ? 'text-green-400' : 'text-red-400')}>
                                  {totalExitPl >= 0 ? '+' : ''}{totalExitPl.toFixed(2)}%
                                </div>
                              )}
                              {rRatio !== null && (
                                <div className="text-xs text-gray-300 font-mono">{rRatio.toFixed(2)}R</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {meta.notes && (
                    <div className="bg-gray-900 rounded-xl p-6 text-left mb-8">
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Trade Notes</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{s(meta.notes)}</p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={restart} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                      <RotateCcw className="h-4 w-4 mr-2" />Replay
                    </Button>
                    <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800">Close</Button>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              /* ──── MAIN REPLAY: Chart display ──── */
              <motion.div key="replay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center p-2 relative">
                {hasCandleData ? (
                  <motion.div key="candlestick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full flex items-center justify-center">
                    <div className="w-full h-full">
                      <CandlestickChart
                        candles={displayCandles}
                        revealCount={chartRevealCount}
                        markers={filteredTradeMarkers}
                        priceLines={allPriceLines}
                        onPriceSelect={handlePriceSelect}
                        isPriceSelectMode={portfolio.isPricePickMode}
                        lastCandleOverride={lastCandleOverride}
                        height={Math.min(700, typeof window !== 'undefined' ? window.innerHeight * 0.75 : 700)}
                        interval={chartInterval}
                      />
                    </div>

                    {/* Top-right: date + add action button */}
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                      {predictions && portfolio.isActive && portfolio.phase === 'idle' && !stopHitAnimating && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={portfolio.openAdhoc}
                          className="bg-black/60 backdrop-blur-sm text-blue-400 hover:text-blue-300 hover:bg-black/80 h-7 text-[11px] px-2"
                        >
                          + Add Action
                        </Button>
                      )}
                      {currentDateDisplay && (
                        <div className="bg-black/60 backdrop-blur-sm rounded-md px-3 py-1">
                          <p className="text-xs text-gray-300 font-mono">{s(currentDateDisplay)}</p>
                        </div>
                      )}
                    </div>

                    {/* Top-left: interval toggle + static view */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                      <div className="bg-gray-800/80 rounded-md flex overflow-hidden">
                        <button
                          onClick={() => setChartInterval('1d')}
                          className={cn(
                            'px-2 py-1 text-[10px] transition-colors',
                            chartInterval === '1d' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white',
                          )}
                        >
                          D
                        </button>
                        <button
                          onClick={() => setChartInterval('1wk')}
                          className={cn(
                            'px-2 py-1 text-[10px] transition-colors',
                            chartInterval === '1wk' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white',
                          )}
                        >
                          W
                        </button>
                      </div>
                      {latestChart && (
                        <button
                          onClick={() => setCandlestickView(false)}
                          className="bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md px-2 py-1 text-[10px] transition-colors"
                          title="Switch to static charts"
                        >
                          Static View
                        </button>
                      )}
                    </div>

                    {predictions && (
                      <UserActionOverlay
                        phase={portfolio.phase}
                        totalShares={portfolio.totalShares}
                        lots={portfolio.lots}
                        currentDecisionPoint={portfolio.currentDecisionPoint}
                        isAdhoc={portfolio.isAdhoc}
                        userActionSummary={portfolio.userActionSummary}
                        leosEntry={tradeDetails ? {
                          price: tradeDetails.entryPrice,
                          stop: tradeDetails.initialStopLoss,
                          positionDesc: events.find(e => e.type === 'entry')?.positionDesc || '',
                        } : undefined}
                        userEntry={portfolio.lots.length > 0 ? {
                          price: portfolio.lots[0].entryPrice,
                          stop: portfolio.lots[0].initialStop,
                          shares: portfolio.lots[0].shares,
                        } : undefined}
                        onConfirmBuy={portfolio.confirmBuy}
                        onDeclineEntry={portfolio.declineEntry}
                        onSetEntrySize={portfolio.setEntrySize}
                        onSetAddSize={portfolio.setAddSize}
                        onChooseAction={portfolio.chooseAction}
                        onConfirmSellAmount={(pct: number) => portfolio.confirmSellAmount(pct, currentCandleDate)}
                        onStopHitSell={portfolio.stopHitSell}
                        onStopHitGiveRoom={portfolio.stopHitGiveRoom}
                        onContinueFromReveal={handlePortfolioContinue}
                        onContinueFromEntryReveal={handlePortfolioEntryRevealContinue}
                        onCancel={portfolio.cancelAction}
                      />
                    )}

                    {/* ── Setup prompt — shown when starting before entry ── */}
                    <AnimatePresence>
                      {showSetupPrompt && (
                        <motion.div
                          key="setup-prompt"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-4 left-4 right-4 z-20"
                        >
                          <div className="bg-gray-900/95 backdrop-blur-md rounded-xl p-5 border border-gray-700 max-w-lg mx-auto text-center">
                            <Eye className="h-5 w-5 text-purple-400 mx-auto mb-2" />
                            <p className="text-white text-base font-medium mb-2">What do you see here?</p>
                            <p className="text-sm text-gray-400 mb-4">
                              Study the price action forming. Can you spot the setup before the trade entry?
                            </p>
                            <Button
                              onClick={dismissSetupPrompt}
                              className="bg-white/10 hover:bg-white/20 text-white"
                              size="sm"
                            >
                              Continue
                            </Button>
                            <p className="text-[10px] text-gray-600 mt-3">Press Space to continue</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Launch Autoplay — shown when paused and idle ── */}
                    <AnimatePresence>
                      {!playing && !showSetupPrompt && !isComplete && !portfolioBusy && !stopHitAnimating && phase === 'replay' && (
                        <motion.div
                          key="launch-autoplay"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="absolute bottom-4 right-4 z-20"
                        >
                          <Button
                            onClick={() => setPlaying(true)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-full px-5 py-2 h-auto shadow-lg shadow-black/30"
                            size="sm"
                          >
                            <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                            <span className="text-sm font-medium">Autoplay</span>
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Go to Summary — shown when trade is complete ── */}
                    <AnimatePresence>
                      {isComplete && phase === 'replay' && !portfolioBusy && !showSetupPrompt && (
                        <motion.div
                          key="go-to-summary"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-4 left-4 right-4 z-20"
                        >
                          <div className="bg-gray-900/95 backdrop-blur-md rounded-xl p-4 border border-gray-700 max-w-sm mx-auto text-center">
                            <p className="text-sm text-gray-300 mb-3">Trade complete</p>
                            <Button
                              onClick={() => {
                                setPhase('done')
                                trackEvent('replay_complete', { ticker: meta?.ticker ?? '' })
                              }}
                              className="bg-white text-black hover:bg-gray-200"
                              size="sm"
                            >
                              Go to Summary
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : candlesLoading ? (
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 text-gray-500 mx-auto mb-3 animate-spin" />
                    <p className="text-gray-500 text-sm">Loading chart data...</p>
                  </div>
                ) : latestChart ? (
                  <motion.div key={s(latestChart.id)} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative max-w-full max-h-full">
                    <Image
                      src={latestChart.annotatedUrl || latestChart.imageUrl}
                      alt="Trade chart"
                      width={1200}
                      height={800}
                      className="object-contain rounded-lg shadow-2xl max-h-[70vh]"
                      priority
                    />

                    {latestChart.role && latestChart.role !== 'chart' && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-4 left-4">
                        <Badge className={cn('border text-xs', getRoleBadgeColor(latestChart.role))}>{s(latestChart.role)}</Badge>
                      </motion.div>
                    )}

                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-md px-3 py-1">
                      <p className="text-xs text-gray-300">
                        {(() => { try { return format(new Date(latestChart.date), 'MMM dd, yyyy') } catch { return s(latestChart.date).split('T')[0] } })()}
                      </p>
                    </div>

                    {tradeDetails && !candlesError && (
                      <button
                        onClick={() => setCandlestickView(true)}
                        className="absolute top-4 left-4 mt-8 bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white rounded-md px-2 py-1 text-[10px] transition-colors"
                        title="Switch to candlestick chart"
                      >
                        <CandlestickIcon className="h-3 w-3 inline mr-1" />Live Chart
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <div className="text-center">
                    <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                      <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    </motion.div>
                    <p className="text-gray-500">Trade in progress...</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right sidebar: Events feed + Metrics ── */}
        {phase === 'replay' && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-80 bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden"
          >
            {/* ── Live Metrics Panel ── */}
            <div className="p-4 border-b border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Live Metrics</h3>
                <span className="text-xs text-gray-600">Day {s(liveMetrics.daysFromEntry)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {liveMetrics.entryPrice != null && (
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase">Entry</p>
                    <p className="text-sm font-mono text-white">${Number(liveMetrics.entryPrice).toFixed(2)}</p>
                  </div>
                )}
                {Number(liveMetrics.currentStop) > 0 && (
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase">Stop</p>
                    <p className="text-sm font-mono text-yellow-400">${Number(liveMetrics.currentStop).toFixed(2)}</p>
                  </div>
                )}
                {liveMetrics.positionSize && (
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase">Size</p>
                    <p className="text-xs text-gray-300">{s(liveMetrics.positionSize)}</p>
                  </div>
                )}
                {liveMetrics.initialRisk != null && Number(liveMetrics.initialRisk) > 0 && (
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase">Risk</p>
                    <p className="text-sm font-mono text-orange-400">{Number(liveMetrics.initialRisk).toFixed(2)}%</p>
                  </div>
                )}
              </div>

              {liveMetrics.profitLossPercent != null && (() => {
                const pl = Number(liveMetrics.profitLossPercent)
                const nplRaw = liveMetrics.normalizedProfitLossPercent
                const npl = nplRaw != null ? Number(nplRaw) : null
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('rounded-lg p-3 text-center', pl >= 0 ? 'bg-green-950' : 'bg-red-950')}
                  >
                    <p className="text-[10px] text-gray-500 uppercase mb-1">P&L</p>
                    <p className={cn('text-xl font-bold font-mono', pl >= 0 ? 'text-green-400' : 'text-red-400')}>
                      {pl >= 0 ? '+' : ''}{pl.toFixed(2)}%
                    </p>
                    {npl != null && !isNaN(npl) && npl !== pl && (
                      <p className="text-xs text-gray-500 mt-1">{npl >= 0 ? '+' : ''}{npl.toFixed(2)}% normalized</p>
                    )}
                  </motion.div>
                )
              })()}
            </div>

            {/* ── Events Feed ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Events</h3>

              <AnimatePresence mode="popLayout">
                {sidebarEvents.map((evt) => {
                  const evtDateStr = evt.date.split('T')[0]
                  const isCurrent = evtDateStr === currentCandleDate

                  return (
                    <motion.div
                      key={`event-${s(evt.type)}-${evtDateStr}-${s(evt.price)}-${s(evt.newStop)}`}
                      initial={{ opacity: 0, x: 20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        'rounded-lg p-3 border transition-colors cursor-pointer',
                        isCurrent ? `bg-gray-800 ${getEventBorderColor(evt.type)}` : 'bg-gray-900/50 border-gray-800/50 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', getEventColor(evt.type))}>
                          {getEventIcon(evt.type)}
                        </div>
                        <span className="text-xs font-medium text-gray-200">{s(evt.title)}</span>
                        <span className="text-[10px] text-gray-500 ml-auto">
                          {(() => { try { return format(new Date(evt.date), 'MMM dd') } catch { return s(evt.date).split('T')[0] } })()}
                        </span>
                      </div>

                      <div className="text-xs text-gray-400 ml-8 space-y-0.5">
                        {(evt.type === 'entry' || evt.type === 'add') && (
                          <>
                            <p>Price: <span className="text-gray-200">${s(evt.price)}</span></p>
                            {evt.positionDesc && <p>Size: <span className="text-gray-200">{s(evt.positionDesc)}</span></p>}
                            {evt.type === 'add' && evt.newStop > 0 && (
                              <p>Stop: <span className="text-yellow-400">${s(evt.newStop)}</span></p>
                            )}
                          </>
                        )}
                        {evt.type === 'stopModified' && (
                          <p>${s(evt.prevStop)} &rarr; <span className="text-yellow-400">${s(evt.newStop)}</span></p>
                        )}
                        {evt.type === 'exit' && (
                          <>
                            <p>Price: <span className="text-gray-200">${s(evt.price)}</span></p>
                            {evt.plPct != null && (
                              <p className={cn('font-medium', Number(evt.plPct) >= 0 ? 'text-green-400' : 'text-red-400')}>
                                {Number(evt.plPct) >= 0 ? '+' : ''}{s(evt.plPct)}%
                              </p>
                            )}
                            {evt.reason && <p className="capitalize text-gray-500">{s(evt.reason)}</p>}
                          </>
                        )}
                        {evt.notes && <p className="italic text-gray-500 mt-1 line-clamp-2">{s(evt.notes)}</p>}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {sidebarEvents.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">Events will appear as the trade unfolds...</p>
              )}
            </div>

            {/* ── User portfolio performance ── */}
            {predictions && portfolio.isActive && (
              <div className="p-4 border-t border-gray-800">
                <PerformanceSummary
                  lots={portfolio.lots}
                  closedPortions={portfolio.closedPortions}
                  tradeType={portfolio.tradeType}
                  currentPrice={candleIdx >= 0 && candleIdx < candles.length ? candles[candleIdx].close : 0}
                  compact
                />
              </div>
            )}

            {/* ── Think Along toggle ── */}
            <div className="p-3 border-t border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPredictions((p) => !p)}
                className={cn('w-full text-xs', predictions ? 'text-purple-400 hover:text-purple-300' : 'text-gray-500 hover:text-gray-400')}
              >
                {predictions ? <EyeOff className="h-3 w-3 mr-2" /> : <Eye className="h-3 w-3 mr-2" />}
                {predictions ? 'Think Along ON' : 'Think Along'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Bottom candle scrubber ── */}
      {phase === 'replay' && (
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className={cn('bg-gray-950 border-t border-gray-800 transition-opacity duration-300', !showControls && playing ? 'opacity-30' : 'opacity-100')}
        >
          {/* ── Candle progress bar ── */}
          <div className="px-6 pt-3 pb-1">
            <div className="relative h-4 flex items-center">
              <div className="absolute inset-x-0 h-1 bg-gray-800 rounded-full" />
              <motion.div
                className="absolute left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15 }}
              />

              {candles.length > 0 && entryCandleIdx > 0 && (
                <div
                  className="absolute w-0.5 h-3 bg-green-500 rounded-full z-10"
                  style={{ left: `${(entryCandleIdx / (candles.length - 1)) * 100}%` }}
                  title={`Entry: ${s(entryDateStr)}`}
                />
              )}

              {events.map((evt, i) => {
                const evtDate = evt.date.split('T')[0]
                const ci = candles.findIndex((c) => c.time >= evtDate)
                if (ci < 0) return null
                const pos = (ci / (candles.length - 1)) * 100
                return (
                  <button
                    key={`scrub-evt-${i}`}
                    className="absolute -translate-x-1/2 z-10"
                    style={{ left: `${pos}%` }}
                    onClick={() => jumpToCandle(ci)}
                    title={`${s(evt.title)} - ${evtDate}`}
                  >
                    <div className={cn('w-2.5 h-2.5 rounded-full', ci <= candleIdx ? getEventColor(evt.type) : 'bg-gray-600')} />
                  </button>
                )
              })}

              <div
                className="absolute inset-x-0 h-4 cursor-pointer z-5"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const pct = (e.clientX - rect.left) / rect.width
                  const idx = Math.round(pct * (candles.length - 1))
                  jumpToCandle(Math.max(0, Math.min(idx, candles.length - 1)))
                }}
              />
            </div>
          </div>

          {/* ── Playback controls ── */}
          <div className="flex items-center justify-between px-6 pb-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={restart} className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Restart (R)">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goPrev} disabled={candleIdx <= 0} className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Previous candle (Left arrow)">
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (showSetupPrompt) { setShowSetupPrompt(false) }
                  else if (!portfolioBusy) { setPlaying((p) => !p) }
                }}
                disabled={portfolioBusy && !showSetupPrompt}
                className="text-white hover:text-white bg-gray-800 hover:bg-gray-700 h-10 w-10 p-0 rounded-full"
                title="Play/Pause (Space)"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={goNext} disabled={candleIdx >= candles.length - 1 || portfolioBusy} className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Next candle (Right arrow)">
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-mono">{s(Math.max(candleIdx + 1, 0))} / {s(candles.length)}</span>
              <Button variant="ghost" size="sm" onClick={cycleSpeed} className="text-gray-400 hover:text-white text-xs h-8 px-3" title="Playback speed">
                <FastForward className="h-3 w-3 mr-1" />{CANDLE_SPEED_OPTIONS[speedIdx].label}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Close (Esc)">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Close button (always visible) ── */}
      <Button variant="ghost" size="sm" onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white h-8 w-8 p-0 z-10">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
