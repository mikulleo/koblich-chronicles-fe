'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type {
  TradeLot,
  ClosedPortion,
  UserActionPhase,
  DecisionPoint,
} from '@/lib/types/candlestick'

export const FULL_SHARES = 100

interface PortfolioState {
  phase: UserActionPhase
  lots: TradeLot[]
  closedPortions: ClosedPortion[]
  tradeType: 'long' | 'short'
  isActive: boolean
  hasDeclinedEntry: boolean
  pendingShares: number
  pendingSellPercent: number
  pendingEntryPrice: number | null
  /** Set when stop is hit — sell auto-executes at this price */
  pendingStopPrice: number | null
  currentDecisionPoint: DecisionPoint | null
  isAdhoc: boolean
  userActionSummary: string
}

const initialState: PortfolioState = {
  phase: 'idle',
  lots: [],
  closedPortions: [],
  tradeType: 'long',
  isActive: false,
  hasDeclinedEntry: false,
  pendingShares: 0,
  pendingSellPercent: 0,
  pendingEntryPrice: null,
  pendingStopPrice: null,
  currentDecisionPoint: null,
  isAdhoc: false,
  userActionSummary: '',
}

/** Convert shares to % of full position */
const pctOf = (shares: number): number => Math.round((shares / FULL_SHARES) * 100)

/** Label for a share count as % */
const sizePctLabel = (shares: number): string => {
  const pct = pctOf(shares)
  if (pct === 100) return 'Full'
  if (pct === 50) return 'Half'
  if (pct === 25) return 'Quarter'
  return `${pct}%`
}

const MAX_UNDO_HISTORY = 20

