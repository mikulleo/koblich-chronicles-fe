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
      debug: process.env.NODE_ENV !== 'production' || isDebugRequested(),
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

const DEBUG_KEY = 'kc:analytics:debug'

/**
 * `?debug_mode=1` opts this tab into GA4 DebugView on production; `?debug_mode=0`
 * opts back out. gtag.js does not read the URL itself, so without this there is
 * no way to see production hits in DebugView short of the GA Debugger extension.
 * Remembered for the tab, because the query string is gone after one navigation
 * and a reload would otherwise silently drop out of debug.
 *
 * Debug hits are excluded from standard reports once the "Developer traffic"
 * data filter is active, so checking the live site does not pollute its numbers.
 */
function isDebugRequested(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('debug_mode')
    if (param === '1' || param === 'true') window.sessionStorage.setItem(DEBUG_KEY, '1')
    if (param === '0' || param === 'false') window.sessionStorage.removeItem(DEBUG_KEY)
    return window.sessionStorage.getItem(DEBUG_KEY) === '1'
  } catch {
    return false
  }
}
