'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FULL_SHARES } from '@/hooks/use-user-portfolio'
import type { DecisionPoint, TradeLot, UserActionPhase } from '@/lib/types/candlestick'

interface UserActionOverlayProps {
  phase: UserActionPhase
  totalShares: number
  lots: TradeLot[]
  currentDecisionPoint: DecisionPoint | null
  isAdhoc: boolean
  userActionSummary: string
  leosEntry?: { price: number; stop: number; positionDesc: string }
  userEntry?: { price: number; stop: number; shares: number }
  onConfirmBuy: () => void
  onDeclineEntry: () => void
  onSetEntrySize: (shares: number) => void
  onSetAddSize: (shares: number) => void
  onChooseAction: (action: 'sell' | 'sell_all' | 'add' | 'hold' | 'move_stop') => void
  onConfirmSellAmount: (percent: number, date?: string) => void
  onStopHitSell: () => void
  onStopHitGiveRoom: () => void
  onContinueFromReveal: () => void
  onContinueFromEntryReveal: () => void
  onCancel: () => void
}

const SIZE_OPTIONS = [
  { shares: FULL_SHARES, label: 'Full', desc: '100%' },
  { shares: Math.round(FULL_SHARES / 2), label: 'Half', desc: '50%' },
  { shares: Math.round(FULL_SHARES / 4), label: 'Quarter', desc: '25%' },
]

const SELL_PRESETS = [25, 33, 50, 75, 100]

