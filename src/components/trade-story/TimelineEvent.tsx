// src/components/trade-story/TimelineEvent.tsx
'use client'

import React from 'react'
import { format, isValid } from 'date-fns'
import { ArrowRight, LogOut, Shield, TrendingUp, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Fixed card height so every stack / group lines up, whatever the content is. */
export const EVENT_CARD_HEIGHT = 252

interface EventDetails {
  price?: number
  shares?: number // intentionally not displayed
  riskAmount?: number // intentionally not displayed (dollar amounts stay hidden)
  positionSizeDescription?: string
  initialRiskPercent?: number
  previousStop?: number
  newStop?: number
  notes?: string
  profitLossPercent?: number
  normalizedProfitLossPercent?: number
  reason?: string
}

export interface TimelineEventLike {
  date: string
  type: 'entry' | 'stopModified' | 'exit'
  title: string
  description: string
  details: EventDetails
}

interface TimelineEventProps {
  event: TimelineEventLike
  className?: string
}

/**
 * `dark:` is a no-op in this app (the variant matches `.dark *` but next-themes
 * writes `data-theme`), so theme-aware accents are expressed explicitly.
 */
const dark = (cls: string) => `[[data-theme=dark]_&]:${cls}`

/**
 * Each event type owns a colour, and that colour washes the whole card — the
 * deck only reads as a deck when the cards behind are visibly different.
 * Surfaces are mixed against `--card` so both themes stay legible.
 */
type Accent = { hex: string; chip: string; value: string }

const ACCENTS: Record<'emerald' | 'amber' | 'rose' | 'slate', Accent> = {
  emerald: {
    hex: '#10b981',
    chip: `bg-emerald-500/20 text-emerald-700 ${dark('text-emerald-300')}`,
    value: `text-emerald-700 ${dark('text-emerald-300')}`,
  },
  amber: {
    hex: '#f59e0b',
    chip: `bg-amber-500/20 text-amber-700 ${dark('text-amber-300')}`,
    value: `text-amber-700 ${dark('text-amber-300')}`,
  },
  rose: {
    hex: '#f43f5e',
    chip: `bg-rose-500/20 text-rose-700 ${dark('text-rose-300')}`,
    value: `text-rose-700 ${dark('text-rose-300')}`,
  },
  slate: {
    hex: '#94a3b8',
    chip: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
}

const mix = (hex: string, pct: number, base = 'var(--card)') =>
  `color-mix(in srgb, ${hex} ${pct}%, ${base})`

const TYPE_LABEL: Record<string, string> = {
  entry: 'Entry',
  stopModified: 'Stop adjustment',
  exit: 'Exit',
}

const TYPE_ICON = {
  entry: TrendingUp,
  stopModified: Shield,
  exit: LogOut,
} as const

/** Colour + glyph for an event — shared by the card front and its back. */
function resolveAccent(event: TimelineEventLike) {
  const { type } = event
  const pl = event.details?.profitLossPercent
  const accent =
    type === 'entry'
      ? ACCENTS.emerald
      : type === 'stopModified'
        ? ACCENTS.amber
        : type === 'exit'
          ? typeof pl === 'number'
            ? pl >= 0
              ? ACCENTS.emerald
              : ACCENTS.rose
            : ACCENTS.slate
          : ACCENTS.slate

  return {
    accent,
    Icon: TYPE_ICON[type as keyof typeof TYPE_ICON] ?? DollarSign,
    label: TYPE_LABEL[type] ?? 'Event',
  }
}

/** Safely convert a value that might be a {day,month,year} object into a string */
const safeStr = (v: unknown): string => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object' && v !== null && 'year' in v && 'month' in v && 'day' in v) {
    const o = v as { year: number; month: number; day: number }
    return `${o.year}-${String(o.month).padStart(2, '0')}-${String(o.day).padStart(2, '0')}`
  }
  return String(v)
}

const fmtDate = (v: unknown) => {
  const d = new Date(safeStr(v))
  return isValid(d) ? format(d, 'MMM d, yyyy') : ''
}

const fmtPrice = (n?: number) =>
  typeof n === 'number' && Number.isFinite(n)
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'

const fmtPct = (n?: number, withSign = false) =>
  typeof n === 'number' && Number.isFinite(n)
    ? `${withSign && n > 0 ? '+' : ''}${n.toFixed(2)}%`
    : '—'

function MetricRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-xs font-medium tabular-nums break-words">
        {children}
      </span>
    </div>
  )
}

/**
 * The reverse of a card. Face-down cards are what make the stack look like a
 * deck, so the back carries the event's colour, a woven pattern and its glyph.
 */
