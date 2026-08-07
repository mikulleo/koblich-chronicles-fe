'use client'

import EventStack from '@/components/trade-story/EventStack'
import type { TimelineEventLike } from '@/components/trade-story/TimelineEvent'

const events: TimelineEventLike[] = [
  {
    date: '2025-03-04',
    type: 'entry',
    title: 'Bought NVDA',
    description: 'Breakout above the 20-day base on heavy volume.',
    details: {
      price: 118.42,
      positionSizeDescription: '18% of equity',
      initialRiskPercent: 0.85,
      notes: 'Waited for the pivot to clear before adding. Volume 2.1x average.',
    },
  },
  {
    date: '2025-03-07',
    type: 'stopModified',
    title: 'Raised stop',
    description: 'Moved stop to breakeven after a three-day run.',
    details: { previousStop: 112.1, newStop: 118.42, notes: 'Free trade from here.' },
  },
  {
    date: '2025-03-12',
    type: 'stopModified',
    title: 'Trailed stop',
    description: 'Trailing under the 10-day line.',
    details: { previousStop: 118.42, newStop: 126.0 },
  },
  {
    date: '2025-03-19',
    type: 'exit',
    title: 'Sold half',
    description: 'Took partial into strength.',
    details: { price: 141.2, profitLossPercent: 19.24, normalizedProfitLossPercent: 22.6, reason: 'Climax extension' },
  },
  {
    date: '2025-03-26',
    type: 'exit',
    title: 'Stopped out',
    description: 'Remainder hit the trailing stop.',
    details: { price: 126.0, profitLossPercent: -4.3, reason: 'Trailing stop' },
  },
]

export default function DeckPreview() {
  return (
    <div className="flex min-h-screen items-start gap-8 bg-background p-10">
      <div style={{ width: 288 }}>
        <EventStack events={events} />
      </div>
      <div style={{ width: 288 }}>
        <EventStack events={events.slice(0, 2)} />
      </div>
    </div>
  )
}
