'use client'

import { useState, useCallback } from 'react'
import type {
  PredictionState,
  UserPrediction,
  DecisionPoint,
  PredictionComparison,
} from '@/lib/types/candlestick'

const initialState: PredictionState = {
  phase: 'idle',
  currentDecisionPoint: null,
  userPredictions: [],
  userDecisions: [],
  comparison: null,
  score: { aligned: 0, total: 0 },
}

export function usePrediction() {
  const [state, setState] = useState<PredictionState>(initialState)

  const promptDecision = useCallback((decisionPoint: DecisionPoint) => {
    setState((prev) => ({
      ...prev,
      phase: 'placing',
      currentDecisionPoint: decisionPoint,
      userDecisions: [],
      comparison: null,
    }))
  }, [])

  const addPredictionMarker = useCallback((price: number, date: string) => {
    setState((prev) => ({
      ...prev,
      userPredictions: [
        ...prev.userPredictions,
        { type: 'hold', price, date },
      ],
    }))
  }, [])

  /** Toggle a decision type on/off (multi-select) */
  const toggleDecision = useCallback((type: UserPrediction['type']) => {
    setState((prev) => ({
      ...prev,
      userDecisions: prev.userDecisions.includes(type)
        ? prev.userDecisions.filter((t) => t !== type)
        : [...prev.userDecisions, type],
    }))
  }, [])

  /** Lock in all selected decisions */
  const submitDecisions = useCallback(() => {
    setState((prev) => {
      if (prev.userDecisions.length === 0) return prev
      return { ...prev, phase: 'decided' }
    })
  }, [])

  const revealActual = useCallback(() => {
    setState((prev) => {
      if (!prev.currentDecisionPoint || !prev.userDecisions.length) return prev

      const actuals = prev.currentDecisionPoint.actualDecisions
      const actualSet = new Set(actuals)
      const userSet = new Set(prev.userDecisions)

      const overlap = [...userSet].filter((t) => actualSet.has(t)).length

      let verdict: PredictionComparison['verdict'] = 'miss'
      if (overlap === actualSet.size && overlap === userSet.size) {
        verdict = 'match' // exact match
      } else if (overlap > 0) {
        verdict = 'close' // partial overlap
      }

      const formatActions = (types: string[]) =>
        types.map((t) => {
          switch (t) {
            case 'buy': return 'Buy'
            case 'sell': return 'Sell'
            case 'hold': return 'Hold'
            case 'tightenStop': return 'Tighten Stop'
            default: return t
          }
        }).join(' + ')

      const comparison: PredictionComparison = {
        userAction: formatActions(prev.userDecisions),
        actualAction: formatActions(actuals),
        actualPrice: prev.currentDecisionPoint.actualPrice,
        verdict,
      }

      return {
        ...prev,
        phase: 'revealed',
        comparison,
        score: {
          aligned:
            prev.score.aligned + (verdict === 'match' ? 1 : verdict === 'close' ? 0.5 : 0),
          total: prev.score.total + 1,
        },
      }
    })
  }, [])

  const clearDecision = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'idle',
      currentDecisionPoint: null,
      userDecisions: [],
      comparison: null,
    }))
  }, [])

  const resetPredictions = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    ...state,
    promptDecision,
    addPredictionMarker,
    toggleDecision,
    submitDecisions,
    revealActual,
    clearDecision,
    resetPredictions,
  }
}
