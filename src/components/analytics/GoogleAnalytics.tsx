// src/components/analytics/GoogleAnalytics.tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';

interface GoogleAnalyticsProps {
  GA_MEASUREMENT_ID: string;
}

/**
 * Loads the GA4 gtag.js script and sends page_view events on route changes.
 *
 * This component is rendered only when the user has given analytics consent
 * (gated by AnalyticsProvider), so it does not need its own consent state.
 */
export default function GoogleAnalytics({ GA_MEASUREMENT_ID }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Send page_view on every client-side navigation
  useEffect(() => {
    if (typeof window.gtag !== 'function') return;

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

    window.gtag('event', 'page_view', {
      page_path: url,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [pathname, searchParams]);

  return (
    <>
      {/* Load gtag.js */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />

      {/* Initialise dataLayer + gtag config (send_page_view: false so we
          control page_view events via the useEffect above). */}
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false
            });
          `,
        }}
      />
    </>
  );
}

// Augment the global Window so TypeScript knows about gtag / dataLayer
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}
