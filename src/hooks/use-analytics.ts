// src/hooks/use-analytics.ts
'use client'

/**
 * Component-facing analytics API.
 *
 * The returned object is a frozen module-level singleton, so it is
 * referentially stable across renders. That matters more than it looks:
 * these functions are used in `useEffect` dependency arrays, and an object
 * rebuilt on every render silently turns "track once" into "track on every
 * render" (which is how replay_start came to be over-counted).
 */

import * as analytics from '@/lib/analytics'

const api = Object.freeze({
  /** Escape hatch for one-off events. Prefer a named helper below. */
  trackEvent: analytics.track,

  // Journey
  trackPageView: analytics.trackPageView,
  trackNavClick: analytics.trackNavClick,
  trackTabView: analytics.trackTabView,

  // Auth
  trackLogin: analytics.trackLogin,
  trackSignUp: analytics.trackSignUp,
  trackLogout: analytics.trackLogout,
  trackAuthError: analytics.trackAuthError,

  // Trading Gym
  trackGymGateView: analytics.trackGymGateView,
  trackGymHubView: analytics.trackGymHubView,
  trackGymSectionOpen: analytics.trackGymSectionOpen,

  // Trades, stories, replays
  trackTradeOpen: analytics.trackTradeOpen,
  trackTradeView: analytics.trackTradeView,
  trackStoryEventOpen: analytics.trackStoryEventOpen,
  trackReplayStart: analytics.trackReplayStart,
  trackReplayProgress: analytics.trackReplayProgress,
  trackReplayComplete: analytics.trackReplayComplete,
  trackReplayExit: analytics.trackReplayExit,
  trackReplayAction: analytics.trackReplayAction,

  // Charts, tags, tickers
  trackChartView: analytics.trackChartView,
  trackTagClick: analytics.trackTagClick,
  trackTickerSelect: analytics.trackTickerSelect,
  trackStatsFilter: analytics.trackStatsFilter,

  // Donations
  trackDonateCtaView: analytics.trackDonateCtaView,
  trackDonateCtaClick: analytics.trackDonateCtaClick,
  trackDonationAmountSelected: analytics.trackDonationAmountSelected,
  trackDonationCheckoutStarted: analytics.trackDonationCheckoutStarted,
  trackDonationPaymentShown: analytics.trackDonationPaymentShown,
  trackDonationCancelled: analytics.trackDonationCancelled,
  trackDonationError: analytics.trackDonationError,
  trackDonationAbandoned: analytics.trackDonationAbandoned,
  stagePurchase: analytics.stagePurchase,
  flushStagedPurchase: analytics.flushStagedPurchase,

  // Misc
  trackFileDownload: analytics.trackFileDownload,
  trackSearch: analytics.trackSearch,
})

export type AnalyticsApi = typeof api

export const useAnalytics = (): AnalyticsApi => api

export default useAnalytics
