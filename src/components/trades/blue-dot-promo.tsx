// trades/blue-dot-promo.tsx

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowUpRight, PlayCircle } from 'lucide-react'
import { useAnalytics } from '@/hooks/use-analytics'

/** MarketSurge Blue Dot offer — $14.95 for two weeks (#IBDpartner link). */
const OFFER_URL =
  'https://get.investors.com/marketsurge/blue-dot/?src=A00723&trackingCode=a9510b2e&utm_source=X.com&utm_medium=GSI&utm_campaign=BLUE+DOT+AC+2026&utm_id=BDAC26'
const TUTORIAL_URL =
  'https://marketsurge.investors.com/resources/videoTutorials/researchFeatures?id=531&node=p'
const ARTWORK_SRC = '/Blue%20Dot%20artwork%20for%20socials/X_artwork_ms-blue-dot-1200x628.jpg'
/** Offer runs through Oct. 1 — hide at the end of that day, US Eastern (EDT). */
const OFFER_ENDS_AT = Date.parse('2026-10-02T04:00:00Z')

export function BlueDotPromo() {
  const analytics = useAnalytics()
  // Checked after mount so a statically built page still drops the banner once the offer ends.
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    setExpired(Date.now() >= OFFER_ENDS_AT)
  }, [])

  if (expired) return null

  const trackClick = (target: 'artwork' | 'cta' | 'tutorial') =>
    analytics.trackEvent('marketsurge_signup_click', {
      location: 'trades_blue_dot_promo',
      target,
    })

  return (
    <section
      aria-label="MarketSurge Blue Dot offer"
      className="overflow-hidden rounded-lg border bg-card shadow-sm md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <a
        href={OFFER_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => trackClick('artwork')}
        className="block bg-[#1ba1dc]"
      >
        <Image
          src={ARTWORK_SRC}
          alt="Identify top stocks with the Blue Dot. Only in MarketSurge."
          width={1200}
          height={628}
          sizes="(min-width: 768px) 55vw, 100vw"
          priority
          className="h-full w-full object-cover"
        />
      </a>

      <div className="flex flex-col justify-center gap-4 p-5 md:p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1ba1dc]">
            Limited offer · through Oct. 1
          </p>
          <h2 className="text-xl font-bold leading-tight">
            Get MarketSurge&apos;s Blue Dot list — $14.95 for two weeks
          </h2>
          <p className="text-sm text-muted-foreground">
            The Blue Dot flags stocks whose relative strength line hits a 52-week high while
            they&apos;re still building a base — helping you spot potential breakouts early.
          </p>
        </div>

        <a
          href={OFFER_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => trackClick('cta')}
          className="group inline-flex w-fit items-center gap-1.5 rounded-full bg-[#047a41] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#03683a] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047a41] focus-visible:ring-offset-2"
        >
          Get 2 weeks for $14.95
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
          />
          <span className="sr-only">(opens in a new tab)</span>
        </a>

        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <PlayCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Plus, check out MarketSurge&apos;s{' '}
            <a
              href={TUTORIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('tutorial')}
              className="font-medium text-foreground underline underline-offset-2 hover:text-[#047a41]"
            >
              FREE pattern recognition tutorial
            </a>
            .
          </span>
        </p>

        <p className="text-xs text-muted-foreground/80">
          #IBDpartner · Sponsored link
        </p>
      </div>
    </section>
  )
}

export default BlueDotPromo
