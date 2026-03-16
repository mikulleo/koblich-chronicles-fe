import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import TradeStoryClient from './TradeStoryClient'

export default async function TradeStoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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

      <TradeStoryClient tradeId={tradeId} />
    </div>
  )
}
