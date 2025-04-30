// src/hooks/use-analytics.ts
'use client';

/**
 * Custom hook for tracking events in Google Analytics
 */
export const useAnalytics = () => {
  /**
   * Track a custom event in Google Analytics
   */
  const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
  };

  /**
   * Track user interaction with charts
   */
  const trackChartView = (chartId: string, ticker: string) => {
    trackEvent('chart_view', {
      chart_id: chartId,
      ticker: ticker,
    });
  };

  /**
   * Track tag clicks for analytics
   */
  const trackTagClick = (tagName: string) => {
    trackEvent('tag_click', {
      tag_name: tagName,
    });
  };

  /**
   * Track ticker selection
   */
  const trackTickerSelect = (ticker: string) => {
    trackEvent('ticker_select', {
      ticker: ticker,
    });
  };

  /**
   * Track trade view
   */
  const trackTradeView = (tradeId: string, ticker: string, type: 'long' | 'short') => {
    trackEvent('trade_view', {
      trade_id: tradeId,
      ticker: ticker,
      trade_type: type,
    });
  };

  /**
   * Track statistics filter change
   */
  const trackStatsFilter = (filterType: string, value: string) => {
    trackEvent('stats_filter_change', {
      filter_type: filterType,
      filter_value: value,
    });
  };

  /**
   * Track donation events
   */
  const trackDonation = (amount: number, currency: string) => {
    trackEvent('donation_initiated', {
      currency: currency,
      value: amount,
    });
  };

  return {
    trackEvent,
    trackChartView,
    trackTagClick,
    trackTickerSelect,
    trackTradeView,
    trackStatsFilter,
    trackDonation,
  };
};

export default useAnalytics;