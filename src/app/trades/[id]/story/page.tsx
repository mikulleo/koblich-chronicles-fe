import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import TradeStoryTimeline from '@/components/trade-story/TradeStoryTimeline'

export default async function TradeStoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // unwrap the promise
  const { id: tradeId } = await params

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button asChild variant="ghost">
          <Link href="/trades">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trades
          </Link>
        </Button>
      </div>

      <TradeStoryTimeline tradeId={tradeId} />
    </div>
  )
}
