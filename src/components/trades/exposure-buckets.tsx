// src/components/trades/exposure-buckets.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Target, RefreshCw, Info, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import apiClient from '@/lib/api/client'
import {
  FULL_POSITION_PCT_OF_EQUITY,
  normalizationToEquityPct,
  equityPctToPositionPct,
  formatPct,
} from '@/lib/utils/exposure-calculations'

// Each bucket represents 100% of account equity. Bucket 1 is your equity;
// buckets 2-4 only start filling once total exposure goes past 100% (margin).
const BUCKET_COUNT = 4
const BUCKET_CAPACITY_PCT = 100
const EPSILON = 0.01

interface ExposureTrade {
  id: string
  ticker: {
    id: string
    symbol: string
  }
  status: 'open' | 'partial'
  equityPct: number // remaining size as % of account equity
  fullEquityPct: number // original size as % of account equity
}

interface BucketSlice {
  trade: ExposureTrade
  equityPctInBucket: number
  spansBuckets: number[] // bucket ids this position occupies (shared per trade)
}

interface BucketData {
  id: number
  slices: BucketSlice[]
  totalEquityPct: number
}

interface RawTrade {
  id: string
  ticker: {
    id: string
    symbol: string
  }
  status: 'open' | 'partial'
  shares?: number
  exits?: Array<{ shares: number }>
  normalizationFactor?: number
}

const mapTrade = (trade: RawTrade): ExposureTrade => {
  const fullEquityPct = normalizationToEquityPct(trade.normalizationFactor || 0)

  let equityPct = fullEquityPct
  if (trade.status === 'partial' && trade.exits?.length && trade.shares) {
    const exitedShares = trade.exits.reduce((sum, exit) => sum + exit.shares, 0)
    const remainingRatio = Math.max(0, trade.shares - exitedShares) / trade.shares
    equityPct = fullEquityPct * remainingRatio
  }

  return {
    id: trade.id,
    ticker: trade.ticker,
    status: trade.status,
    equityPct,
    fullEquityPct,
  }
}

/**
 * Sequential fill: bucket 1 fills first, overflow spills into bucket 2, etc.
 * Heaviest full-size positions anchor bucket 1; partials spill first, then the
 * smallest full positions. A position straddling a bucket boundary spans both.
 */
const distributeSequentially = (trades: ExposureTrade[]): BucketData[] => {
  const sorted = [...trades]
    .filter((trade) => trade.equityPct > EPSILON)
    .sort((a, b) => {
      const aPartial = a.status === 'partial'
      const bPartial = b.status === 'partial'
      if (aPartial !== bPartial) return aPartial ? 1 : -1
      return b.equityPct - a.equityPct
    })

  const buckets: BucketData[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    id: i + 1,
    slices: [],
    totalEquityPct: 0,
  }))

  let cursor = 0 // running total exposure in % of equity
  for (const trade of sorted) {
    let remaining = trade.equityPct
    const spansBuckets: number[] = []

    while (remaining > EPSILON) {
      const bucketIndex = Math.min(Math.floor((cursor + EPSILON) / BUCKET_CAPACITY_PCT), BUCKET_COUNT - 1)
      const bucket = buckets[bucketIndex]
      const room = (bucketIndex + 1) * BUCKET_CAPACITY_PCT - cursor
      // Past the last bucket there is nowhere left to spill: overfill bucket 4
      const take = bucketIndex === BUCKET_COUNT - 1 ? remaining : Math.min(remaining, room)

      bucket.slices.push({ trade, equityPctInBucket: take, spansBuckets })
      bucket.totalEquityPct += take
      spansBuckets.push(bucket.id)
      cursor += take
      remaining -= take
    }
  }

  return buckets
}

// --- 3D bucket geometry (SVG viewBox 0 0 360 280, bucket centered at CX,
// with a right-hand gutter for leader-line labels of thin slices) ---
const VIEW_W = 360
const VIEW_H = 280
const CX = 130
const TOP_Y = 44 // y of the rim ellipse center
const BOTTOM_Y = 240 // y of the bucket floor ellipse center
const OUTER_TOP_RX = 88
const OUTER_BOTTOM_RX = 62
const INNER_TOP_RX = 81
const INNER_BOTTOM_RX = 56
const RIM_RY = 15
const BOTTOM_RY = 11
const FILL_TOP_Y = 62 // liquid level when the bucket is 100% full
const INSIDE_LABEL_MIN = 12 // slices thinner than this get an outside label
const LABEL_X = 248 // where outside labels start
const LABEL_GAP = 14 // min vertical distance between outside labels

