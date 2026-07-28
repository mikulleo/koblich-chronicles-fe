// src/app/chart-view/page.tsx

import type { Metadata } from 'next'
import { MarketSurgeAttribution } from '@/components/charts/marketsurge-attribution'
import { resolveChartImageUrl } from '@/lib/charts/chart-image-url'

export const metadata: Metadata = {
  title: 'Chart — Koblich Chronicles',
  // The viewer only ever frames our own media; no reason to index it.
  robots: { index: false, follow: false },
}

interface ChartViewPageProps {
  searchParams: Promise<{ src?: string; title?: string }>
}

/**
 * Full-size chart viewer. Charts used to open straight from the media API,
 * which stripped the MarketSurge attribution; this page frames the same image
 * with the required logo overlay and credit line.
 */
export default async function ChartViewPage({ searchParams }: ChartViewPageProps) {
  const { src, title } = await searchParams
  const imageUrl = resolveChartImageUrl(src)

  if (!imageUrl) {
    return (
      <div className="container mx-auto flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Chart image not available.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-3 py-6">
      {title && <h1 className="text-xl font-semibold">{title}</h1>}

      <div className="relative inline-block max-w-full overflow-hidden rounded-lg border bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote chart of unknown intrinsic size */}
        <img
          src={imageUrl}
          alt={title || 'MarketSurge chart'}
          className="block h-auto max-h-[85vh] w-auto max-w-full"
        />
        <MarketSurgeAttribution size="lg" position="bottom-left" showCredit />
      </div>

      <p className="text-xs text-muted-foreground">
        Chart courtesy of MarketSurge. © MarketSurge. All rights reserved. Used with
        attribution; not for reproduction without permission.
      </p>
    </div>
  )
}
