// charts/marketsurge-attribution.tsx

import Image from 'next/image'
import { cn } from '@/lib/utils'

const LOGO_SRC = '/logo-marketsurge-color.svg'
// Intrinsic size of the SVG (898 x 151) — used to keep the aspect ratio exact.
const LOGO_RATIO = 151 / 898

const LOGO_WIDTHS = {
  xs: 70,
  sm: 96,
  md: 130,
  lg: 170,
} as const

const POSITIONS = {
  'bottom-left': 'bottom-2 left-2',
  'top-left': 'top-2 left-2',
  'bottom-right': 'bottom-2 right-2',
} as const

export type MarketSurgeAttributionSize = keyof typeof LOGO_WIDTHS
export type MarketSurgeAttributionPosition = keyof typeof POSITIONS

interface MarketSurgeAttributionProps {
  /** Logo width preset. Match it to how large the chart is rendered. */
  size?: MarketSurgeAttributionSize
  /** Where to pin the overlay inside the nearest positioned ancestor. */
  position?: MarketSurgeAttributionPosition
  /** Show the "Chart courtesy of" credit line next to the logo. */
  showCredit?: boolean
  className?: string
}

/**
 * Copyright attribution overlay for MarketSurge charts.
 *
 * Renders on a light plate so the logo stays legible on both light and dark
 * chart images. Non-interactive by design — it must never swallow clicks meant
 * for the chart (zoom, pan, measurement tools).
 *
 * Place it inside a container with `position: relative` that wraps the chart
 * image, e.g. `<div className="relative">…<MarketSurgeAttribution /></div>`.
 */
export function MarketSurgeAttribution({
  size = 'md',
  position = 'bottom-left',
  showCredit = false,
  className,
}: MarketSurgeAttributionProps) {
  const width = LOGO_WIDTHS[size]
  const height = Math.round(width * LOGO_RATIO)

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-20 flex items-center gap-1.5 rounded-md',
        'bg-white/85 px-1.5 py-1 shadow-sm ring-1 ring-black/5 backdrop-blur-[2px]',
        POSITIONS[position],
        className
      )}
      aria-label="Chart courtesy of MarketSurge"
    >
      <Image
        src={LOGO_SRC}
        alt="MarketSurge"
        width={width}
        height={height}
        unoptimized
        draggable={false}
        style={{ width, height: 'auto' }}
      />
      {showCredit && (
        <span className="text-[10px] leading-tight text-neutral-600">
          
        </span>
      )}
    </div>
  )
}

export default MarketSurgeAttribution