const innerRadiusAt = (y: number) =>
  INNER_TOP_RX + ((INNER_BOTTOM_RX - INNER_TOP_RX) * (y - TOP_Y)) / (BOTTOM_Y - TOP_Y)

const ellipseRyAt = (r: number) => Math.max(6, r * 0.16)

// Cylindrical band: elliptical arcs top and bottom so it reads as liquid
const bandPath = (yTop: number, yBottom: number) => {
  const rT = innerRadiusAt(yTop)
  const rB = innerRadiusAt(yBottom)
  const eT = ellipseRyAt(rT)
  const eB = ellipseRyAt(rB)
  return [
    `M ${CX - rT} ${yTop}`,
    `A ${rT} ${eT} 0 0 0 ${CX + rT} ${yTop}`,
    `L ${CX + rB} ${yBottom}`,
    `A ${rB} ${eB} 0 0 1 ${CX - rB} ${yBottom}`,
    'Z',
  ].join(' ')
}

const bucketBodyPath = (topRx: number, bottomRx: number) => [
  `M ${CX - topRx} ${TOP_Y}`,
  `A ${topRx} ${RIM_RY} 0 0 0 ${CX + topRx} ${TOP_Y}`,
  `L ${CX + bottomRx} ${BOTTOM_Y}`,
  `A ${bottomRx} ${BOTTOM_RY} 0 0 1 ${CX - bottomRx} ${BOTTOM_Y}`,
  'Z',
].join(' ')

interface BandLayout {
  slice: BucketSlice
  yTop: number
  yBottom: number
}

interface LabelLayout {
  band: BandLayout
  inside: boolean
  // The band's *visual* center at the bucket's horizontal middle: the elliptical
  // edges bulge downward, so it sits below the geometric midpoint.
  anchorY: number
  labelY: number // where the label text sits (differs from anchorY when stacked outside)
}

// Bands stack bottom-up in fill order with heights strictly proportional to
// position size (only renormalized as a whole when a bucket is overfilled).
const layoutBands = (bucket: BucketData): { bands: BandLayout[]; liquidTopY: number } => {
  const clampScale = bucket.totalEquityPct > 100 ? 100 / bucket.totalEquityPct : 1

  const bands: BandLayout[] = []
  let cursor = BOTTOM_Y
  for (const slice of bucket.slices) {
    const height = ((slice.equityPctInBucket * clampScale) / 100) * (BOTTOM_Y - FILL_TOP_Y)
    bands.push({ slice, yTop: cursor - height, yBottom: cursor })
    cursor -= height
  }

  return { bands, liquidTopY: bands.length > 0 ? bands[bands.length - 1].yTop : BOTTOM_Y }
}

// Slices tall enough get their label centered inside; the rest are labeled in
// the right-hand gutter, stacked without overlaps and tied back by leader lines.
const layoutLabels = (bands: BandLayout[]): LabelLayout[] => {
  const labels: LabelLayout[] = bands.map((band) => {
    const bulgeTop = ellipseRyAt(innerRadiusAt(band.yTop))
    const bulgeBottom = ellipseRyAt(innerRadiusAt(band.yBottom))
    const anchorY = (band.yTop + bulgeTop + band.yBottom + bulgeBottom) / 2
    return {
      band,
      inside: band.yBottom - band.yTop >= INSIDE_LABEL_MIN,
      anchorY,
      labelY: anchorY,
    }
  })

  const outside = labels.filter((label) => !label.inside).sort((a, b) => a.labelY - b.labelY)
  for (let i = 1; i < outside.length; i++) {
    if (outside[i].labelY - outside[i - 1].labelY < LABEL_GAP) {
      outside[i].labelY = outside[i - 1].labelY + LABEL_GAP
    }
  }
  // If the stack ran past the bucket floor, push it back up
  const maxY = BOTTOM_Y + 4
  for (let i = outside.length - 1; i >= 0; i--) {
    const limit = i === outside.length - 1 ? maxY : outside[i + 1].labelY - LABEL_GAP
    if (outside[i].labelY > limit) outside[i].labelY = limit
  }

  return labels
}

const getExposureLevel = (totalEquityPct: number) => {
  if (totalEquityPct < 50) return {
    level: 'conservative',
    description: 'defensive positioning',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  }
  if (totalEquityPct < 100) return {
    level: 'normal conditions',
    description: 'slightly aggressive',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  }
  if (totalEquityPct < 200) return {
    level: 'very good conditions',
    description: 'aggressive, on margin',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  }
  return {
    level: 'premium conditions',
    description: 'extremely aggressive',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  }
}