export function useUserPortfolio() {
  const [state, setState] = useState<PortfolioState>(initialState)
  const lotCounter = useRef(0)
  const undoStack = useRef<PortfolioState[]>([])

  // Keep a ref synced with state for synchronous undo snapshot
  const stateRef = useRef<PortfolioState>(initialState)
  useEffect(() => { stateRef.current = state }, [state])

  /** Push current state to undo stack before making a change */
  const pushUndo = useCallback(() => {
    undoStack.current.push(structuredClone(stateRef.current))
    if (undoStack.current.length > MAX_UNDO_HISTORY) undoStack.current.shift()
  }, [])

  /** Undo last action — restores previous portfolio state */
  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (prev) {
      setState({ ...prev, phase: 'idle' })
    }
  }, [])

  // ── Entry flow ──

  const promptEntry = useCallback((tradeType: 'long' | 'short') => {
    setState(prev => ({ ...prev, phase: 'entry_prompt', tradeType }))
  }, [])

  /** Skip the buy/pass prompt — go straight to sizing (used by "Buy Now") */
  const promptEntrySizing = useCallback((tradeType: 'long' | 'short') => {
    setState(prev => ({ ...prev, phase: 'entry_sizing', tradeType }))
  }, [])

  const confirmBuy = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'entry_sizing' }))
  }, [])

  const declineEntry = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'idle', hasDeclinedEntry: true }))
  }, [])

  const setEntrySize = useCallback((shares: number) => {
    setState(prev => ({ ...prev, pendingShares: shares, phase: 'entry_price' }))
  }, [])

  /** User clicked chart for entry price */
  const confirmEntryPrice = useCallback((price: number) => {
    setState(prev => ({ ...prev, pendingEntryPrice: price, phase: 'entry_stop' }))
  }, [])

  /** User clicked chart for stop. Entry price already in pendingEntryPrice. */
  const confirmEntryStop = useCallback((stopPrice: number, date: string) => {
    pushUndo()
    setState(prev => {
      const lot: TradeLot = {
        id: `lot-${++lotCounter.current}`,
        entryPrice: prev.pendingEntryPrice!,
        shares: prev.pendingShares,
        remainingShares: prev.pendingShares,
        initialStop: stopPrice,
        currentStop: stopPrice,
        entryDate: date,
      }
      return {
        ...prev,
        lots: [lot],
        isActive: true,
        phase: 'entry_reveal',
      }
    })
  }, [])

  const continueFromEntryReveal = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'idle' }))
  }, [])

  // ── Decision point flow ──

  const promptDecision = useCallback((dp: DecisionPoint) => {
    setState(prev => ({
      ...prev,
      phase: 'action_prompt',
      currentDecisionPoint: dp,
      isAdhoc: false,
    }))
  }, [])

  const chooseAction = useCallback((action: 'sell' | 'sell_all' | 'add' | 'hold' | 'move_stop') => {
    setState(prev => {
      switch (action) {
        case 'sell':
          return { ...prev, phase: 'sell_amount' as const }
        case 'sell_all':
          return { ...prev, pendingSellPercent: 100, phase: 'sell_price' as const }
        case 'add':
          return { ...prev, phase: 'add_sizing' as const }
        case 'move_stop':
          return { ...prev, phase: 'move_stop' as const }
        case 'hold':
          return {
            ...prev,
            phase: (prev.isAdhoc ? 'idle' : 'action_reveal') as UserActionPhase,
            userActionSummary: 'Hold',
          }
        default:
          return prev
      }
    })
  }, [])

  // ── Sell flow ──

  /** If pendingStopPrice is set (stop-hit sell), auto-executes at that price. */
  const confirmSellAmount = useCallback((percent: number, date?: string) => {
    pushUndo()
    setState(prev => {
      // Auto-execute at stop price if this is a stop-hit sell
      if (prev.pendingStopPrice != null && date) {
        const exitPrice = prev.pendingStopPrice
        const totalShares = prev.lots.reduce((s, l) => s + l.remainingShares, 0)
        let sharesToSell = Math.round(totalShares * (percent / 100))
        if (sharesToSell <= 0) return { ...prev, phase: 'idle' as const, pendingStopPrice: null }

        const newLots = prev.lots.map(l => ({ ...l }))
        const newClosed: ClosedPortion[] = []
        const isLong = prev.tradeType === 'long'

        for (const lot of newLots) {
          if (sharesToSell <= 0) break
          if (lot.remainingShares <= 0) continue
          const sell = Math.min(lot.remainingShares, sharesToSell)
          lot.remainingShares -= sell
          sharesToSell -= sell
          const R = Math.abs(lot.entryPrice - lot.initialStop)
          const diff = isLong ? exitPrice - lot.entryPrice : lot.entryPrice - exitPrice
          newClosed.push({
            lotId: lot.id, shares: sell, entryPrice: lot.entryPrice,
            exitPrice, exitDate: date,
            pnlPercent: (diff / lot.entryPrice) * 100,
            pnlR: R > 0 ? diff / R : 0,
          })
        }

        const activeLots = newLots.filter(l => l.remainingShares > 0)
        return {
          ...prev,
          lots: activeLots,
          closedPortions: [...prev.closedPortions, ...newClosed],
          isActive: activeLots.length > 0,
          phase: 'idle' as const,
          userActionSummary: `Sell ${percent}% @ $${exitPrice.toFixed(2)} (stop)`,
          pendingSellPercent: 0,
          pendingStopPrice: null,
        }
      }

      // Normal sell — proceed to price pick
      return { ...prev, pendingSellPercent: percent, phase: 'sell_price' as const }
    })
  }, [])

  const confirmSellPrice = useCallback((exitPrice: number, date: string) => {
    pushUndo()
    setState(prev => {
      const totalShares = prev.lots.reduce((s, l) => s + l.remainingShares, 0)
      let sharesToSell = Math.round(totalShares * (prev.pendingSellPercent / 100))
      if (sharesToSell <= 0) return { ...prev, phase: 'idle' as const }

      const newLots = prev.lots.map(l => ({ ...l }))
      const newClosed: ClosedPortion[] = []
      const isLong = prev.tradeType === 'long'

      for (const lot of newLots) {
        if (sharesToSell <= 0) break
        if (lot.remainingShares <= 0) continue
        const sell = Math.min(lot.remainingShares, sharesToSell)
        lot.remainingShares -= sell
        sharesToSell -= sell
        const R = Math.abs(lot.entryPrice - lot.initialStop)
        const diff = isLong ? exitPrice - lot.entryPrice : lot.entryPrice - exitPrice
        newClosed.push({
          lotId: lot.id, shares: sell, entryPrice: lot.entryPrice,
          exitPrice, exitDate: date,
          pnlPercent: (diff / lot.entryPrice) * 100,
          pnlR: R > 0 ? diff / R : 0,
        })
      }

      const activeLots = newLots.filter(l => l.remainingShares > 0)

      return {
        ...prev,
        lots: activeLots,
        closedPortions: [...prev.closedPortions, ...newClosed],
        isActive: activeLots.length > 0,
        phase: (prev.isAdhoc ? 'idle' : 'action_reveal') as UserActionPhase,
        userActionSummary: `Sell ${prev.pendingSellPercent}% @ $${exitPrice.toFixed(2)}`,
        pendingSellPercent: 0,
      }
    })
  }, [])

  // ── Add flow ──

  const setAddSize = useCallback((shares: number) => {
    setState(prev => ({ ...prev, pendingShares: shares, phase: 'add_price' as const }))
  }, [])

  const confirmAddPrice = useCallback((entryPrice: number) => {
    setState(prev => ({ ...prev, pendingEntryPrice: entryPrice, phase: 'add_stop' as const }))
  }, [])

  const confirmAddStop = useCallback((stopPrice: number, date: string) => {
    pushUndo()
    setState(prev => {
      const lot: TradeLot = {
        id: `lot-${++lotCounter.current}`,
        entryPrice: prev.pendingEntryPrice!,
        shares: prev.pendingShares,
        remainingShares: prev.pendingShares,
        initialStop: stopPrice,
        currentStop: stopPrice,
        entryDate: date,
      }
      return {
        ...prev,
        lots: [...prev.lots, lot],
        phase: (prev.isAdhoc ? 'idle' : 'action_reveal') as UserActionPhase,
        userActionSummary: `Add ${sizePctLabel(prev.pendingShares)} @ $${prev.pendingEntryPrice!.toFixed(2)}, Stop $${stopPrice.toFixed(2)}`,
        pendingShares: 0,
        pendingEntryPrice: null,
      }
    })
  }, [])

  // ── Move stop ──

  const confirmMoveStop = useCallback((newStop: number) => {
    pushUndo()
    setState(prev => ({
      ...prev,
      lots: prev.lots.map(l => ({ ...l, currentStop: newStop })),
      phase: (prev.isAdhoc ? 'idle' : 'action_reveal') as UserActionPhase,
      userActionSummary: `Move Stop to $${newStop.toFixed(2)}`,
    }))
  }, [])

  // ── Stop hit ──

  const triggerStopHit = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'stop_hit',
      pendingStopPrice: prev.lots.length > 0 ? prev.lots[0].currentStop : null,
    }))
  }, [])

  const stopHitSell = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'sell_amount' as const, isAdhoc: true }))
  }, [])

  const stopHitGiveRoom = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'move_stop' as const, isAdhoc: true, pendingStopPrice: null }))
  }, [])

  // ── Adhoc ──

  const openAdhoc = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'adhoc_prompt', isAdhoc: true }))
  }, [])

  // ── Continue / Cancel / Reset ──

  const continueFromReveal = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'idle',
      currentDecisionPoint: null,
      isAdhoc: false,
      userActionSummary: '',
    }))
  }, [])

  const cancelAction = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'idle',
      isAdhoc: false,
      pendingShares: 0,
      pendingSellPercent: 0,
      pendingEntryPrice: null,
      pendingStopPrice: null,
    }))
  }, [])

  const reset = useCallback(() => {
    lotCounter.current = 0
    undoStack.current = []
    setState(initialState)
  }, [])

  // ── Computed values ──

  const totalShares = useMemo(
    () => state.lots.reduce((s, l) => s + l.remainingShares, 0),
    [state.lots],
  )

  /** Position size as % of full */
  const totalPct = useMemo(() => pctOf(totalShares), [totalShares])

  const currentStop = useMemo(
    () => (state.lots.length > 0 ? state.lots[0].currentStop : 0),
    [state.lots],
  )

  const getOpenPnl = useCallback(
    (currentPrice: number) => {
      const isLong = state.tradeType === 'long'
      let pW = 0, rW = 0, sh = 0
      for (const lot of state.lots) {
        if (lot.remainingShares <= 0) continue
        const diff = isLong ? currentPrice - lot.entryPrice : lot.entryPrice - currentPrice
        const R = Math.abs(lot.entryPrice - lot.initialStop)
        pW += (diff / lot.entryPrice) * 100 * lot.remainingShares
        rW += (R > 0 ? diff / R : 0) * lot.remainingShares
        sh += lot.remainingShares
      }
      return { pnlPercent: sh > 0 ? pW / sh : 0, pnlR: sh > 0 ? rW / sh : 0 }
    },
    [state.lots, state.tradeType],
  )

  const closedPnl = useMemo(() => {
    if (state.closedPortions.length === 0) return { pnlPercent: 0, pnlR: 0 }
    let pW = 0, rW = 0, sh = 0
    for (const cp of state.closedPortions) {
      pW += cp.pnlPercent * cp.shares; rW += cp.pnlR * cp.shares; sh += cp.shares
    }
    return { pnlPercent: sh > 0 ? pW / sh : 0, pnlR: sh > 0 ? rW / sh : 0 }
  }, [state.closedPortions])

  const checkStopHit = useCallback(
    (candleLow: number, candleHigh: number): boolean => {
      if (!state.isActive || state.lots.length === 0) return false
      if (state.phase !== 'idle') return false
      const isLong = state.tradeType === 'long'
      return state.lots.some(lot => {
        if (lot.remainingShares <= 0) return false
        return isLong ? candleLow <= lot.currentStop : candleHigh >= lot.currentStop
      })
    },
    [state.lots, state.isActive, state.tradeType, state.phase],
  )

  const canUndo = undoStack.current.length > 0

  const isPricePickMode =
    state.phase === 'entry_price' ||
    state.phase === 'entry_stop' ||
    state.phase === 'sell_price' ||
    state.phase === 'add_price' ||
    state.phase === 'add_stop' ||
    state.phase === 'move_stop'

  const userPriceLines = useMemo(() => {
    const lines: Array<{ price: number; color: string; lineWidth: number; lineStyle: number; title: string }> = []
    const stopsSeen = new Set<number>()
    const entriesSeen = new Set<number>()

    for (const lot of state.lots) {
      if (lot.remainingShares <= 0) continue
      if (!entriesSeen.has(lot.entryPrice)) {
        entriesSeen.add(lot.entryPrice)
        lines.push({ price: lot.entryPrice, color: '#a855f7', lineWidth: 1, lineStyle: 2, title: 'You' })
      }
      if (!stopsSeen.has(lot.currentStop)) {
        stopsSeen.add(lot.currentStop)
        lines.push({ price: lot.currentStop, color: '#f97316', lineWidth: 1, lineStyle: 1, title: 'YStp' })
      }
    }
    return lines
  }, [state.lots])

  return {
    ...state,
    totalShares,
    totalPct,
    currentStop,
    closedPnl,
    userPriceLines,
    isPricePickMode,
    canUndo,
    promptEntry,
    promptEntrySizing,
    confirmBuy,
    declineEntry,
    setEntrySize,
    confirmEntryPrice,
    confirmEntryStop,
    continueFromEntryReveal,
    promptDecision,
    chooseAction,
    confirmSellAmount,
    confirmSellPrice,
    setAddSize,
    confirmAddPrice,
    confirmAddStop,
    confirmMoveStop,
    triggerStopHit,
    stopHitSell,
    stopHitGiveRoom,
    openAdhoc,
    continueFromReveal,
    cancelAction,
    reset,
    undo,
    getOpenPnl,
    checkStopHit,
  }
}
