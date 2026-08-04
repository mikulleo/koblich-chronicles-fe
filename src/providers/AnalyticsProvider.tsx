// src/providers/AnalyticsProvider.tsx
'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import CookieConsentBanner from '@/components/analytics/CookieConsentBanner'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import PageViewTracker from '@/components/analytics/PageViewTracker'
import {
  setAnalyticsConsent,
  setConsentDefaults,
  setMarketingConsent,
  type ConsentStatus,
} from '@/lib/analytics'

type ConsentOptions = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

type AnalyticsContextType = {
  analyticsEnabled: boolean
  marketingEnabled: boolean
  openConsentManager: () => void
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  analyticsEnabled: false,
  marketingEnabled: false,
  openConsentManager: () => {},
})

export const useAnalyticsContext = () => useContext(AnalyticsContext)

/**
 * Google Consent Mode strategy.
 *
 * `advanced` (default) loads gtag.js for every visitor with all storage denied
 * until they opt in. No cookies are written and no identifiers are stored
 * without consent; Google receives cookieless pings it uses for aggregate
 * behavioural modelling. Without this, visitors who ignore or decline the
 * banner are entirely invisible, which typically hides 30–60% of traffic and
 * makes absolute totals meaningless.
 *
 * Set NEXT_PUBLIC_ANALYTICS_CONSENT_MODE=basic to load nothing at all until the
 * visitor opts in. See docs/analytics.md for the trade-off.
 */
const CONSENT_MODE = process.env.NEXT_PUBLIC_ANALYTICS_CONSENT_MODE ?? 'advanced'

export function AnalyticsProvider({
  children,
  gaMeasurementId,
}: {
  children: React.ReactNode
  gaMeasurementId?: string
}) {
  const [consent, setConsent] = useState<ConsentOptions>({
    necessary: true,
    analytics: false,
    marketing: false,
  })
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('unknown')

  // Declare all storage denied before gtag.js has a chance to execute.
  // Effects run ahead of `afterInteractive` scripts, so this ordering holds.
  useEffect(() => {
    setConsentDefaults()
  }, [])

  const handleConsent = useCallback((newConsent: ConsentOptions) => {
    setConsent(newConsent)
    setConsentStatus(newConsent.analytics ? 'granted' : 'denied')
    setAnalyticsConsent(newConsent.analytics ? 'granted' : 'denied')
    setMarketingConsent(newConsent.marketing)
  }, [])

  const openConsentManager = useCallback(() => {
    if (typeof window !== 'undefined' && window.openCookieConsent) {
      window.openCookieConsent()
    }
  }, [])

  const contextValue = useMemo(
    () => ({
      analyticsEnabled: consent.analytics,
      marketingEnabled: consent.marketing,
      openConsentManager,
    }),
    [consent.analytics, consent.marketing, openConsentManager],
  )

  // `consentStatus === 'denied'` has to veto loading, not just gate our own
  // events. gtag.js emits enhanced-measurement hits (scroll, outbound click,
  // file download, site search) from inside the library, so they never pass
  // through `track()` and its consent check — leaving the script mounted for
  // someone who pressed "Reject optional" collected exactly the data the button
  // says it will not. It cannot unload a library that already executed, but a
  // returning visitor with a stored rejection now never loads it at all.
  const shouldLoadGa =
    !!gaMeasurementId && consentStatus !== 'denied' && (consent.analytics || CONSENT_MODE === 'advanced')

  return (
    // Rendered unconditionally. An earlier version returned bare `children`
    // until a client-side flag flipped, which changed the tree shape and
    // remounted the entire app — doubling every mount-time event.
    <AnalyticsContext.Provider value={contextValue}>
      <CookieConsentBanner onConsent={handleConsent} />

      {shouldLoadGa && <GoogleAnalytics GA_MEASUREMENT_ID={gaMeasurementId!} />}

      {/* Always mounted: the transport buffers page views until consent
          resolves, which is what makes entry pages measurable. */}
      <PageViewTracker />

      {children}
    </AnalyticsContext.Provider>
  )
}

/** Renders a component only when analytics consent has been granted. */
export function withAnalyticsConsent<P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P> {
  return function WrappedComponent(props: P) {
    const { analyticsEnabled } = useAnalyticsContext()

    if (!analyticsEnabled) {
      return null
    }

    return <Component {...props} />
  }
}

export default AnalyticsProvider
