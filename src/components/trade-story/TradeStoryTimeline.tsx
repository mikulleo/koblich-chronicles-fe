// src/components/trade-story/TradeStoryTimeline.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  ArrowRight,
  Maximize2,
  Grid3x3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import apiClient from '@/lib/api/client'
import TimelineEvent from './TimelineEvent'
import ChartCard from './ChartCard'
import StoryModeViewer from './StoryModeViewer'
import Image from 'next/image'
import { Media, Ticker } from '@/lib/types' // Import Media and Ticker from lib/types

interface TradeStoryTimelineProps {
  tradeId: string
  onClose?: () => void
}

interface TimelineEventData {
  date: string
  type: 'entry' | 'stopModified' | 'exit'
  title: string
  description: string
  details: {
    price?: number
    shares?: number // Kept for description, but not displayed in TimelineEvent
    riskAmount?: number // Kept for description, but not displayed in TimelineEvent
    positionSizePercent?: number; // Added for display
    positionSizeDescription?: string; // Added for display
    initialRiskPercent?: number; // Added for display
    previousStop?: number
    newStop?: number
    notes?: string
    reason?: string // Added reason property
    profitLossPercent?: number // Normal % for exit
    normalizedProfitLossPercent?: number // Normalized % for exit
  }
}

// Updated ChartData interface to use imported Media type
interface ChartData {
  id: string
  image: Media // Use Media type
  timestamp: string
  tradeStory?: {
    chartRole: string
    storySequence?: number
    decisionNotes?: string
    emotionalState?: string
    marketContext?: string
  }
  notes?: {
    setupEntry?: string
    trend?: string
    fundamentals?: string
    other?: string
  }
  annotatedImage?: Media // Use Media type
}

// Define interfaces for API response types
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

interface TradeStoryData {
  metadata: {
    ticker: Ticker
    tradeType: string
    setupType?: string
    status: string
    duration: number
    // totalReturn: number; // Removed dollar amount
    totalReturnPercent: number; // Normal %
    normalizedTotalReturnPercent: number; // Added normalized %
    rRatio: number; // Normal R-Ratio
    normalizedRRatio: number; // Added normalized R-Ratio
    chartCount: number
    eventCount: number
  }
  timeline: TimelineEventData[]
  charts: ChartData[]
  chartsByRole: Record<string, ChartData[]>
  notes?: string
}

type MergedTimelineItem =
  | { type: 'event'; date: string; eventData: TimelineEventData }
  | { type: 'chart'; date: string; data: ChartData }

