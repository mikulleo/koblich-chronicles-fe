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
  return <TradeStoryTimeline tradeId={tradeId} />
}
