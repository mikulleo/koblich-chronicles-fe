// charts/marketsurge-attribution.tsx

import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const LOGO_SRC = '/logo-marketsurge-color.svg'
/** MarketSurge sign-up page. Swap in an affiliate/referral link here if we get one. */
export const MARKETSURGE_SIGNUP_URL = 'https://get.investors.com/marketsurge/'
// Intrinsic size of the SVG (898 x 151) — used to keep the aspect ratio exact.
const LOGO_RATIO = 151 / 898

const LOGO_WIDTHS = {
  xs: 70,
  sm: 96,
  md: 130,
  lg: 170,
} as const

// Text size of the sign-up button, scaled with the logo.
const CTA_TEXT = {
  xs: 'text-[9px]',
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-[13px]',
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
  /**
   * Shows a separate "Try MarketSurge" sign-up button next to the logo.
   * Leave unset wherever the chart needs every click (e.g. measurement mode).
   */
  signupHref?: string
  onSignupClick?: () => void
  className?: string
}

/**
 * Copyright attribution overlay for MarketSurge charts.
 *
 * Renders on a light plate so the logo stays legible on both light and dark
 * chart images. The logo plate is non-interactive so it never swallows clicks
 * meant for the chart (zoom, pan, measurement tools).
 *
 * With `signupHref`, a separate "Try MarketSurge" button sits next to the
 * plate. It is deliberately its own element: the MarketSurge logo itself is
 * never altered or turned into a link.
 *
 * Place it inside a container with `position: relative` that wraps the chart
 * image, e.g. `<div className="relative">…<MarketSurgeAttribution /></div>`.
 */
export function MarketSurgeAttribution({
  size = 'md',
  position = 'bottom-left',
  showCredit = false,
  signupHref,
  onSignupClick,
  className,
}: MarketSurgeAttributionProps) {
  const width = LOGO_WIDTHS[size]
  const height = Math.round(width * LOGO_RATIO)

  // Keep pan/zoom/measure handlers on the chart from seeing the button's events.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-20 flex items-center gap-2',
        POSITIONS[position],
        className
      )}
    >
      <div
        className="flex items-center gap-1.5 rounded-md bg-white/85 px-1.5 py-1 shadow-sm ring-1 ring-black/5 backdrop-blur-[2px]"
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

      {signupHref && (
        <a
          href={signupHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={cn(
            'group pointer-events-auto flex items-center gap-1 whitespace-nowrap rounded-full',
            'bg-[#047a41] px-2.5 py-1 font-semibold leading-none text-white shadow-sm',
            'transition-all hover:bg-[#03683a] hover:shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#047a41]',
            CTA_TEXT[size]
          )}
          title="The charting tool behind these charts"
          onMouseDown={stop}
          onPointerDown={stop}
          onTouchStart={stop}
          onClick={(e) => {
            e.stopPropagation()
            onSignupClick?.()
          }}
        >
          Try MarketSurge
          <ArrowUpRight
            aria-hidden="true"
            className="h-[1.15em] w-[1.15em] transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
          />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </div>
  )
}

export default MarketSurgeAttribution
