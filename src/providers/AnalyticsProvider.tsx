// src/providers/AnalyticsProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import CookieConsentBanner from '@/components/analytics/CookieConsentBanner';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';

// Define consent type
type ConsentOptions = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

// Define context type
type AnalyticsContextType = {
  analyticsEnabled: boolean;
  marketingEnabled: boolean;
  openConsentManager: () => void;
};

// Create context with default values
const AnalyticsContext = createContext<AnalyticsContextType>({
  analyticsEnabled: false,
  marketingEnabled: false,
  openConsentManager: () => {},
});

// Hook for components to access analytics state
export const useAnalyticsContext = () => useContext(AnalyticsContext);

export function AnalyticsProvider({ 
  children,
  gaMeasurementId,
}: { 
  children: React.ReactNode;
  gaMeasurementId?: string;
}) {
  // State to store user consent
  const [consent, setConsent] = useState<ConsentOptions>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  // DEBUG
  console.debug(
        '[AnalyticsProvider] render:',
        'gaMeasurementId=', gaMeasurementId,
        'consent=', consent
      );
  
  // State to control if provider is ready (prevents flash of content)
  const [isReady, setIsReady] = useState(false);

  // Handle consent changes
  const handleConsent = (newConsent: ConsentOptions) => {
    setConsent(newConsent);
    
    // You could add additional logic here like event firing
    if (newConsent.analytics) {
      // Set Analytics consent
      if (window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted',
        });
      }
    } else {
      // Revoke Analytics consent
      if (window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied',
        });
      }
    }
  };

  // Function to manually open consent manager
  const openConsentManager = () => {
    if (typeof window !== 'undefined' && window.openCookieConsent) {
      window.openCookieConsent();
    }
  };

  // Hydration safety - only show after client-side render
  useEffect(() => {
    setIsReady(true);
    console.debug('[AnalyticsProvider] setIsReady(true)');
  }, []);

  // Skip rendering until client-side
  if (!isReady) {
    return <>{children}</>;
  }

  return (
    <AnalyticsContext.Provider
      value={{
        analyticsEnabled: consent.analytics,
        marketingEnabled: consent.marketing,
        openConsentManager,
      }}
    >
      {/* Cookie Consent Banner */}
      <CookieConsentBanner onConsent={handleConsent} />
      
      {/* Google Analytics - only load if consent given */}
      {consent.analytics && gaMeasurementId && (
        <GoogleAnalytics GA_MEASUREMENT_ID={gaMeasurementId} />
      )}
      
      {children}
    </AnalyticsContext.Provider>
  );
}

// Optional: Higher order component to require analytics consent
export function withAnalyticsConsent<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WrappedComponent(props: P) {
    const { analyticsEnabled } = useAnalyticsContext();
    
    // If component should only show when analytics is enabled
    if (!analyticsEnabled) {
      return null;
    }
    
    return <Component {...props} />;
  };
}

export default AnalyticsProvider;