export function ExposureBuckets() {
  const [trades, setTrades] = useState<ExposureTrade[]>([])
  const [buckets, setBuckets] = useState<BucketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchOpenTrades()
  }, [])

  const fetchOpenTrades = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.get('/trades', {
        params: {
          limit: 200,
          depth: 1,
          'where[status][in]': 'open,partial',
        }
      })

      if (response.data && response.data.docs) {
        const tradesData = (response.data.docs as RawTrade[]).map(mapTrade)
        setTrades(tradesData)
        setBuckets(distributeSequentially(tradesData))
      }
    } catch (err) {
      console.error('Error fetching trades:', err)
      setError('Failed to load exposure data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOpenTrades()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exposure</CardTitle>
          <CardDescription>Loading exposure data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const totalEquityPct = trades.reduce((sum, trade) => sum + trade.equityPct, 0)
  const onMargin = totalEquityPct > 100 + EPSILON
  const exposureLevel = getExposureLevel(totalEquityPct)

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Exposure
                </CardTitle>
                <CardDescription>
                  How much of your equity is currently deployed
                </CardDescription>
              </div>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{formatPct(totalEquityPct)}</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-80 space-y-2 text-sm">
                      <p>
                        Total exposure as a percentage of your account equity.
                        Above 100% you are trading on margin.
                      </p>
                      <p className="text-muted-foreground border-t pt-2">
                        In position units this is{' '}
                        <span className="font-medium">{formatPct(equityPctToPositionPct(totalEquityPct))}</span>,
                        where a full position = 100% = {FULL_POSITION_PCT_OF_EQUITY}% of equity
                        (so 4 full positions = 100% of equity).
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="text-sm text-muted-foreground">Total Exposure (% of equity)</div>
                <div className="text-xs text-muted-foreground">
                  {onMargin
                    ? `on margin · ${(totalEquityPct / 100).toFixed(2)}x leverage`
                    : `${formatPct(Math.max(0, 100 - totalEquityPct))} of equity free`}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">{trades.length}</div>
                <div className="text-sm text-muted-foreground">Active Positions</div>
                <div className="text-xs text-muted-foreground">
                  {new Set(trades.map(trade => trade.ticker.symbol)).size} unique tickers
                </div>
              </div>
              <div className="space-y-1">
                <Badge className={`${exposureLevel.bgColor} ${exposureLevel.color}`} variant="secondary">
                  {exposureLevel.level.toUpperCase()}
                </Badge>
                <div className="text-xs text-muted-foreground capitalize">
                  {exposureLevel.description}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buckets */}
        <div className="flex flex-wrap items-end justify-center gap-10 py-4">
          {buckets.map((bucket) => {
            const active = bucket.id === 1 || bucket.slices.length > 0
            const overfilled = bucket.totalEquityPct > BUCKET_CAPACITY_PCT + EPSILON

            if (!active) {
              return (
                <div key={bucket.id} className="flex flex-col items-center gap-2 pb-1">
                  <div className="relative">
                    <svg viewBox={`${CX - 110} 0 220 280`} className="h-28 w-[88px] text-muted-foreground/40">
                      <path
                        d={bucketBodyPath(OUTER_TOP_RX, OUTER_BOTTOM_RX)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray="10 8"
                      />
                      <ellipse
                        cx={CX} cy={TOP_Y} rx={OUTER_TOP_RX} ry={RIM_RY}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray="10 8"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pt-3 text-muted-foreground/60">
                      <Lock className="h-4 w-4" />
                      <span className="text-xs font-medium">Bucket {bucket.id}</span>
                    </div>
                  </div>
                  <span className="max-w-28 text-center text-[10px] leading-tight text-muted-foreground">
                    unlocks past {(bucket.id - 1) * 100}% (margin)
                  </span>
                </div>
              )
            }

            const { bands, liquidTopY } = layoutBands(bucket)
            const labels = layoutLabels(bands)
            const topBand = bands[bands.length - 1]
            const surfaceR = topBand ? innerRadiusAt(topBand.yTop) : 0
            const freeLabelY = (TOP_Y + RIM_RY + liquidTopY) / 2

            return (
              <div key={bucket.id} className="flex flex-col items-center gap-3">
                <div className="relative h-[356px] w-[458px] max-w-full">
                  <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full">
                    <defs>
                      <linearGradient id={`metal-${bucket.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b98a9" />
                        <stop offset="16%" stopColor="#dde3ea" />
                        <stop offset="38%" stopColor="#aab6c4" />
                        <stop offset="62%" stopColor="#cdd5de" />
                        <stop offset="86%" stopColor="#94a1b1" />
                        <stop offset="100%" stopColor="#6b7a8c" />
                      </linearGradient>
                      <linearGradient id={`inner-${bucket.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#334155" />
                        <stop offset="100%" stopColor="#64748b" />
                      </linearGradient>
                      <linearGradient id={`liquid-open-${bucket.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#047857" />
                        <stop offset="28%" stopColor="#34d399" />
                        <stop offset="55%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#065f46" />
                      </linearGradient>
                      <linearGradient id={`liquid-partial-${bucket.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0e7490" />
                        <stop offset="28%" stopColor="#22d3ee" />
                        <stop offset="55%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#155e75" />
                      </linearGradient>
                      <filter id={`shadow-${bucket.id}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" />
                      </filter>
                    </defs>

                    {/* Ground shadow */}
                    <ellipse
                      cx={CX} cy={BOTTOM_Y + 12} rx={OUTER_BOTTOM_RX + 14} ry={10}
                      className="fill-black/25 dark:fill-black/50"
                      filter={`url(#shadow-${bucket.id})`}
                    />

                    {/* Galvanized body */}
                    <path
                      d={bucketBodyPath(OUTER_TOP_RX, OUTER_BOTTOM_RX)}
                      fill={`url(#metal-${bucket.id})`}
                      stroke="#4b5a6b"
                      strokeWidth="2"
                    />

                    {/* Opening: dark interior */}
                    <ellipse cx={CX} cy={TOP_Y} rx={OUTER_TOP_RX} ry={RIM_RY} fill={`url(#inner-${bucket.id})`} />

                    {/* Liquid bands (bottom-up fill order) */}
                    {bands.map(({ slice, yTop, yBottom }, index) => (
                      <path
                        key={`${slice.trade.id}-band-${index}`}
                        d={bandPath(yTop, yBottom)}
                        fill={`url(#liquid-${slice.trade.status === 'open' ? 'open' : 'partial'}-${bucket.id})`}
                        stroke="rgba(255,255,255,0.28)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Liquid surface */}
                    {topBand && (
                      <ellipse
                        cx={CX}
                        cy={topBand.yTop}
                        rx={surfaceR}
                        ry={ellipseRyAt(surfaceR)}
                        fill={topBand.slice.trade.status === 'open' ? '#6ee7b7' : '#67e8f9'}
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="1"
                      />
                    )}

                    {/* Leader lines for slices too thin to hold their label */}
                    {labels.filter((label) => !label.inside).map(({ band, anchorY, labelY }) => {
                      const edgeX = CX + innerRadiusAt(anchorY) - 8
                      return (
                        <g
                          key={`${band.slice.trade.id}-leader-${band.yTop}`}
                          className="stroke-muted-foreground/60"
                          fill="none"
                          strokeWidth="1"
                        >
                          <circle cx={edgeX} cy={anchorY} r="1.5" className="fill-muted-foreground/60" stroke="none" />
                          <path d={`M ${edgeX} ${anchorY} L 236 ${anchorY} L ${LABEL_X - 6} ${labelY}`} />
                        </g>
                      )
                    })}

                    {/* Gloss highlight */}
                    <path
                      d="M 56 74 C 50 130 55 185 64 222"
                      fill="none"
                      stroke="white"
                      strokeWidth="13"
                      strokeLinecap="round"
                      opacity="0.16"
                    />

                    {/* Rim lip */}
                    <ellipse
                      cx={CX} cy={TOP_Y} rx={OUTER_TOP_RX} ry={RIM_RY}
                      fill="none"
                      stroke={overfilled ? '#f87171' : '#3e4c5c'}
                      strokeWidth="5"
                    />
                    <ellipse
                      cx={CX} cy={TOP_Y - 1.5} rx={OUTER_TOP_RX} ry={RIM_RY}
                      fill="none"
                      stroke={overfilled ? '#fca5a5' : '#9fadbd'}
                      strokeWidth="1.5"
                    />
                  </svg>

                  {/* Free-space label floating inside the empty part */}
                  {bucket.totalEquityPct < BUCKET_CAPACITY_PCT - EPSILON && liquidTopY - (TOP_Y + RIM_RY) > 26 && (
                    <div
                      className="pointer-events-none absolute text-center text-xs font-medium text-slate-100/90"
                      style={{
                        left: `${((CX - 90) / VIEW_W) * 100}%`,
                        width: `${(180 / VIEW_W) * 100}%`,
                        top: `${(freeLabelY / VIEW_H) * 100}%`,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {formatPct(100 - bucket.totalEquityPct)} free
                    </div>
                  )}

                  {/* Position labels: inside their slice when it is tall enough,
                      otherwise out in the gutter at the end of a leader line */}
                  {labels.map(({ band: { slice }, inside, anchorY, labelY }, index) => (
                    <Tooltip key={`${slice.trade.id}-label-${index}`}>
                      <TooltipTrigger asChild>
                        {inside ? (
                          <div
                            className="absolute flex cursor-default items-center justify-center gap-1 text-[10px] font-bold text-white transition-transform hover:scale-105"
                            style={{
                              left: `${((CX - 80) / VIEW_W) * 100}%`,
                              width: `${(160 / VIEW_W) * 100}%`,
                              top: `${(anchorY / VIEW_H) * 100}%`,
                              transform: 'translateY(-50%)',
                              textShadow: '0 1px 2px rgba(0,0,0,0.45)',
                            }}
                          >
                            <span className="max-w-[80px] truncate">{slice.trade.ticker.symbol}</span>
                            <span className="font-normal opacity-90">{formatPct(slice.equityPctInBucket)}</span>
                            {slice.spansBuckets.length > 1 && (
                              <span className="rounded-full bg-purple-500 px-1 text-[8px] leading-3 shadow">M</span>
                            )}
                          </div>
                        ) : (
                          <div
                            className="absolute flex cursor-default items-center gap-1.5 text-[10px] font-medium text-foreground transition-transform hover:scale-105"
                            style={{
                              left: `${(LABEL_X / VIEW_W) * 100}%`,
                              top: `${(labelY / VIEW_H) * 100}%`,
                              transform: 'translateY(-50%)',
                            }}
                          >
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                slice.trade.status === 'open' ? 'bg-emerald-500' : 'bg-cyan-500'
                              }`}
                            />
                            <span className="max-w-[64px] truncate font-bold">{slice.trade.ticker.symbol}</span>
                            <span className="text-muted-foreground">{formatPct(slice.equityPctInBucket)}</span>
                            {slice.spansBuckets.length > 1 && (
                              <span className="rounded-full bg-purple-500 px-1 text-[8px] leading-3 text-white shadow">M</span>
                            )}
                          </div>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <div className="font-medium">{slice.trade.ticker.symbol}</div>
                          <div>Status: {slice.trade.status.toUpperCase()}</div>
                          <div>Size: {formatPct(slice.trade.equityPct)} of equity</div>
                          <div className="text-muted-foreground">
                            = {formatPct(equityPctToPositionPct(slice.trade.equityPct))} of a full position
                          </div>
                          {slice.trade.status === 'partial' && (
                            <div className="text-muted-foreground">
                              originally {formatPct(slice.trade.fullEquityPct)} of equity
                            </div>
                          )}
                          {slice.spansBuckets.length > 1 && (
                            <div>Spans buckets: {slice.spansBuckets.join(', ')}</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                <div className="text-center">
                  <h3 className="text-sm font-bold">Bucket {bucket.id}</h3>
                  <p className={`text-sm ${overfilled ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    {formatPct(bucket.totalEquityPct)} of equity
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {bucket.slices.length} position{bucket.slices.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend and Market Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-sm">Open positions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-cyan-500 rounded"></div>
                <span className="text-sm">Partial positions (partly exited)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Spans two buckets (M)</span>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Each bucket holds 100% of the equity. Bucket 1 fills first. The other buckets only fill once trading on margin -
                partial and smallest positions spill over first.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${exposureLevel.bgColor}`}>
                <div className={`w-3 h-3 rounded-full ${exposureLevel.color.replace('text-', 'bg-')}`}></div>
                <div>
                  <div className={`font-medium ${exposureLevel.color} capitalize`}>
                    {exposureLevel.level}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {exposureLevel.description}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <div className="space-y-1">
                  <div>• Under 50% of equity: Conservative/defensive</div>
                  <div>• 50–100% of equity: Normal conditions, slightly aggressive</div>
                  <div>• 100–200% (on margin): Very good conditions, aggressive</div>
                  <div>• Over 200%: Premium conditions, extremely aggressive</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
