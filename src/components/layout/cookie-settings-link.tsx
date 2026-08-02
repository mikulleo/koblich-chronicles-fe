// src/components/layout/cookie-settings-link.tsx
'use client';

import { useAnalyticsContext } from '@/providers/AnalyticsProvider';

/**
 * Reopens the consent bar so a visitor can change or withdraw consent.
 *
 * GDPR requires withdrawal to be as easy as granting. The provider already
 * exposed `openConsentManager()`, but nothing in the UI called it, so consent
 * was effectively one-way once stored.
 */
export function CookieSettingsLink({ className }: { className?: string }) {
  const { openConsentManager } = useAnalyticsContext();

  return (
    <button
      type="button"
      onClick={openConsentManager}
      className={className ?? 'text-primary hover:underline'}
    >
      Cookie settings
    </button>
  );
}

export default CookieSettingsLink;
