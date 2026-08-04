'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const TradeStoryTimeline = dynamic(
  () => import('@/components/trade-story/TradeStoryTimeline'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading trade story...</span>
      </div>
    ),
  }
)

export default function TradeStoryClient({ tradeId }: { tradeId: string }) {
  // `view_item` is emitted by TradeStoryTimeline instead of here: it is the
  // component that loads the trade, and without the ticker the ecommerce item
  // falls back to the raw document ID, which makes GA4's Items report a list of
  // opaque IDs rather than tickers.
  return <TradeStoryTimeline tradeId={tradeId} />
}
