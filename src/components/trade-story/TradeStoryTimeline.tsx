// src/components/trade-story/TradeStoryTimeline.tsx
'use client'

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  ArrowRight,
  Maximize2,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import apiClient from '@/lib/api/client'
import ChartCard, { CHART_CARD_HEIGHT } from './ChartCard'
import EventStack, { EVENT_STACK_HEIGHT } from './EventStack'
import StoryModeViewer from './StoryModeViewer'
import Image from 'next/image'
import { Media, Ticker } from '@/lib/types'
import { MarketSurgeAttribution } from '@/components/charts/marketsurge-attribution'
import { chartViewerUrl } from '@/lib/charts/chart-image-url'
import { trackTradeView } from '@/lib/analytics'


/* ------------------------------------------------------------------ */
/* types that do NOT shadow ChartCard's own ChartData ---------------- */
interface TimelineEventData {
  date: string
  type: 'entry' | 'stopModified' | 'exit'
  title: string
  description: string
  details: {
    price?: number
    shares?: number
    riskAmount?: number
    positionSize?: number // API provides this as dollar amount
    positionSizePercent?: number
    positionSizeDescription?: string // We calculate and add this
    initialRiskPercent?: number // We map from riskPercent
    riskPercent?: number // API provides this
    initialStop?: number // API field name
    previousStop?: number
    newStop?: number
    notes?: string
    reason?: string
    profitLoss?: number // API provides this as dollar amount
    profitLossPercent?: number // We calculate this
    normalizedProfitLossPercent?: number // We calculate this
  }
}

interface ModifiedStop {
  date: string
  price: number
  notes?: string
}
interface TradeExit {
  date: string
  price: number
  shares: number
  reason?: string
  notes?: string
}

// Placeholder types, ensure these match your actual types from '@/lib/types'
interface StoryMetadata {
  ticker: Ticker;
  tradeType: string;
  setupType?: string;
  status: string;
  duration: number;
  totalReturnPercent: number;
  normalizedTotalReturnPercent?: number; // Make optional since story might not have it initially
  rRatio: number;
  normalizedRRatio?: number; // Make optional since story might not have it initially
  chartCount: number;
  eventCount: number;
}

interface ChartData {
  id: string; // Assuming charts have an ID
  timestamp: string;
  image: Media;
  annotatedImage?: Media;
  tradeStory?: {
    chartRole?: string;
    emotionalState?: string;
    decisionNotes?: string;
    marketContext?: string;
  };
  notes?: Record<string, string>;
}


interface TradeStoryData {
  metadata: StoryMetadata
  timeline: TimelineEventData[]
  charts: ChartData[]
  chartsByRole: Record<string, any[]>
  notes?: string
  _tradeData?: any // Temporary field for calculations
}

interface TimelineGroup {
  date: string
  dateFormatted: string
  charts: any[]
  events: TimelineEventData[]
}

interface TradeStoryTimelineProps {
  tradeId: string
  onClose?: () => void
}

/**
 * Normalise a date that may arrive from the API as either an ISO string
 * or a structured object like `{ day, month, year }`.  Always returns an
 * ISO-ish date string (YYYY-MM-DD or full ISO).
 */
const normalizeDate = (d: unknown): string => {
  if (!d) return ''
  if (typeof d === 'string') return d
  if (typeof d === 'object' && d !== null && 'year' in d && 'month' in d && 'day' in d) {
    const obj = d as { year: number; month: number; day: number }
    const mm = String(obj.month).padStart(2, '0')
    const dd = String(obj.day).padStart(2, '0')
    return `${obj.year}-${mm}-${dd}`
  }
  // Fallback: try coercing through Date
  try {
    return new Date(d as any).toISOString()
  } catch {
    return String(d)
  }
}

/**
 * Recursively walk an object / array and convert any `{day, month, year}`
 * date objects into YYYY-MM-DD strings so they never leak into React children.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deepNormalizeDates = (val: any): any => {
  if (val == null || typeof val !== 'object') return val
  // Detect {day, month, year} date objects (regardless of extra keys)
  if ('year' in val && 'month' in val && 'day' in val
      && typeof val.year === 'number' && typeof val.month === 'number' && typeof val.day === 'number') {
    return normalizeDate(val)
  }
  if (Array.isArray(val)) return val.map(deepNormalizeDates)
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(val)) {
    out[k] = deepNormalizeDates(val[k])
  }
  return out
}

/* ------------------------------------------------------------------ */
/** `dark:` never matches in this app (variant is `.dark *`, theme uses `data-theme`). */
const darkVariant = (cls: string) => `[[data-theme=dark]_&]:${cls}`