export default function TradeStoryTimeline({ tradeId }: TradeStoryTimelineProps) {
  // --- useState Hooks ---
  const [storyData, setStoryData] = useState<TradeStoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChart, setSelectedChart] = useState<ChartData | null>(null)
  const [storyMode, setStoryMode] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareCharts, setCompareCharts] = useState<[ChartData | null, ChartData | null]>([null, null])

  // --- useCallback Hooks ---
  const fetchTradeStory = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Fetching story for trade:', tradeId)

      const response = await apiClient.get(`/trades/${tradeId}/story`)
      console.log('API Response:', response.data)

      let fetchedStoryData: TradeStoryData | null = null;

      if (response.data) {
        if (response.data.success && response.data.story) {
          fetchedStoryData = response.data.story;
        } else if (response.data.metadata) {
          fetchedStoryData = response.data;
        } else if (response.data.trade) {
          // Construct metadata from trade response
          const trade = response.data.trade;
          fetchedStoryData = {
            metadata: {
              ticker: trade.ticker,
              tradeType: trade.type,
              setupType: trade.setupType,
              status: trade.status,
              duration: trade.daysHeld,
              totalReturnPercent: trade.profitLossPercent || 0,
              normalizedTotalReturnPercent: trade.normalizedMetrics?.profitLossPercent || 0,
              rRatio: trade.rRatio || 0,
              normalizedRRatio: trade.normalizedMetrics?.rRatio || 0,
              chartCount: trade.relatedCharts?.length || 0,
              eventCount: 1 + (trade.modifiedStops?.length || 0) + (trade.exits?.length || 0)
            },
            timeline: response.data.timeline || [], // Initial timeline from backend (e.g. entry only)
            charts: response.data.charts || [],
            chartsByRole: response.data.chartsByRole || {},
            notes: trade.notes
          };
        }
      }

      if (fetchedStoryData) {
        const baseApiUrl = apiClient.defaults.baseURL?.split('/api')[0];

        // Process charts to ensure absolute image URLs and correct type for ChartData
        const processedCharts = fetchedStoryData.charts.map((chart: ChartData) => {
          let processedImageUrl = chart.image.url;
          if (baseApiUrl && !chart.image.url.startsWith('http')) {
            processedImageUrl = `${baseApiUrl}${chart.image.url}`;
          }

          let processedAnnotatedImage: Media | undefined = undefined;
          if (chart.annotatedImage && chart.annotatedImage.url) {
            const originalAnnotatedImageUrl = chart.annotatedImage.url;
            let finalAnnotatedImageUrl = originalAnnotatedImageUrl;
            if (baseApiUrl && !originalAnnotatedImageUrl.startsWith('http')) {
              finalAnnotatedImageUrl = `${baseApiUrl}${originalAnnotatedImageUrl}`;
            }
            processedAnnotatedImage = {
              ...chart.annotatedImage,
              url: finalAnnotatedImageUrl
            };
          }

          return {
            ...chart,
            image: {
              ...chart.image,
              url: processedImageUrl
            },
            annotatedImage: processedAnnotatedImage
          };
        });

        fetchedStoryData.charts = processedCharts;

        // Manually construct and merge all timeline events (entry, stops, exits) with full details
        const trade = response.data.trade; // Ensure we use the full trade object
        const allTimelineEvents: TimelineEventData[] = [];

        // Add entry event
        allTimelineEvents.push({
            date: trade.entryDate,
            type: 'entry',
            title: 'Trade Entry',
            description: "",
            details: {
                price: trade.entryPrice,
                shares: trade.shares, // Pass raw shares, to be hidden in TimelineEvent, useful for description
                riskAmount: trade.riskAmount, // Pass raw riskAmount, to be hidden in TimelineEvent, useful for description
                positionSizeDescription: `${((trade.normalizationFactor || 0) * 100)?.toFixed(0)}% of a full position`, // Calculate and pass
                initialRiskPercent: trade.riskPercent, // Pass directly
            }
        });

        // Add modified stop events
        (trade.modifiedStops || []).forEach((stop: ModifiedStop) => {
            allTimelineEvents.push({
                date: stop.date,
                type: 'stopModified',
                title: 'Stop Loss Modified',
                description: `Stop moved to $${stop.price}`,
                details: {
                    previousStop: trade.initialStopLoss,
                    newStop: stop.price,
                    notes: stop.notes
                }
            });
        });

        // Add exit events
        (trade.exits || []).forEach((exit: TradeExit) => {
            const priceChange = exit.price - trade.entryPrice;
            let profitLossPercent = (priceChange / trade.entryPrice) * 100;
            if (trade.type === 'short') {
                profitLossPercent = -profitLossPercent;
            }
            const normalizationFactor = trade.normalizationFactor || 1;
            const normalizedProfitLossPercent = profitLossPercent * normalizationFactor;

            allTimelineEvents.push({
                date: exit.date,
                type: 'exit',
                title: 'Position Exit',
                description: '',
                details: {
                    price: exit.price,
                    shares: exit.shares,
                    reason: exit.reason,
                    notes: exit.notes,
                    profitLossPercent: Number(profitLossPercent?.toFixed(2)),
                    normalizedProfitLossPercent: Number(normalizedProfitLossPercent?.toFixed(2))
                }
            });
        });

        // Sort all events chronologically
        fetchedStoryData.timeline = allTimelineEvents.sort((a,b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        console.log('Setting story data:', fetchedStoryData)
        setStoryData(fetchedStoryData)

        // Select first chart by default
        if (fetchedStoryData.charts && fetchedStoryData.charts.length > 0) {
          setSelectedChart(fetchedStoryData.charts[0])
        }
      } else {
        console.error('Could not parse story data from response')
      }
    } catch (error: unknown) {
      console.error('Error fetching trade story:', error)
      // Log more details about the error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { data: unknown; status: number } };
        console.error('Error response:', axiosError.response.data)
        console.error('Error status:', axiosError.response.status)
      }
    } finally {
      setLoading(false)
    }
  }, [tradeId])

  const handleCompareChartSelection = useCallback((chartToCompare: ChartData) => {
    setCompareMode(true); // Always activate compare mode when '+' is clicked

    setCompareCharts(prevCharts => {
      const [chart1, chart2] = prevCharts;

      // If chart is already selected, deselect it
      if (chart1?.id === chartToCompare.id) {
        return [null, chart2];
      }
      if (chart2?.id === chartToCompare.id) {
        return [chart1, null];
      }

      // If chart1 is empty, select current chart as chart1
      if (chart1 === null) {
        return [chartToCompare, chart2];
      }

      // If chart2 is empty, select current chart as chart2
      if (chart2 === null) {
        return [chart1, chartToCompare];
      }

      // If both are filled, replace the second one
      return [chart1, chartToCompare];
    });
  }, []);

  const handleClearComparison = useCallback(() => {
    setCompareCharts([null, null]);
    setCompareMode(false);
  }, []);


  // --- useEffect Hooks ---
  useEffect(() => {
    fetchTradeStory()
  }, [fetchTradeStory])

  const getChartRoleColor = (role?: string) => {
    switch (role) {
      case 'entry': return 'bg-green-100 text-green-800'
      case 'management': return 'bg-blue-100 text-blue-800'
      case 'stopAdjustment': return 'bg-yellow-100 text-yellow-800'
      case 'exit': return 'bg-red-100 text-red-800'
      case 'analysis': return 'bg-purple-100 text-purple-800'
      case 'context': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEmotionEmoji = (emotion?: string) => {
    switch (emotion) {
      case 'confident': return '😎'
      case 'cautious': return '🤔'
      case 'uncertain': return '😕'
      case 'fearful': return '😨'
      case 'greedy': return '🤑'
      case 'neutral': return '😐'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!storyData) {
    return <div>No trade story data available</div>
  }

  const { metadata, timeline, charts } = storyData

  // Merge timeline events with charts based on timestamp
  const mergedTimeline: MergedTimelineItem[] = [
    ...timeline.map(event => ({
      type: 'event' as const,
      date: event.date,
      eventData: event
    })),
    ...charts.map(chart => ({
      type: 'chart' as const,
      date: chart.timestamp,
      data: chart
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <>
      <div className="space-y-6">
        {/* Header Stats */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">
                {metadata.ticker.symbol} Trade Story
              </h2>
              <p className="text-muted-foreground">
                {metadata.tradeType.toUpperCase()} • {metadata.setupType || 'N/A'} • {metadata.status}
              </p>
            </div>
            <div className="flex gap-2">
              {/* Highlight Play Story Mode Button */}
              <Button
                variant="default" // Changed to default variant
                className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-primary-foreground" // Apply gradient and text color
                size="sm"
                onClick={() => setStoryMode(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Play Story Mode
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Compare
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-lg font-semibold">{metadata.duration} days</p>
              <p className="text-sm text-muted-foreground">NOT WORKING</p>
            </div>
            {/* Display Return % (Normal & Normalized) */}
            <div>
              <p className="text-sm text-muted-foreground">Return %</p>
              <p className={cn(
                "text-lg font-semibold",
                metadata.totalReturnPercent >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {metadata.totalReturnPercent?.toFixed(2)}%
                {metadata.normalizedTotalReturnPercent !== metadata.totalReturnPercent && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({metadata.normalizedTotalReturnPercent?.toFixed(2)}% N)
                  </span>
                )}
              </p>
            </div>
            {/* Display R-Ratio (Normal & Normalized) */}
            <div>
              <p className="text-sm text-muted-foreground">R-Ratio</p>
              <p className="text-lg font-semibold">
                {metadata.rRatio?.toFixed(2)}R
                {metadata.normalizedRRatio !== metadata.rRatio && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({metadata.normalizedRRatio?.toFixed(2)}R N)
                  </span>
                )}
              </p>
            </div>
            {/* Removed dollar return:
            <div>
              <p className="text-sm text-muted-foreground">Return</p>
              <p className={cn(
                "text-lg font-semibold",
                metadata.totalReturn >= 0 ? "text-green-600" : "text-red-600"
              )}>
                ${metadata.totalReturn.toFixed(2)}
              </p>
            </div>
            */}
            {/* Added a placeholder or keep existing */}
            <div>
              <p className="text-sm text-muted-foreground">Charts</p>
              <p className="text-lg font-semibold">{metadata.chartCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Events</p>
              <p className="text-lg font-semibold">{metadata.eventCount}</p>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Timeline</h3>
          {/* Note for comparison */}
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-medium">Tip:</span> Click the <span className="font-bold">+</span> icon on any chart to select it for comparison. The comparison view will automatically open below.
          </p>

          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <div className="flex p-4 space-x-4">
              {mergedTimeline.map((item, index) => (
                <div key={index} className="flex items-center">
                  {item.type === 'event' ? (
                    <TimelineEvent event={item.eventData} />
                  ) : (
                    <ChartCard
                      chart={item.data}
                      isSelected={selectedChart?.id === item.data.id}
                      onClick={() => setSelectedChart(item.data)}
                      onCompare={handleCompareChartSelection}
                      isCompared={compareCharts.some(c => c?.id === item.data.id)}
                    />
                  )}
                  {index < mergedTimeline.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>

        {/* Selected Chart Details */}
        {selectedChart && !compareMode && (
          <Card className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative aspect-[4/3] cursor-pointer" onClick={() => window.open(selectedChart.image.url, '_blank')}>
                <Image
                  src={selectedChart.annotatedImage?.url || selectedChart.image.url} // Use annotated if present, fallback to normal
                  alt="Chart"
                  fill
                  className="object-contain rounded-lg shadow-lg"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Chart Details</h3>
                  <Badge className={cn("mb-2", getChartRoleColor(selectedChart.tradeStory?.chartRole))}>
                    {selectedChart.tradeStory?.chartRole} {/* Removed || 'reference' */}
                  </Badge>
                  {selectedChart.tradeStory?.emotionalState && (
                    <p className="text-sm">
                      Emotional State: {getEmotionEmoji(selectedChart.tradeStory.emotionalState)} {selectedChart.tradeStory.emotionalState}
                    </p>
                  )}
                </div>

                {selectedChart.tradeStory?.decisionNotes && (
                  <div>
                    <h4 className="font-medium mb-1">Decision Process</h4>
                    <p className="text-sm text-muted-foreground">{selectedChart.tradeStory.decisionNotes}</p>
                  </div>
                )}

                {selectedChart.tradeStory?.marketContext && (
                  <div>
                    <h4 className="font-medium mb-1">Market Context</h4>
                    <p className="text-sm text-muted-foreground">{selectedChart.tradeStory.marketContext}</p>
                  </div>
                )}

                {selectedChart.notes && (
                  <div>
                    <h4 className="font-medium mb-1">Chart Notes</h4>
                    {Object.entries(selectedChart.notes).map(([key, value]) =>
                      // Filter out the 'tradeStory' key and ensure the value is a string and not empty
                      // Only render if value is a string and not just whitespace
                      (key !== 'tradeStory' && typeof value === 'string' && value.trim()) ? (
                        <p key={key} className="text-sm mb-2">
                          <strong className="capitalize">{key}:</strong> {value}
                        </p>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Compare Mode */}
        {compareMode && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Compare Charts</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {compareCharts.map((chart, index) => (
                <div key={index} className="space-y-2">
                  {chart ? (
                    <>
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={chart.annotatedImage?.url || chart.image.url} // Use annotated if present, fallback to normal
                          alt={`Chart ${index + 1}`}
                          fill
                          className="object-contain rounded-lg shadow-lg"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                      <div className="text-sm">
                        <p><strong>Date:</strong> {format(new Date(chart.timestamp), 'MMM dd,yyyy')}</p>
                        <Badge className={cn("mt-1", getChartRoleColor(chart.tradeStory?.chartRole))}>
                          {chart.tradeStory?.chartRole} {/* Removed || 'reference' */}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Select a chart to compare</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleClearComparison}
            >
              Clear Comparison
            </Button>
          </Card>
        )}

        {/* Trade Notes */}
        {storyData.notes && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Trade Notes</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{storyData.notes}</p>
          </Card>
        )}
      </div>

      {/* Story Mode Viewer */}
      {storyMode && (
        <StoryModeViewer
          storyData={storyData}
          onClose={() => setStoryMode(false)}
        />
      )}
    </>
  )
}