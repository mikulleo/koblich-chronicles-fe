// src/components/analytics/CookieConsentBanner.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Consent bar.
 *
 * Deliberately *not* a modal. The previous implementation was a blocking
 * Dialog, which had two costs:
 *
 *   • Radix closes a Dialog on Escape, outside-click and the built-in ✕. All
 *     three dismissed the banner without recording a choice, so consent was
 *     never stored, analytics never loaded, and — because the open check ran
 *     once on mount — the visitor was never asked again that session.
 *   • Blocking the page before anyone has seen the content depresses opt-in,
 *     which is what makes analytics coverage partial in the first place.
 *
 * This bar sits at the bottom, leaves the site usable, and stays until an
 * explicit choice is made. Accepting and rejecting are one click each, with
 * equal visual weight, as GDPR requires.
 */

type ConsentOptions = {
  necessary: boolean; // Always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
};

interface CookieConsentBannerProps {
  onConsent: (consent: ConsentOptions) => void;
}

const CONSENT_STORAGE_KEY = 'cookie-consent';

const getStoredConsent = (): ConsentOptions | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<ConsentOptions>;
    // Older builds stored other shapes here; only trust explicit booleans.
    if (typeof parsed?.analytics !== 'boolean') return null;

    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing === true,
    };
  } catch {
    return null;
  }
};

const storeConsent = (consent: ConsentOptions): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    /* storage unavailable — the banner will ask again next visit */
  }
};

export default function CookieConsentBanner({ onConsent }: CookieConsentBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [choiceMade, setChoiceMade] = useState(false);
  const [consent, setConsent] = useState<ConsentOptions>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const storedConsent = getStoredConsent();

    if (storedConsent) {
      setConsent(storedConsent);
      setChoiceMade(true);
      onConsent(storedConsent);
    } else {
      setIsOpen(true);
    }

    // Lets the footer's "Cookie settings" link reopen this to withdraw or
    // change consent — a GDPR requirement, and previously unreachable.
    window.openCookieConsent = () => {
      setShowDetails(true);
      setIsOpen(true);
    };

    return () => {
      delete (window as { openCookieConsent?: () => void }).openCookieConsent;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = useCallback(
    (next: ConsentOptions) => {
      setConsent(next);
      storeConsent(next);
      setChoiceMade(true);
      onConsent(next);
      setIsOpen(false);
      setShowDetails(false);
    },
    [onConsent],
  );

  const acceptAll = () => commit({ necessary: true, analytics: true, marketing: true });
  const rejectOptional = () => commit({ necessary: true, analytics: false, marketing: false });
  const savePreferences = () => commit(consent);

  const toggle = (key: 'analytics' | 'marketing') =>
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur',
        'supports-[backdrop-filter]:bg-background/80 shadow-lg',
      )}
    >
      <div className="container mx-auto max-w-4xl px-4 py-4 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <Cookie className="hidden h-6 w-6 shrink-0 text-primary sm:block" aria-hidden />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Cookie preferences</p>
              <p className="text-sm text-muted-foreground">
                We use analytics cookies to understand which parts of the site are useful, so we
                can improve them. Nothing is stored on your device unless you allow it. See our{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            {showDetails && (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-start gap-3">
                  <Checkbox id="cookie-necessary" checked disabled />
                  <div className="grid gap-1 leading-none">
                    <label htmlFor="cookie-necessary" className="text-sm font-medium">
                      Necessary
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Required for the site to work, including secure donation handling. Always on.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="cookie-analytics"
                    checked={consent.analytics}
                    onCheckedChange={() => toggle('analytics')}
                  />
                  <div className="grid gap-1 leading-none">
                    <label htmlFor="cookie-analytics" className="text-sm font-medium">
                      Analytics
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Anonymous usage statistics — which pages, charts and replays get used.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="cookie-marketing"
                    checked={consent.marketing}
                    onCheckedChange={() => toggle('marketing')}
                  />
                  <div className="grid gap-1 leading-none">
                    <label htmlFor="cookie-marketing" className="text-sm font-medium">
                      Marketing
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Personalised content and advertising. Currently unused.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-44">
            {showDetails ? (
              <Button size="sm" onClick={savePreferences}>
                Save preferences
              </Button>
            ) : (
              <Button size="sm" onClick={acceptAll}>
                Accept all
              </Button>
            )}

            {/* Same size and prominence as accept — rejecting must be no harder. */}
            <Button size="sm" variant="outline" onClick={rejectOptional}>
              Reject optional
            </Button>

            {!showDetails && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setShowDetails(true)}
              >
                Customise
              </Button>
            )}
          </div>

          {/* Only offered once a choice already exists, so it can never be used
              to skip the question. */}
          {choiceMade && (
            <button
              type="button"
              aria-label="Close cookie preferences"
              onClick={() => {
                setIsOpen(false);
                setShowDetails(false);
              }}
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    openCookieConsent: () => void;
  }
}