export function EventCardBack({ event, className }: TimelineEventProps) {
  const { accent, Icon, label } = resolveAccent(event)
  const weave = mix(accent.hex, 34)

  return (
    <div
      className={cn(
        'relative flex w-full items-center justify-center overflow-hidden rounded-xl border',
        className
      )}
      style={{
        height: EVENT_CARD_HEIGHT,
        borderColor: mix(accent.hex, 42, 'var(--border)'),
        backgroundColor: mix(accent.hex, 20),
        backgroundImage: `repeating-linear-gradient(45deg, ${weave} 0 5px, transparent 5px 11px), repeating-linear-gradient(-45deg, ${weave} 0 5px, transparent 5px 11px)`,
      }}
    >
      {/* inset rule, like the border printed on a playing card */}
      <span
        aria-hidden
        className="absolute inset-2.5 rounded-lg border"
        style={{ borderColor: mix(accent.hex, 38, 'transparent') }}
      />
      <div className="relative flex flex-col items-center gap-2">
        <span
          className={cn('flex size-11 items-center justify-center rounded-full', accent.chip)}
          style={{ backgroundColor: mix(accent.hex, 30) }}
        >
          <Icon className="size-5" />
        </span>
        <span className={cn('text-[10px] font-semibold tracking-[0.12em] uppercase', accent.value)}>
          {label}
        </span>
      </div>
    </div>
  )
}

export default function TimelineEvent({ event, className }: TimelineEventProps) {
  const { type, details } = event
  const pl = details?.profitLossPercent
  const normalizedPl = details?.normalizedProfitLossPercent
  const { accent, Icon } = resolveAccent(event)

  const description = safeStr(event.description).trim()
  const notes = safeStr(details?.notes).trim()
  const hasBody = !!description || !!notes

  const surface = mix(accent.hex, 10)

  return (
    <div
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-xl border text-card-foreground shadow-sm',
        className
      )}
      style={{
        height: EVENT_CARD_HEIGHT,
        background: surface,
        borderColor: mix(accent.hex, 32, 'var(--border)'),
      }}
    >
      {/* accent rail */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent.hex }}
      />

      {/* header */}
      <div
        className="flex flex-none items-center gap-2 border-b py-2.5 pr-3 pl-4"
        style={{ background: mix(accent.hex, 20), borderColor: mix(accent.hex, 24, 'var(--border)') }}
      >
        <span className={cn('flex size-7 flex-none items-center justify-center rounded-full', accent.chip)}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold" title={event.title}>
            {event.title}
          </p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {TYPE_LABEL[type] ?? 'Event'}
          </p>
        </div>
        <span className="flex-none text-[11px] text-muted-foreground tabular-nums">
          {fmtDate(event.date)}
        </span>
      </div>

      {/* hero figure — only exits have one */}
      {type === 'exit' && typeof pl === 'number' && (
        <div className="flex flex-none items-baseline gap-2 px-3 pt-2.5 pl-4">
          <span className={cn('text-2xl leading-none font-semibold tabular-nums', accent.value)}>
            {fmtPct(pl, true)}
          </span>
          {typeof normalizedPl === 'number' && normalizedPl !== pl && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {fmtPct(normalizedPl, true)} normalized
            </span>
          )}
        </div>
      )}

      {/* metrics */}
      <div className="flex-none space-y-1.5 px-3 py-2.5 pl-4">
        {type === 'entry' && (
          <>
            <MetricRow label="Price">{fmtPrice(details?.price)}</MetricRow>
            {details?.positionSizeDescription && (
              <MetricRow label="Size">{details.positionSizeDescription}</MetricRow>
            )}
            {typeof details?.initialRiskPercent === 'number' && (
              <MetricRow label="Risk">{fmtPct(details.initialRiskPercent)}</MetricRow>
            )}
          </>
        )}

        {type === 'stopModified' && (
          <MetricRow label="Stop">
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground line-through">{fmtPrice(details?.previousStop)}</span>
              <ArrowRight className="size-3 text-muted-foreground" />
              <span className={accent.value}>{fmtPrice(details?.newStop)}</span>
            </span>
          </MetricRow>
        )}

        {type === 'exit' && (
          <>
            <MetricRow label="Price">{fmtPrice(details?.price)}</MetricRow>
            {details?.reason && <MetricRow label="Reason">{safeStr(details.reason)}</MetricRow>}
          </>
        )}
      </div>

      {/* notes — scrolls instead of spilling out of the card */}
      {hasBody && (
        <div className="relative min-h-0 flex-1 border-t">
          <div className="h-full overflow-y-auto px-3 py-2 pb-4 pl-4">
            {description && <p className="text-[11px] leading-relaxed">{description}</p>}
            {notes && (
              <p
                className={cn(
                  'text-[11px] leading-relaxed break-words whitespace-pre-wrap text-muted-foreground',
                  description && 'mt-1'
                )}
              >
                {notes}
              </p>
            )}
          </div>
          {/* fade hint that there is more text below */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-4"
            style={{ backgroundImage: `linear-gradient(to top, ${surface}, transparent)` }}
          />
        </div>
      )}
    </div>
  )
}