export default function UserActionOverlay({
  phase,
  totalShares,
  lots,
  currentDecisionPoint,
  isAdhoc,
  userActionSummary,
  leosEntry,
  userEntry,
  onConfirmBuy,
  onDeclineEntry,
  onSetEntrySize,
  onSetAddSize,
  onChooseAction,
  onConfirmSellAmount,
  onStopHitSell,
  onStopHitGiveRoom,
  onContinueFromReveal,
  onContinueFromEntryReveal,
  onCancel,
}: UserActionOverlayProps) {
  const [customSellPct, setCustomSellPct] = useState('')

  if (phase === 'idle') return null

  const renderContent = () => {
    switch (phase) {
      case 'entry_prompt':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Entry point reached</p>
            <p className="text-white text-base font-medium mb-4">Would you buy here?</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={onConfirmBuy} className="bg-green-600 hover:bg-green-700 text-white px-6" size="sm">
                Buy
              </Button>
              <Button onClick={onDeclineEntry} className="bg-gray-700 hover:bg-gray-600 text-white px-6" size="sm">
                Pass
              </Button>
            </div>
          </div>
        )

      case 'entry_sizing':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Position Size</p>
            <p className="text-white text-sm mb-3">How much would you buy?</p>
            <div className="flex gap-2 justify-center mb-3">
              {SIZE_OPTIONS.map(opt => (
                <Button
                  key={opt.shares}
                  onClick={() => onSetEntrySize(opt.shares)}
                  className="bg-gray-700 hover:bg-gray-600 text-white flex flex-col items-center px-5 py-3 h-auto min-w-0"
                  size="sm"
                >
                  <span className="text-sm font-medium leading-tight">{opt.desc}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.label}</span>
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 leading-snug">
              {`"Full" = your full position size`}
            </p>
          </div>
        )

      case 'entry_price':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Set Your Entry Price</p>
            <p className="text-white text-sm mb-3">Click on the chart where you&apos;d buy</p>
            <div className="w-12 h-12 mx-auto rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <p className="text-[10px] text-gray-500 mt-3">Click on the chart to set your entry price</p>
          </div>
        )

      case 'entry_stop':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Set Your Stop Loss</p>
            <p className="text-white text-sm mb-3">Click on the chart where you&apos;d place your stop</p>
            <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
            </div>
            <p className="text-[10px] text-gray-500 mt-3">Click anywhere on the chart to set the price level</p>
          </div>
        )

      case 'entry_reveal':
        return (
          <div>
            <p className="text-sm text-purple-400 font-medium text-center mb-3">Entry Comparison</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Your Entry</p>
                {userEntry && (
                  <>
                    <p className="text-sm text-white">@ ${userEntry.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{Math.round((userEntry.shares / FULL_SHARES) * 100)}% position</p>
                    <p className="text-xs text-orange-400">Stop: ${userEntry.stop.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      R = ${Math.abs(userEntry.price - userEntry.stop).toFixed(2)}
                    </p>
                  </>
                )}
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 uppercase mb-1">{"Leo\u0161's Entry"}</p>
                {leosEntry && (
                  <>
                    <p className="text-sm text-white">@ ${leosEntry.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{leosEntry.positionDesc}</p>
                    <p className="text-xs text-orange-400">Stop: ${leosEntry.stop.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      R = ${Math.abs(leosEntry.price - leosEntry.stop).toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="text-center">
              <Button onClick={onContinueFromEntryReveal} className="bg-white/10 hover:bg-white/20 text-white" size="sm">
                Continue
              </Button>
            </div>
          </div>
        )

      case 'action_prompt':
      case 'adhoc_prompt': {
        const isDecision = phase === 'action_prompt'
        return (
          <div>
            <p className="text-sm text-gray-400 mb-1">
              {isDecision ? 'Decision Point' : 'Your Action'}
            </p>
            <p className="text-white text-sm mb-3">
              {isDecision ? (currentDecisionPoint?.prompt || 'What would you do here?') : 'What would you do here?'}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {totalShares > 0 && (
                <>
                  <Button onClick={() => onChooseAction('sell')} className="bg-red-600 hover:bg-red-700 text-white text-xs" size="sm">
                    Sell Portion
                  </Button>
                  <Button onClick={() => onChooseAction('sell_all')} className="bg-red-800 hover:bg-red-900 text-white text-xs" size="sm">
                    Sell All
                  </Button>
                </>
              )}
              <Button onClick={() => onChooseAction('add')} className="bg-green-600 hover:bg-green-700 text-white text-xs" size="sm">
                Add to Position
              </Button>
              {totalShares > 0 && (
                <Button onClick={() => onChooseAction('move_stop')} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs" size="sm">
                  Move Stop
                </Button>
              )}
              {isDecision && (
                <Button onClick={() => onChooseAction('hold')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs col-span-2" size="sm">
                  Hold / Do Nothing
                </Button>
              )}
            </div>
            {totalShares > 0 && (
              <p className="text-[10px] text-gray-500 text-center mt-1">
                Open: {Math.round((totalShares / FULL_SHARES) * 100)}% across {lots.filter(l => l.remainingShares > 0).length} lot{lots.filter(l => l.remainingShares > 0).length > 1 ? 's' : ''}
              </p>
            )}
            {!isDecision && (
              <div className="text-center mt-2">
                <Button onClick={onCancel} variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs" size="sm">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )
      }

      case 'sell_amount':
        return (
          <div>
            <p className="text-sm text-gray-400 mb-1">Sell Position</p>
            <p className="text-white text-sm mb-3">How much to sell? ({Math.round((totalShares / FULL_SHARES) * 100)}% open)</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {SELL_PRESETS.map(pct => (
                <Button
                  key={pct}
                  onClick={() => onConfirmSellAmount(pct)}
                  className="bg-red-600/80 hover:bg-red-700 text-white text-xs"
                  size="sm"
                >
                  {pct}%
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={customSellPct}
                onChange={(e) => setCustomSellPct(e.target.value)}
                placeholder="Custom %"
                min="1"
                max="100"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <Button
                onClick={() => {
                  const n = parseInt(customSellPct)
                  if (n > 0 && n <= 100) { onConfirmSellAmount(n); setCustomSellPct('') }
                }}
                disabled={!customSellPct}
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
                size="sm"
              >
                Sell
              </Button>
            </div>
            <div className="text-center mt-2">
              <Button onClick={onCancel} variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        )

      case 'sell_price':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Set Exit Price</p>
            <p className="text-white text-sm mb-3">Click on the chart at your exit price</p>
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <p className="text-[10px] text-gray-500 mt-3">Click anywhere on the chart to set the price</p>
            <Button onClick={onCancel} variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs mt-2" size="sm">
              Cancel
            </Button>
          </div>
        )

      case 'add_sizing':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Add to Position</p>
            <p className="text-white text-sm mb-3">How much to add?</p>
            <div className="flex gap-2 justify-center mb-3">
              {SIZE_OPTIONS.map(opt => (
                <Button
                  key={opt.shares}
                  onClick={() => onSetAddSize(opt.shares)}
                  className="bg-gray-700 hover:bg-gray-600 text-white flex flex-col items-center px-5 py-3 h-auto min-w-0"
                  size="sm"
                >
                  <span className="text-sm font-medium leading-tight">{opt.desc}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.label}</span>
                </Button>
              ))}
            </div>
            <Button onClick={onCancel} variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs" size="sm">
              Cancel
            </Button>
          </div>
        )

      case 'add_price':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Add Entry Price</p>
            <p className="text-white text-sm mb-3">Click on the chart at your add entry price</p>
            <div className="w-12 h-12 mx-auto rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <p className="text-[10px] text-gray-500 mt-3">Click on the chart to set entry price for this add</p>
            <Button onClick={onCancel} variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs mt-2" size="sm">
              Cancel
            </Button>
          </div>
        )

      case 'add_stop':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Stop for Add</p>
            <p className="text-white text-sm mb-3">Click on the chart to set stop for this new lot</p>
            <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
            </div>
            <p className="text-[10px] text-gray-500 mt-3">Click anywhere on the chart to set stop level</p>
            <Button onClick={onCancel} variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs mt-2" size="sm">
              Cancel
            </Button>
          </div>
        )

      case 'move_stop':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Move Stop Loss</p>
            <p className="text-white text-sm mb-3">Click on the chart at the new stop level</p>
            <div className="w-12 h-12 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
            </div>
            <p className="text-[10px] text-gray-500 mt-3">Click anywhere on the chart to set the new stop</p>
            <Button onClick={onCancel} variant="ghost" className="text-gray-500 hover:text-gray-300 text-xs mt-2" size="sm">
              Cancel
            </Button>
          </div>
        )

      case 'action_reveal': {
        const leosAction = currentDecisionPoint
          ? currentDecisionPoint.actualDecisions.map(d => {
            switch (d) {
              case 'buy': return 'Buy'
              case 'sell': return 'Sell'
              case 'hold': return 'Hold'
              case 'tightenStop': return 'Tighten Stop'
              default: return d
            }
          }).join(' + ')
          : '\u2014'

        return (
          <div>
            <p className="text-sm text-purple-400 font-medium text-center mb-3">Decision Comparison</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Your Call</p>
                <p className="text-sm text-white">{userActionSummary}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase mb-1">{"Leo\u0161's Call"}</p>
                <p className="text-sm text-white">{leosAction}</p>
                {currentDecisionPoint?.actualPrice != null && (
                  <p className="text-xs text-gray-400">@ ${currentDecisionPoint.actualPrice.toFixed(2)}</p>
                )}
              </div>
            </div>
            <div className="text-center">
              <Button onClick={onContinueFromReveal} className="bg-white/10 hover:bg-white/20 text-white" size="sm">
                Continue
              </Button>
            </div>
          </div>
        )
      }

      case 'stop_hit':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-3 animate-pulse">
              <span className="text-red-400 text-xl font-bold">!</span>
            </div>
            <p className="text-red-400 font-bold text-base mb-2">Your stop was hit!</p>
            <p className="text-sm text-gray-400 mb-4">Will you sell or give it some room?</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={onStopHitSell} className="bg-red-600 hover:bg-red-700 text-white" size="sm">
                Sell
              </Button>
              <Button onClick={onStopHitGiveRoom} className="bg-yellow-600 hover:bg-yellow-700 text-white" size="sm">
                Give Room (Move Stop)
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute bottom-4 left-4 right-4 z-20"
      >
        <div className={cn(
          'bg-gray-900/95 backdrop-blur-md rounded-xl p-4 border max-w-lg mx-auto',
          phase === 'stop_hit' ? 'border-red-500/50' : 'border-gray-700',
        )}>
          {renderContent()}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