const getChartRoleColor = (role?: string) =>
  (
    {
      entry: 'bg-green-100 text-green-800',
      management: 'bg-blue-100 text-blue-800',
      stopAdjustment: 'bg-yellow-100 text-yellow-800',
      exit: 'bg-red-100 text-red-800',
      analysis: 'bg-purple-100 text-purple-800',
      context: 'bg-gray-100 text-gray-800',
    } as const
  )[role ?? ''] ?? 'bg-gray-100 text-gray-800'

const getEmotionEmoji = (e?: string) =>
  (
    {
      confident: '😎',
      cautious: '🤔',
      uncertain: '😕',
      fearful: '😨',
      greedy: '🤑',
      neutral: '😐',
    } as const
  )[e ?? ''] ?? ''

/* ═════════════════ Grouped-timeline column ════════════════════════ */
/**
 * One step of the story: the event(s) that happened that day, plus the chart(s)
 * captured alongside them, if any. Both slots keep a fixed height so the
 * columns line up across the scroller — a step without a chart simply leaves
 * that space empty rather than announcing the absence.
 */
const DATE_HEADER_HEIGHT = 28
export const COLUMN_WIDTH = 288

function GroupedTimelineItem({
  group,
  selectedChart,
  onChartSelect,
  onCompare,
  compareCharts,
  showChartSlot,
  showEventSlot,
  tradeId,
  ticker,
}: {
  group: TimelineGroup
  selectedChart: any | null
  onChartSelect: (c: any) => void
  onCompare: (c: any) => void
  compareCharts: [any | null, any | null]
  showChartSlot: boolean
  showEventSlot: boolean
  /** Analytics only — attributes `story_event_open` to a trade. */
  tradeId: string
  ticker?: string
}) {
  const [idx, setIdx] = useState(0)
  const charts = group.charts
  const chart = charts[Math.min(idx, Math.max(charts.length - 1, 0))]

  return (
    <div className="flex flex-none flex-col" style={{ width: COLUMN_WIDTH }}>
      <div
        className="flex items-center justify-center text-sm font-medium text-muted-foreground"
        style={{ height: DATE_HEADER_HEIGHT }}
      >
        {group.dateFormatted}
      </div>

      {showChartSlot && (
        <div className="relative mb-3" style={{ height: CHART_CARD_HEIGHT }}>
          {chart && (
            <>
              <ChartCard
                chart={chart}
                isSelected={selectedChart?.id === chart.id}
                onClick={() => onChartSelect(chart)}
                onCompare={onCompare as any}
                isCompared={compareCharts.some((c) => c?.id === chart.id)}
              />

              {charts.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/3 left-2 size-7 rounded-full opacity-80 disabled:opacity-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIdx((i) => i - 1)
                    }}
                    disabled={idx === 0}
                    aria-label="Previous chart"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-1/3 right-2 size-7 rounded-full opacity-80 disabled:opacity-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIdx((i) => i + 1)
                    }}
                    disabled={idx >= charts.length - 1}
                    aria-label="Next chart"
                  >
                    <ChevronRight className="size-4" />
                  </Button>

                  {/* dots sit over the thumbnail, right-aligned so they clear the
                      MarketSurge mark in the bottom-left corner */}
                  <div
                    className="absolute inset-x-0 flex justify-end gap-1 pr-2.5"
                    style={{ top: (COLUMN_WIDTH * 3) / 4 - 14 }}
                  >
                    {charts.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Show chart ${i + 1}`}
                        aria-current={i === idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          setIdx(i)
                        }}
                        className={cn(
                          'h-1.5 rounded-full shadow-sm transition-all',
                          i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {showEventSlot && (
        <div style={{ minHeight: EVENT_STACK_HEIGHT }}>
          <EventStack events={group.events} tradeId={tradeId} ticker={ticker} />
        </div>
      )}
    </div>
  )
}

/* ═════════════════════ main component ═════════════════════════════ */
export default function TradeStoryTimeline({ tradeId }: TradeStoryTimelineProps) {
  const [story, setStory] = useState<TradeStoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChart, setSelectedChart] = useState<any | null>(null)
  const [storyMode, setStoryMode] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareCharts, setCompareCharts] = useState<[any | null, any | null]>([
    null,
    null,
  ])


  /* fetch data ------------------------------------------------------ */
  const fetchTradeStory = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get(`/trades/${tradeId}/story`)
      let d: TradeStoryData | null = null


      if (data?.success && data.story) {
        d = data.story
        if (d) {
          d.metadata.normalizedTotalReturnPercent =
            data.trade?.normalizedMetrics?.profitLossPercent
            ?? d.metadata.normalizedTotalReturnPercent
        }
      } else if (data?.metadata) {
        d = data
        if (d) {
          d.metadata.normalizedTotalReturnPercent =
            data.trade?.normalizedMetrics?.profitLossPercent
            ?? d.metadata.normalizedTotalReturnPercent
        }
      } 
      else if (data?.trade) {
        const t = data.trade
        
        d = {
          metadata: {
            ticker: t.ticker,
            tradeType: t.type,
            setupType: t.setupType,
            status: t.status,
            duration: t.daysHeld,
            totalReturnPercent: t.profitLossPercent ?? 0,
            normalizedTotalReturnPercent: t.normalizedMetrics?.profitLossPercent ?? 0,
            rRatio: t.rRatio ?? 0,
            normalizedRRatio: t.normalizedMetrics?.rRatio ?? 0,
            chartCount: t.relatedCharts?.length ?? 0,
            eventCount: 1 + (t.modifiedStops?.length ?? 0) + (t.exits?.length ?? 0),
          },
          timeline: [],
          charts: data.charts ?? [],
          chartsByRole: data.chartsByRole ?? {},
          notes: t.notes,
        }
      }
      if (!d) throw new Error('Unexpected story payload')

      /* absolutise URLs */
      const base = apiClient.defaults.baseURL?.split('/api')[0] ?? ''
      d.charts = d.charts.map((c: any) => ({
        ...c,
        image: {
          ...c.image,
          url: c.image.url.startsWith('http') ? c.image.url : base + c.image.url,
        },
        annotatedImage: c.annotatedImage
          ? {
              ...c.annotatedImage,
              url: c.annotatedImage.url.startsWith('http')
                ? c.annotatedImage.url
                : base + c.annotatedImage.url,
            }
          : undefined,
        tradeStory: (() => {
          const ts = c.tradeStory ?? {};
          // Ensure chartRole is always a defined string
          return {
            chartRole: typeof ts.chartRole === 'string' && ts.chartRole ? ts.chartRole : 'chart',
            storySequence: ts.storySequence,
            decisionNotes: ts.decisionNotes,
            emotionalState: ts.emotionalState,
            marketContext: ts.marketContext,
          };
        })(),
      }))

      /* Normalise ALL date-like objects in timeline & charts (API returns {day,month,year}) */
      if (d.timeline?.length) {
        d.timeline = d.timeline.map((evt: any) => deepNormalizeDates(evt))
      }
      if (d.charts?.length) {
        d.charts = d.charts.map((c: any) => ({ ...c, timestamp: normalizeDate(c.timestamp) }))
      }

      /* timeline fallback - comprehensive event construction */
      // Clean up existing timeline data and calculate missing P/L percentages
      if (d.timeline?.length) {
        
        // Check if we have trade data (either from _tradeData or from response.data.trade)
        const tradeData = d._tradeData || data.trade;
        
        if (tradeData) {
          
          d.timeline = d.timeline.map(event => {
            if (event.type === 'entry') {
              // Add proper position size description using normalization factor
              const cleanedEvent = {
                ...event,
                details: {
                  ...event.details,
                  positionSizeDescription: `${((tradeData.normalizationFactor || 0) * 100)?.toFixed(0)}% of a full position`,
                  initialRiskPercent: event.details.riskPercent, // Map riskPercent to initialRiskPercent
                }
              };
              return cleanedEvent;
            }
            
            if (event.type === 'exit') {
              // Calculate P/L percentages for exit events
              const exitPrice = event.details.price;
              const entryPrice = tradeData.entryPrice;
              
              if (exitPrice && entryPrice) {
                const priceChange = exitPrice - entryPrice;
                let profitLossPercent = (priceChange / entryPrice) * 100;
                if (tradeData.type === 'short') {
                  profitLossPercent = -profitLossPercent;
                }

                const cleanedEvent = {
                  ...event,
                  description: '', // Clear description to remove "Exited X shares"
                  details: {
                    ...event.details,
                    profitLossPercent: Number(profitLossPercent?.toFixed(2)),
                  }
                };
                return cleanedEvent;
              }
            }
            
            return event;
          });
          
          // Clean up temporary trade data
          delete d._tradeData;
          
        } else {
          // Fallback to original logic when no trade data available
          const entryEvent = d.timeline.find(event => event.type === 'entry');
          const entryPrice = entryEvent?.details?.price;
          const tradeType = d.metadata?.tradeType || 'long';
          
          if (entryPrice) {
            d.timeline = d.timeline.map(event => {
              if (event.type === 'entry') {
                const cleanedEvent = {
                  ...event,
                  details: {
                    ...event.details,
                    positionSizeDescription: 'Position size info not available',
                    initialRiskPercent: event.details.riskPercent,
                  }
                };
                return cleanedEvent;
              }
              
              if (event.type === 'exit') {
                const exitPrice = event.details.price;
                if (exitPrice && entryPrice) {
                  const priceChange = exitPrice - entryPrice;
                  let profitLossPercent = (priceChange / entryPrice) * 100;
                  if (tradeType === 'short') {
                    profitLossPercent = -profitLossPercent;
                  }
                  const normalizedProfitLossPercent = profitLossPercent; // No normalization factor available

                  const cleanedEvent = {
                    ...event,
                    description: '',
                    details: {
                      ...event.details,
                      profitLossPercent: Number(profitLossPercent?.toFixed(2)),
                      normalizedProfitLossPercent: Number(normalizedProfitLossPercent?.toFixed(2)),
                    }
                  };
                  return cleanedEvent;
                }
              }
              
              return event;
            });
          }
        }
      }
      
      // Fallback: construct timeline from trade data if no timeline exists
      if (!d.timeline?.length && data.trade) {
        const t = data.trade
        const allTimelineEvents: TimelineEventData[] = []


        // Add entry event with full details
        const entryEvent = {
          date: normalizeDate(t.entryDate),
          type: 'entry' as const,
          title: 'Trade Entry',
          description: '',
          details: {
            price: t.entryPrice,
            shares: t.shares, // Keep for description, not displayed
            riskAmount: t.riskAmount, // Keep for description, not displayed
            positionSizeDescription: `${((t.normalizationFactor || 1) * 100)?.toFixed(0)}% of a full position`,
            initialRiskPercent: t.riskPercent,
          },
        };
        allTimelineEvents.push(entryEvent);

        // Add modified stop events with full details
        ;(t.modifiedStops ?? []).forEach((s: ModifiedStop) => {
          const stopEvent = {
            date: normalizeDate(s.date),
            type: 'stopModified' as const,
            title: 'Stop Loss Modified',
            description: `Stop moved to ${s.price}`,
            details: { 
              previousStop: t.initialStopLoss, 
              newStop: s.price, 
              notes: s.notes 
            },
          };
          allTimelineEvents.push(stopEvent);
        })

        // Add exit events
        ;(t.exits ?? []).forEach((x: TradeExit) => {
          const priceChange = x.price - t.entryPrice;
          let profitLossPercent = (priceChange / t.entryPrice) * 100;
          if (t.type === 'short') {
            profitLossPercent = -profitLossPercent;
          }
          const normalizationFactor = t.normalizationFactor || 1;
          const normalizedProfitLossPercent = profitLossPercent * normalizationFactor;

          const exitEvent = {
            date: normalizeDate(x.date),
            type: 'exit' as const,
            title: 'Position Exit',
            description: '', // Override any API description to avoid showing shares
            details: {
              price: x.price,
              shares: x.shares,
              reason: x.reason,
              notes: x.notes,
              profitLossPercent: Number(profitLossPercent?.toFixed(2)),
              normalizedProfitLossPercent: Number(normalizedProfitLossPercent?.toFixed(2))
            },
          };
          allTimelineEvents.push(exitEvent);
        })

        // Sort all events chronologically
        d.timeline = allTimelineEvents.sort((a, b) => +new Date(a.date) - +new Date(b.date))
      }


      // Deep-normalise the entire story to eliminate any remaining {day,month,year} objects
      const sanitised = deepNormalizeDates(d) as typeof d
      setStory(sanitised)
      if (sanitised.charts.length) setSelectedChart(sanitised.charts[0])
    } catch (e) {
      console.error('❌ FETCH ERROR:', e)
    } finally {
      setLoading(false)
    }
  }, [tradeId])

  /* call fetch once on mount */
  useEffect(() => {
    fetchTradeStory()
  }, [fetchTradeStory])

  /* analytics ------------------------------------------------------- */
  // Emitted once the story has loaded, because that is the first point at which
  // the ticker is known — the ecommerce item is what makes GA4's Items report
  // rank stories by ticker instead of by opaque document ID.
  const viewedTicker = story?.metadata?.ticker?.symbol
  useEffect(() => {
    if (!viewedTicker) return
    trackTradeView({ tradeId, ticker: viewedTicker, tradeType: story?.metadata?.tradeType }, 'story')
    // Keyed on the ticker so a re-fetch of the same trade does not re-count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId, viewedTicker])

  /* compare helpers */
  const toggleCompare = (c: any) => {
    setCompareMode(true)
    setCompareCharts(([c1, c2]) => {
      if (c1?.id === c.id) return [null, c2]
      if (c2?.id === c.id) return [c1, null]
      if (!c1) return [c, c2]
      if (!c2) return [c1, c]
      return [c1, c]
    })
  }
  const clearCompare = () => {
    setCompareCharts([null, null])
    setCompareMode(false)
  }

  /* memoised groups */
  const groups = useMemo(() => {
    if (!story) return []
    const map = new Map<string, { charts: ChartData[]; events: TimelineEventData[] }>()
    story.charts.forEach((c) => {
      const k = format(new Date(c.timestamp), 'yyyy-MM-dd')
      if (!map.has(k)) map.set(k, { charts: [], events: [] })
      map.get(k)!.charts.push(c)
    })
    story.timeline.forEach((e) => {
      const k = format(new Date(normalizeDate(e.date)), 'yyyy-MM-dd')
      if (!map.has(k)) map.set(k, { charts: [], events: [] })
      map.get(k)!.events.push(e)
    })
    const result = Array.from(map.entries())
      .sort(([a], [b]) => +new Date(a) - +new Date(b))
      .map(([d, { charts, events }]): TimelineGroup => ({
        date: d,
        dateFormatted: format(new Date(d), 'MMM dd'),
        charts,
        events,
      }));
    
    return result
  }, [story])

  /* Slots are rendered for every column as soon as one column needs them, so
     the columns stay vertically aligned across the whole scroller. */
  const anyCharts = useMemo(() => groups.some((g) => g.charts.length > 0), [groups])
  const anyEvents = useMemo(() => groups.some((g) => g.events.length > 0), [groups])
  /* Park the connector arrow next to the chart thumbnail (or the event stack
     when there are no charts at all). */
  const arrowOffset = anyCharts
    ? DATE_HEADER_HEIGHT + CHART_CARD_HEIGHT * 0.375
    : DATE_HEADER_HEIGHT + EVENT_STACK_HEIGHT * 0.4

  /* ------------------------------------------------------------------ */
  if (loading)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  if (!story) return <div>Unable to load trade story.</div>

  const { metadata } = story


  if (storyMode && story) {
    return (
      <StoryModeViewer
        storyData={{
          ...story,
          charts: story.charts.map((c) => ({
            ...c,
            tradeStory: c.tradeStory
              ? {
                  ...c.tradeStory,
                  chartRole: typeof c.tradeStory.chartRole === 'string' && c.tradeStory.chartRole
                    ? c.tradeStory.chartRole
                    : 'chart',
                }
              : { chartRole: 'chart' },
          })),
        }}
        onClose={() => setStoryMode(false)}
      />
    )
  }

  return (
    <>
      {/* header */}
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold">{metadata.ticker.symbol} Trade Story</h2>
              <p className="text-muted-foreground">
                {metadata.tradeType.toUpperCase()} • {metadata.setupType ?? 'N/A'} •{' '}
                {metadata.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-primary to-blue-500 text-primary-foreground"
                onClick={() => setStoryMode(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Story Mode
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCompareMode((v) => !v)}>
                <Grid3x3 className="h-4 w-4 mr-2" />
                Compare
              </Button>
              {storyMode && (
                <Button variant="ghost" size="icon" onClick={() => setStoryMode(false)}>
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {[
              ['Duration', <>{metadata.duration + 1} days</>],
              [
                'Return %',
                <>
                  <span
                    className={cn(
                      metadata.totalReturnPercent >= 0
                        ? `text-emerald-700 ${darkVariant('text-emerald-300')}`
                        : `text-rose-700 ${darkVariant('text-rose-300')}`,
                      'font-semibold'
                    )}
                  >
                    {metadata.totalReturnPercent?.toFixed(2)}%
                  </span>
                  {metadata.normalizedTotalReturnPercent != null &&
                    metadata.normalizedTotalReturnPercent !== metadata.totalReturnPercent && (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {metadata.normalizedTotalReturnPercent?.toFixed(2)}% normalized
                      </span>
                    )}
                </>,
              ],
              ['R-Ratio', <>{metadata.rRatio?.toFixed(2)}R</>],
              ['Charts', <>{metadata.chartCount}</>],
              ['Events', <>{metadata.eventCount}</>],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg leading-tight font-medium tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* timeline */}
        <Card className="gap-3 p-6">
          <div>
            <h3 className="text-lg font-semibold">Timeline</h3>
            <p className="text-sm text-muted-foreground">
              The trade step by step — each event carries the charts captured with it. Drag, click
              or use the arrow keys to flip through a day&apos;s events.
            </p>
          </div>

          <ScrollArea className="w-full rounded-md border">
            <div className="flex items-start gap-6 p-6">
              {groups.map((g, i) => (
                <div key={g.date} className="flex items-start">
                  <GroupedTimelineItem
                    group={g}
                    selectedChart={selectedChart}
                    onChartSelect={setSelectedChart}
                    onCompare={toggleCompare}
                    compareCharts={compareCharts}
                    showChartSlot={anyCharts}
                    showEventSlot={anyEvents}
                    tradeId={tradeId}
                    ticker={viewedTicker}
                  />
                  {i < groups.length - 1 && (
                    <ArrowRight
                      className="mx-2 size-6 shrink-0 text-muted-foreground/60"
                      style={{ marginTop: arrowOffset }}
                      aria-hidden
                    />
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>

        {/* single-chart viewer */}
        {selectedChart && !compareMode && (
          <Card className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div
                className="relative aspect-[4/3] cursor-pointer"
                onClick={() =>
                  window.open(
                    chartViewerUrl(
                      selectedChart.annotatedImage?.url || selectedChart.image.url,
                      selectedChart.timestamp
                        ? format(new Date(selectedChart.timestamp), 'MMM dd, yyyy')
                        : undefined
                    ),
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                <Image
                  src={selectedChart.annotatedImage?.url ?? selectedChart.image.url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain rounded-lg shadow-lg"
                />
                <MarketSurgeAttribution size="sm" />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Chart Details</h3>
                  <Badge className={getChartRoleColor(selectedChart.tradeStory?.chartRole)}>
                    {selectedChart.tradeStory?.chartRole ?? 'chart'}
                  </Badge>
                  {selectedChart.tradeStory?.emotionalState && (
                    <p className="text-sm mt-1">
                      Emotion: {getEmotionEmoji(selectedChart.tradeStory.emotionalState)}{' '}
                      {selectedChart.tradeStory.emotionalState}
                    </p>
                  )}
                </div>

                {selectedChart.tradeStory?.decisionNotes && (
                  <div>
                    <h4 className="font-medium">Decision Process</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedChart.tradeStory.decisionNotes}
                    </p>
                  </div>
                )}

                {selectedChart.tradeStory?.marketContext && (
                  <div>
                    <h4 className="font-medium">Market Context</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedChart.tradeStory.marketContext}
                    </p>
                  </div>
                )}

                {selectedChart.notes && (
                  <div>
                    <h4 className="font-medium">Notes</h4>
                    {Object.entries(selectedChart.notes).map(
                      ([k, v]) =>
                        typeof v === 'string' && v.trim() && (
                          <p key={k} className="text-sm">
                            <strong className="capitalize">{k}:</strong> {v}
                          </p>
                        )
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* compare mode */}
        {compareMode && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Compare Charts</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {compareCharts.map((c, i) => (
                <div key={i}>
                  {c ? (
                    <>
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={c.annotatedImage?.url ?? c.image.url}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-contain rounded-lg shadow-lg"
                        />
                        <MarketSurgeAttribution size="sm" />
                      </div>
                      <p className="mt-2 text-sm">
                        Date: {format(new Date(c.timestamp), 'MMM dd,yyyy')}
                      </p>
                      <Badge className={getChartRoleColor(c.tradeStory?.chartRole)}>
                        {c.tradeStory?.chartRole}
                      </Badge>
                    </>
                  ) : (
                    <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Select a chart to compare</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-3" onClick={clearCompare}>
              Clear Comparison
            </Button>
          </Card>
        )}

        {/* overall trade notes */}
        {story.notes && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Trade Notes</h3>
            <p className="whitespace-pre-wrap text-muted-foreground">{story.notes}</p>
          </Card>
        )}
      </div>
    </>
  )
}