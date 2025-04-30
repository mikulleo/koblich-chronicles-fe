// src/components/analytics/GoogleAnalytics.tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';

interface GoogleAnalyticsProps {
  GA_MEASUREMENT_ID: string;
}

export default function GoogleAnalytics({ GA_MEASUREMENT_ID }: GoogleAnalyticsProps) {
  // **DEBUG**: log the incoming prop
  console.debug('[GA] GoogleAnalytics mounted, GA_MEASUREMENT_ID=', GA_MEASUREMENT_ID);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // For now we default to true, but you can tie this into your consent context
  const [analyticsConsent, setAnalyticsConsent] = useState<boolean>(() => {
    console.debug('[GA] initial analyticsConsent = true');
    return true;
  });

  // Log whenever consent flips
  useEffect(() => {
    console.debug('[GA] analyticsConsent changed:', analyticsConsent);
  }, [analyticsConsent]);

  useEffect(() => {
    console.debug(
      '[GA] useEffect – consent=%s, pathname=%s, search=%s, window.gtag=%o',
      analyticsConsent,
      pathname,
      searchParams.toString(),
      window.gtag
    );

    if (!analyticsConsent) {
      console.debug('[GA] skipping page_view because no consent');
      return;
    }

    if (typeof window.gtag !== 'function') {
      console.warn('[GA] window.gtag is not yet a function');
      return;
    }

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    console.debug('[GA] sending page_view for', url);

    window.gtag('event', 'page_view', {
      page_path: url,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [pathname, searchParams, analyticsConsent]);

  if (!analyticsConsent) {
    console.debug('[GA] rendering null (no consent)');
    return null;
  }

  return (
    <>
      {/* 1) Load the gtag.js script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={() => console.debug('[GA] gtag.js loaded successfully')}
        onError={(e) => console.error('[GA] gtag.js failed to load', e)}
      />

      {/* 2) Initialize the dataLayer and gtag() function */}
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            console.debug('[GA] running gtag init inline script');
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false
            });
          `
        }}
      />
    </>
  );
}

// Augment the window object so TS stops complaining
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}
