'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { FULL_SHARES } from '@/hooks/use-user-portfolio'
import type { TradeLot, ClosedPortion } from '@/lib/types/candlestick'

interface PerformanceSummaryProps {
  lots: TradeLot[]
  closedPortions: ClosedPortion[]
  tradeType: 'long' | 'short'
  currentPrice: number
  compact?: boolean
}

export default function PerformanceSummary({
  lots,
  closedPortions,
  tradeType,
  currentPrice,
  compact = false,
}: PerformanceSummaryProps) {
  if (lots.length === 0 && closedPortions.length === 0) return null

  const isLong = tradeType === 'long'
  const activeLots = lots.filter(l => l.remainingShares > 0)
  const totalOpenShares = activeLots.reduce((s, l) => s + l.remainingShares, 0)

  // Open P&L
  let openPnlPct = 0
  let openPnlR = 0
  if (totalOpenShares > 0 && currentPrice > 0) {
    let pW = 0, rW = 0
    for (const lot of activeLots) {
      const diff = isLong ? currentPrice - lot.entryPrice : lot.entryPrice - currentPrice
      const R = Math.abs(lot.entryPrice - lot.initialStop)
      pW += (diff / lot.entryPrice) * 100 * lot.remainingShares
      rW += (R > 0 ? diff / R : 0) * lot.remainingShares
    }
    openPnlPct = pW / totalOpenShares
    openPnlR = rW / totalOpenShares
  }

  // Closed P&L
  const totalClosedShares = closedPortions.reduce((s, c) => s + c.shares, 0)
  let closedPnlPct = 0
  let closedPnlR = 0
  if (totalClosedShares > 0) {
    let pW = 0, rW = 0
    for (const cp of closedPortions) {
      pW += cp.pnlPercent * cp.shares
      rW += cp.pnlR * cp.shares
    }
    closedPnlPct = pW / totalClosedShares
    closedPnlR = rW / totalClosedShares
  }

  const PnlBadge = ({ label, pct, r, shares }: { label: string; pct: number; r: number; shares: number }) => (
    <div className={cn(
      'rounded-lg p-2',
      pct >= 0 ? 'bg-green-950/50' : 'bg-red-950/50',
    )}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-gray-500">{label} ({Math.round((shares / FULL_SHARES) * 100)}%)</span>
        <div className="text-right">
          <span className={cn('text-xs font-mono font-medium', pct >= 0 ? 'text-green-400' : 'text-red-400')}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
          </span>
          <span className={cn('text-[10px] font-mono ml-2', r >= 0 ? 'text-green-400' : 'text-red-400')}>
            {r >= 0 ? '+' : ''}{r.toFixed(2)}R
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] text-gray-500 uppercase tracking-wider">Your Performance</h4>

      {totalOpenShares > 0 && currentPrice > 0 && (
        <PnlBadge label="Open" pct={openPnlPct} r={openPnlR} shares={totalOpenShares} />
      )}

      {closedPortions.length > 0 && (
        <PnlBadge label="Closed" pct={closedPnlPct} r={closedPnlR} shares={totalClosedShares} />
      )}

      {/* Per-lot breakdown (only when multiple lots) */}
      {!compact && activeLots.length > 1 && currentPrice > 0 && (
        <div className="space-y-1">
          {activeLots.map((lot, i) => {
            const diff = isLong ? currentPrice - lot.entryPrice : lot.entryPrice - currentPrice
            const R = Math.abs(lot.entryPrice - lot.initialStop)
            const pct = (diff / lot.entryPrice) * 100
            const r = R > 0 ? diff / R : 0
            return (
              <div key={lot.id} className="flex justify-between text-[10px] text-gray-500 px-1">
                <span>Lot {i + 1}: {Math.round((lot.remainingShares / FULL_SHARES) * 100)}% @ ${lot.entryPrice.toFixed(2)}</span>
                <span className={cn(pct >= 0 ? 'text-green-500' : 'text-red-500')}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}% / {r >= 0 ? '+' : ''}{r.toFixed(1)}R
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
