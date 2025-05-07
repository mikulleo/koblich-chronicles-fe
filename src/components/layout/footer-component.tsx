// src/components/layout/footer-component.tsx
import React from 'react';
import PaymentMethodLogos from '@/components/donations/payment-method-logos';
import Link from 'next/link';

export function FooterComponent() {
  return (
    <footer className="border-t py-8 mt-8">
      <div className="container mx-auto">
        <div className="flex flex-col items-center gap-4">
          <PaymentMethodLogos showLabel={true} size="medium" />
          
          <div className="text-xs text-center text-muted-foreground max-w-md mx-auto">
            <p>
              Payment processing provided by PayPal. By using our services, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>
          
          {/* You can add additional footer content here */}
          <div className="text-sm text-center mt-4">
            &copy; {new Date().getFullYear()} Koblich Chronicles. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}