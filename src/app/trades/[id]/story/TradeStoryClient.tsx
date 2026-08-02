'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

import { useAnalytics } from '@/hooks/use-analytics'

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
  const { trackTradeView } = useAnalytics()

  // The page_view already records the URL; this adds the trade as an ecommerce
  // item so GA4's item reports rank stories by popularity without any custom
  // dimension setup.
  useEffect(() => {
    trackTradeView({ tradeId }, 'story')
  }, [tradeId, trackTradeView])

  return <TradeStoryTimeline tradeId={tradeId} />
}
