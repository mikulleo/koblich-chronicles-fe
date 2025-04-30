// src/components/analytics/CookieConsentBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

// Define consent options
type ConsentOptions = {
  necessary: boolean;  // Always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
};

// Define props
interface CookieConsentBannerProps {
  onConsent: (consent: ConsentOptions) => void;
}

// Cookie names
const CONSENT_COOKIE_NAME = 'cookie-consent';

// Helper to get consent from cookie
const getStoredConsent = (): ConsentOptions | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(CONSENT_COOKIE_NAME);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as ConsentOptions;
  } catch (e) {
    return null;
  }
};

// Helper to set consent in cookie
const storeConsent = (consent: ConsentOptions): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(consent));
  
  // Set expiry to 6 months
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 6);
  
  // You could also set an actual cookie here if needed
  document.cookie = `${CONSENT_COOKIE_NAME}=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
};

export default function CookieConsentBanner({ onConsent }: CookieConsentBannerProps) {
  // Get initial consent state
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [consent, setConsent] = useState<ConsentOptions>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
  });

  // Check for existing consent exactly once on mount
   useEffect(() => {
     const storedConsent = getStoredConsent();

     if (storedConsent) {
       setConsent(storedConsent);
       onConsent(storedConsent);
     } else {
       setIsOpen(true);
     }
 
     // Expose a manual “open” for the banner
     // (we only ever want to register this handler once)
     window.openCookieConsent = () => setIsOpen(true);
 
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

  // Handler for accepting all cookies
  const handleAcceptAll = () => {
    const fullConsent: ConsentOptions = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    
    setConsent(fullConsent);
    storeConsent(fullConsent);
    onConsent(fullConsent);
    setIsOpen(false);
  };

  // Handler for rejecting optional cookies
  const handleRejectOptional = () => {
    const minimalConsent: ConsentOptions = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    
    setConsent(minimalConsent);
    storeConsent(minimalConsent);
    onConsent(minimalConsent);
    setIsOpen(false);
  };

  // Handler for saving preferences
  const handleSavePreferences = () => {
    storeConsent(consent);
    onConsent(consent);
    setIsOpen(false);
  };

  // Handler for checkbox changes
  const handleCheckboxChange = (key: keyof Omit<ConsentOptions, 'necessary'>) => {
    setConsent(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription>
            We use cookies to enhance your browsing experience, analyze site traffic, and assist in our marketing efforts.
          </DialogDescription>
        </DialogHeader>

        {showDetails && (
          <div className="space-y-4 my-4">
            <div className="flex items-start space-x-2">
              <Checkbox id="necessary" checked disabled />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="necessary"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Necessary Cookies
                </label>
                <p className="text-sm text-muted-foreground">
                  These cookies are required for essential website functionality.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="analytics" 
                checked={consent.analytics}
                onCheckedChange={() => handleCheckboxChange('analytics')}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="analytics"
                  className="text-sm font-medium leading-none"
                >
                  Analytics Cookies
                </label>
                <p className="text-sm text-muted-foreground">
                  Help us improve by tracking anonymous usage information.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="marketing" 
                checked={consent.marketing}
                onCheckedChange={() => handleCheckboxChange('marketing')}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="marketing"
                  className="text-sm font-medium leading-none"
                >
                  Marketing Cookies
                </label>
                <p className="text-sm text-muted-foreground">
                  Allow us to provide a more personalized experience.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          By clicking "Accept All", you agree to the storing of cookies on your device. See our{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{' '}
          for more details.
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {showDetails ? (
            <Button variant="outline" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleRejectOptional}>
                Reject Optional
              </Button>
              <Button variant="outline" onClick={() => setShowDetails(true)}>
                Customize
              </Button>
            </>
          )}
          <Button onClick={handleAcceptAll}>Accept All</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add global function definition for manually opening consent dialog
declare global {
  interface Window {
    openCookieConsent: () => void;
  }
}