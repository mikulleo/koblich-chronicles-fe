// src/components/trade-story/ChartCard.tsx
'use client'

import React from 'react'
import { format, isValid } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Eye, NotebookPen, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Media } from '@/lib/types'
import { MarketSurgeAttribution } from '@/components/charts/marketsurge-attribution'
import { chartViewerUrl } from '@/lib/charts/chart-image-url'

/** Fixed card height so all timeline columns line up. */
export const CHART_CARD_HEIGHT = 330

interface TradeStoryMeta {
  chartRole?: string
  storySequence?: number
  decisionNotes?: string
  emotionalState?: string
  marketContext?: string
}

interface ChartData {
  id: string
  image: Media
  timestamp: string
  /** Normalised by TradeStoryTimeline… */
  tradeStory?: TradeStoryMeta
  notes?: {
    setupEntry?: string
    trend?: string
    fundamentals?: string
    other?: string
    /** …but the raw API nests it under `notes`, so both are supported. */
    tradeStory?: TradeStoryMeta
  }
  annotatedImage?: Media
}

interface ChartCardProps {
  chart: ChartData
  isSelected: boolean
  onClick: () => void
  onCompare?: (chart: ChartData) => void
  isCompared?: boolean
}

const dark = (cls: string) => `[[data-theme=dark]_&]:${cls}`

const ROLE_STYLES: Record<string, string> = {
  entry: `bg-emerald-500/15 text-emerald-700 ${dark('text-emerald-300')}`,
  management: `bg-blue-500/15 text-blue-700 ${dark('text-blue-300')}`,
  stopAdjustment: `bg-amber-500/15 text-amber-700 ${dark('text-amber-300')}`,
  exit: `bg-rose-500/15 text-rose-700 ${dark('text-rose-300')}`,
  analysis: `bg-purple-500/15 text-purple-700 ${dark('text-purple-300')}`,
  context: 'bg-muted text-muted-foreground',
}

const ROLE_LABELS: Record<string, string> = {
  entry: 'Entry',
  management: 'Management',
  stopAdjustment: 'Stop adjustment',
  exit: 'Exit',
  analysis: 'Analysis',
  context: 'Context',
  chart: 'Reference',
  reference: 'Reference',
}

const EMOJI: Record<string, string> = {
  confident: '😎',
  cautious: '🤔',
  uncertain: '😕',
  fearful: '😨',
  greedy: '🤑',
  neutral: '😐',
}

export default function ChartCard({ chart, isSelected, onClick, onCompare, isCompared }: ChartCardProps) {
  const story = chart.tradeStory ?? chart.notes?.tradeStory
  const role = story?.chartRole || 'reference'
  const date = new Date(chart.timestamp)
  const dateLabel = isValid(date) ? format(date, 'MMM d, yyyy') : ''
  const hasNotes = !!(
    chart.notes?.setupEntry ||
    chart.notes?.trend ||
    chart.notes?.fundamentals ||
    chart.notes?.other
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all',
        'hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        isSelected && 'ring-primary ring-2',
        isCompared && !isSelected && 'ring-2 ring-blue-500'
      )}
      style={{ height: CHART_CARD_HEIGHT }}
      aria-pressed={isSelected}
    >
      {/* thumbnail */}
      <div className="relative aspect-[4/3] flex-none overflow-hidden bg-muted">
        <Image
          src={chart.annotatedImage?.url || chart.image.url}
          alt={`Chart from ${dateLabel || 'trade'}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="288px"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        <MarketSurgeAttribution size="xs" />

        {/* quick actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="size-6 rounded-full backdrop-blur-sm"
            aria-label="Open chart in viewer"
            onClick={(e) => {
              e.stopPropagation()
              // Open through our viewer so the MarketSurge attribution stays visible
              window.open(
                chartViewerUrl(chart.annotatedImage?.url || chart.image.url, dateLabel || undefined),
                '_blank',
                'noopener,noreferrer'
              )
            }}
          >
            <Eye className="size-3" />
          </Button>
          {onCompare && (
            <Button
              size="icon"
              variant="secondary"
              className="size-6 rounded-full backdrop-blur-sm"
              aria-label="Add chart to comparison"
              onClick={(e) => {
                e.stopPropagation()
                onCompare(chart)
              }}
            >
              <Plus className="size-3" />
            </Button>
          )}
        </div>

        {/* role pill sits on the image (top-left; the MarketSurge mark owns bottom-left) */}
        <span
          className={cn(
            'absolute top-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm',
            ROLE_STYLES[role] ?? 'bg-background/80 text-foreground'
          )}
        >
          {ROLE_LABELS[role] ?? role}
        </span>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium tabular-nums">{dateLabel}</span>
          {story?.emotionalState && (
            <span className="text-[11px] text-muted-foreground" title={story.emotionalState}>
              {EMOJI[story.emotionalState] ?? ''} {story.emotionalState}
            </span>
          )}
        </div>

        {story?.decisionNotes && (
          <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
            {story.decisionNotes}
          </p>
        )}

        {hasNotes && (
          <div className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <NotebookPen className="size-3" />
            <span>Has notes</span>
          </div>
        )}
      </div>
    </div>
  )
}
