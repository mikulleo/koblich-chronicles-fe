'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PredictionPhase, PredictionComparison, DecisionPoint } from '@/lib/types/candlestick'

interface PredictionOverlayProps {
  phase: PredictionPhase
  decisionPoint: DecisionPoint | null
  comparison: PredictionComparison | null
  score: { aligned: number; total: number }
  selectedDecisions: string[]
  onToggleDecision: (type: 'buy' | 'sell' | 'hold' | 'tightenStop') => void
  onConfirm: () => void
  onSkip: () => void
  onReveal: () => void
  onContinue: () => void
}

const DECISION_BUTTONS = [
  { type: 'buy' as const, label: 'Buy / Add', color: 'bg-green-600 hover:bg-green-700', selectedColor: 'bg-green-500 ring-2 ring-green-300', emoji: '📈' },
  { type: 'sell' as const, label: 'Sell / Exit', color: 'bg-red-600 hover:bg-red-700', selectedColor: 'bg-red-500 ring-2 ring-red-300', emoji: '📉' },
  { type: 'hold' as const, label: 'Hold', color: 'bg-blue-600 hover:bg-blue-700', selectedColor: 'bg-blue-500 ring-2 ring-blue-300', emoji: '✊' },
  { type: 'tightenStop' as const, label: 'Tighten Stop', color: 'bg-yellow-600 hover:bg-yellow-700', selectedColor: 'bg-yellow-500 ring-2 ring-yellow-300', emoji: '🛡' },
]

const VERDICT_CONFIG = {
  match: { label: 'Same Decision', color: 'text-purple-400', bg: 'bg-purple-950/50' },
  close: { label: 'Partially Aligned', color: 'text-blue-400', bg: 'bg-blue-950/50' },
  miss: { label: 'Different Approach', color: 'text-gray-400', bg: 'bg-gray-800/50' },
}

export default function PredictionOverlay({
  phase,
  decisionPoint,
  comparison,
  score,
  selectedDecisions,
  onToggleDecision,
  onConfirm,
  onSkip,
  onReveal,
  onContinue,
}: PredictionOverlayProps) {
  if (phase === 'idle') return null

  return (
    <AnimatePresence mode="wait">
      {phase === 'placing' && decisionPoint && (
        <motion.div
          key="placing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute bottom-4 left-4 right-4 z-20"
        >
          <div className="bg-gray-900/95 backdrop-blur-md rounded-xl p-4 border border-gray-700 max-w-lg mx-auto">
            <p className="text-sm text-gray-400 mb-1">What would you do?</p>
            <p className="text-white text-sm mb-3">{decisionPoint.prompt}</p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {DECISION_BUTTONS.filter((btn) =>
                decisionPoint.options.includes(btn.type)
              ).map((btn) => {
                const isSelected = selectedDecisions.includes(btn.type)
                return (
                  <Button
                    key={btn.type}
                    onClick={() => onToggleDecision(btn.type)}
                    className={cn(
                      'text-white text-xs py-2 transition-all',
                      isSelected ? btn.selectedColor : btn.color
                    )}
                    size="sm"
                  >
                    <span className="mr-1">{btn.emoji}</span>
                    {btn.label}
                  </Button>
                )
              })}
            </div>

            <div className="flex gap-2">
              {selectedDecisions.length > 0 && (
                <Button
                  onClick={onConfirm}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                  size="sm"
                >
                  Lock In ({selectedDecisions.length})
                </Button>
              )}
              <Button
                onClick={onSkip}
                variant="ghost"
                className="text-gray-500 hover:text-gray-300 text-xs"
                size="sm"
              >
                Skip
              </Button>
            </div>

            <p className="text-[10px] text-gray-500 text-center mt-2">
              Select one or more actions, then lock in
            </p>
          </div>
        </motion.div>
      )}

      {phase === 'decided' && (
        <motion.div
          key="decided"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-4 left-4 right-4 z-20"
        >
          <div className="bg-gray-900/95 backdrop-blur-md rounded-xl p-4 border border-gray-700 max-w-sm mx-auto text-center">
            <p className="text-sm text-gray-400 mb-3">Decision locked in!</p>
            <Button
              onClick={onReveal}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              Compare with Leoš
            </Button>
          </div>
        </motion.div>
      )}

      {phase === 'revealed' && comparison && (
        <motion.div
          key="revealed"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-4 left-4 right-4 z-20"
        >
          <div
            className={cn(
              'backdrop-blur-md rounded-xl p-5 border border-gray-700 max-w-md mx-auto',
              VERDICT_CONFIG[comparison.verdict].bg
            )}
          >
            <div className="text-center mb-3">
              <p
                className={cn(
                  'text-lg font-bold',
                  VERDICT_CONFIG[comparison.verdict].color
                )}
              >
                {VERDICT_CONFIG[comparison.verdict].label}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Your Call</p>
                <p className="text-sm text-white">{comparison.userAction}</p>
                {comparison.userPrice != null && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    @ ${comparison.userPrice.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Leoš&apos;s Call</p>
                <p className="text-sm text-white">{comparison.actualAction}</p>
                {comparison.actualPrice != null && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    @ ${comparison.actualPrice.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Aligned: {score.aligned}/{score.total}
              </p>
              <Button
                onClick={onContinue}
                className="bg-white/10 hover:bg-white/20 text-white"
                size="sm"
              >
                Continue
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
