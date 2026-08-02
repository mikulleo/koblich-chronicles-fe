// src/components/analytics/GoogleAnalytics.tsx
'use client'

import Script from 'next/script'
import { useEffect } from 'react'

import { configure } from '@/lib/analytics'

interface GoogleAnalyticsProps {
  GA_MEASUREMENT_ID: string
}

/**
 * Loads gtag.js and configures the GA4 property.
 *
 * Rendered only once analytics consent has been granted (see AnalyticsProvider).
 *
 * `configure()` runs in an effect, which is deliberately *earlier* than the
 * `afterInteractive` script below: it installs the synchronous gtag() shim and
 * queues `js` / `config` / `consent` commands into `dataLayer`. gtag.js replays
 * that queue when it executes, so nothing tracked during hydration is lost.
 * Page views are dispatched by PageViewTracker, not here.
 */
export default function GoogleAnalytics({ GA_MEASUREMENT_ID }: GoogleAnalyticsProps) {
  useEffect(() => {
    configure(GA_MEASUREMENT_ID, {
      debug: process.env.NODE_ENV !== 'production',
    })
  }, [GA_MEASUREMENT_ID])

  return (
    <Script
      id="ga-gtag-js"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    />
  )
}
