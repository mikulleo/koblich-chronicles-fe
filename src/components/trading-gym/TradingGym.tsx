'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Dumbbell, FlaskConical, TrendingUp, TrendingDown, Calendar, Search,
  Play, Layers, Eye, MousePointerClick, BarChart3, ChevronDown, ChevronUp,
} from 'lucide-react'
import apiClient from '@/lib/api/client'
import type { Trade, Ticker } from '@/lib/types'
import TradeReplayPlayer from '@/components/trade-replay/TradeReplayPlayer'
import { useAnalytics } from '@/hooks/use-analytics'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface TradeCard {
  id: string
  symbol: string
  type: 'long' | 'short'
  sector: string
  month: string
  year: string
  entryDate: string
  addonCount: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getMonth(dateStr: string): string {
  try { return MONTHS[new Date(dateStr).getMonth()] } catch { return '' }
}

function getYear(dateStr: string): string {
  try { return new Date(dateStr).getFullYear().toString() } catch { return '' }
}

/* ------------------------------------------------------------------ */
/* Add-on detection                                                     */
/* ------------------------------------------------------------------ */

function getLastExitDate(trade: Trade): number | null {
  if (!trade.exits || trade.exits.length === 0) return null
  let latest = 0
  for (const exit of trade.exits) {
    const t = new Date(exit.date).getTime()
    if (t > latest) latest = t
  }
  return latest || null
}

function detectAddons(trades: Trade[]): { addonIds: Set<string>; addonCounts: Map<string, number> } {
  const addonIds = new Set<string>()
  const addonCounts = new Map<string, number>()

  // Group by ticker ID + type
  const groups = new Map<string, Trade[]>()
  for (const t of trades) {
    const tickerId = typeof t.ticker === 'object' ? (t.ticker as Ticker).id : String(t.ticker)
    const key = `${tickerId}__${t.type}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue
    group.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())

    for (let i = 0; i < group.length; i++) {
      const parent = group[i]
      if (addonIds.has(parent.id)) continue

      const lastExit = getLastExitDate(parent)
      if (!lastExit) continue

      for (let j = i + 1; j < group.length; j++) {
        const candidate = group[j]
        if (addonIds.has(candidate.id)) continue

        if (new Date(candidate.entryDate).getTime() <= lastExit) {
          addonIds.add(candidate.id)
          addonCounts.set(parent.id, (addonCounts.get(parent.id) || 0) + 1)
        }
      }
    }
  }

  return { addonIds, addonCounts }
}

/* ------------------------------------------------------------------ */
/* Decorative chart path per symbol                                     */
/* ------------------------------------------------------------------ */

function generateChartPath(symbol: string): string {
  let h = 0
  for (let i = 0; i < symbol.length; i++) {
    h = ((h << 5) - h) + symbol.charCodeAt(i)
    h |= 0
  }
  h = Math.abs(h)

  const pts: number[] = []
  let seed = h
  for (let i = 0; i < 10; i++) {
    seed = (seed * 16807) % 2147483647
    pts.push(12 + (seed % 26))
  }

  return pts
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${((i / (pts.length - 1)) * 180).toFixed(1)},${y}`)
    .join(' ')
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function TradingGym() {
  const [trades, setTrades] = useState<TradeCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const { trackEvent } = useAnalytics()

  useEffect(() => {
    async function fetchTrades() {
      try {
        const { data } = await apiClient.get('/trades', {
          params: { limit: 1000, depth: 1 },
        })
        const docs: Trade[] = data?.docs ?? []
        const closed = docs.filter((t) => t.status === 'closed')

        // Detect add-ons
        const { addonIds, addonCounts } = detectAddons(closed)

        const cards: TradeCard[] = closed
          .filter((t) => !addonIds.has(t.id))
          .map((t) => {
            const ticker = typeof t.ticker === 'object' ? (t.ticker as Ticker) : null
            const symbol = ticker?.symbol ?? (typeof t.ticker === 'string' ? t.ticker : '?')
            const sector = ticker?.sector ?? ''
            return {
              id: t.id,
              symbol,
              type: t.type,
              sector,
              month: getMonth(t.entryDate),
              year: getYear(t.entryDate),
              entryDate: t.entryDate,
              addonCount: addonCounts.get(t.id) || 0,
            }
          })
          .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())

        setTrades(cards)
      } catch (e) {
        console.error('Failed to fetch trades:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchTrades()
  }, [])

  const years = useMemo(() => {
    const s = new Set(trades.map((t) => t.year))
    return [...s].sort((a, b) => b.localeCompare(a))
  }, [trades])

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filterYear !== 'all' && t.year !== filterYear) return false
      if (filterType === 'long' && t.type !== 'long') return false
      if (filterType === 'short' && t.type !== 'short') return false
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [trades, filterYear, filterType, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, TradeCard[]>>()
    filtered.forEach((t) => {
      if (!map.has(t.year)) map.set(t.year, new Map())
      const yearMap = map.get(t.year)!
      if (!yearMap.has(t.month)) yearMap.set(t.month, [])
      yearMap.get(t.month)!.push(t)
    })
    return map
  }, [filtered])

  if (selectedTradeId) {
    return <TradeReplayPlayer tradeId={selectedTradeId} onClose={() => setSelectedTradeId(null)} />
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
            <Dumbbell className="h-7 w-7 text-purple-400" />
            <div className="absolute inset-0 rounded-xl bg-purple-400/5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Trading Gym
            </h1>
            <p className="text-sm text-muted-foreground">
              Replay real trades candle-by-candle and test your decisions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10">
            <FlaskConical className="h-3 w-3 mr-1" />
            Experimental
          </Badge>
          <p className="text-xs text-muted-foreground">
            This section currently includes <strong className="text-foreground/70">Trade Replay</strong> — pick a trade, make your own calls, and compare with what actually happened. More Trading Gym features (mindset tracking, mental edge tools) are coming soon.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.03] overflow-hidden">
        <button
          onClick={() => setTutorialOpen(!tutorialOpen)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-purple-500/5 transition-colors"
        >
          <span className="text-sm font-medium text-purple-300">How does Trading Gym work?</span>
          {tutorialOpen ? (
            <ChevronUp className="h-4 w-4 text-purple-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-purple-400" />
          )}
        </button>

        <AnimatePresence>
          {tutorialOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-emerald-500/10">
                      <Eye className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">1. Watch the setup</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The chart plays candle-by-candle, starting before the trade entry.
                        Study the price action as it develops and try to spot the setup.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-blue-500/10">
                      <MousePointerClick className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">2. Make your calls</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enable &quot;Think Along&quot; mode to decide: buy or pass? Set your own entry
                        price, stop loss, and position size. Manage the trade as new candles appear.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-purple-500/10">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">3. Compare results</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        After each decision, see what the trader actually did. At the end,
                        compare your P&L and R-multiple side by side.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-purple-500/10">
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Space</kbd> Play / Pause</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Arrow keys</kbd> Step candles</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">P</kbd> Toggle Think Along</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">R</kbd> Restart</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Close</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-background border rounded-md text-sm w-40 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex gap-1 bg-muted/50 rounded-md p-0.5">
          {['all', ...years].map((y) => (
            <button
              key={y}
              onClick={() => setFilterYear(y)}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                filterYear === y ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {y === 'all' ? 'All Years' : y}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-muted/50 rounded-md p-0.5">
          {[
            { key: 'all', label: 'All' },
            { key: 'long', label: 'Long' },
            { key: 'short', label: 'Short' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                filterType === f.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Trade list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border bg-card animate-pulse">
              <div className="p-4 space-y-3">
                <div className="h-5 w-16 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted/60 rounded" />
                <div className="flex-1" />
                <div className="h-3 w-12 bg-muted/40 rounded mt-8" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No trades match your filters</div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()]
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([year, monthMap]) => (
              <div key={year}>
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">{year}</h2>
                <div className="space-y-5">
                  {[...monthMap.entries()]
                    .sort(([a], [b]) => MONTHS.indexOf(b) - MONTHS.indexOf(a))
                    .map(([month, cards]) => (
                      <div key={`${year}-${month}`}>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          {month} {year}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          <AnimatePresence>
                            {cards.map((trade, i) => (
                              <motion.button
                                key={trade.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  trackEvent('gym_trade_select', {
                                    trade_id: trade.id,
                                    ticker: trade.symbol,
                                    trade_type: trade.type,
                                  })
                                  setSelectedTradeId(trade.id)
                                }}
                                className={cn(
                                  'group relative text-left overflow-hidden rounded-xl border transition-all duration-300 h-32',
                                  'bg-gradient-to-br from-card via-card to-card/80',
                                  'hover:shadow-lg hover:shadow-purple-500/10',
                                  'hover:border-purple-500/40',
                                )}
                              >
                                {/* Top accent gradient bar */}
                                <div className={cn(
                                  'absolute top-0 left-0 right-0 h-[2px]',
                                  trade.type === 'long'
                                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-400/50 to-transparent'
                                    : 'bg-gradient-to-r from-rose-500 via-rose-400/50 to-transparent',
                                )} />

                                {/* Background watermark */}
                                <div className="absolute -right-1 -bottom-2 text-[3.5rem] font-black text-foreground/[0.03] leading-none select-none pointer-events-none tracking-tighter">
                                  {trade.symbol}
                                </div>

                                {/* Decorative chart line */}
                                <svg
                                  className={cn(
                                    'absolute bottom-1 left-3 right-3 h-8 opacity-[0.05] group-hover:opacity-[0.12] transition-opacity pointer-events-none',
                                    trade.type === 'long' ? 'text-emerald-400' : 'text-rose-400',
                                  )}
                                  viewBox="0 0 180 50"
                                  preserveAspectRatio="none"
                                >
                                  <path
                                    d={generateChartPath(trade.symbol)}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>

                                {/* Content */}
                                <div className="relative p-4 h-full flex flex-col justify-between">
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1 mr-2">
                                      <h3 className="text-xl font-bold tracking-tight group-hover:text-purple-400 transition-colors">
                                        {trade.symbol}
                                      </h3>
                                      {trade.sector && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                          {trade.sector}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {trade.addonCount > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1.5 py-0 h-4 border-purple-500/30 text-purple-400 bg-purple-500/10"
                                        >
                                          <Layers className="h-2.5 w-2.5 mr-0.5" />
                                          +{trade.addonCount}
                                        </Badge>
                                      )}
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[9px] px-1.5 py-0 h-4',
                                          trade.type === 'long'
                                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                            : 'border-rose-500/30 text-rose-400 bg-rose-500/10',
                                        )}
                                      >
                                        {trade.type === 'long' ? (
                                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                        ) : (
                                          <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                        )}
                                        {trade.type}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground">
                                      {trade.month} {trade.year}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <div className="flex items-center gap-1 text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                                        <Play className="h-3 w-3 fill-purple-400" />
                                        Replay
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.button>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
