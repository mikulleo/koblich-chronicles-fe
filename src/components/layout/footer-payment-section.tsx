// src/components/layout/footer-payment-section.tsx
import React from 'react';
import PaymentMethodLogos from '@/components/donations/payment-method-logos';
import Link from 'next/link';

export const FooterPaymentSection = () => {
  return (
    <div className="border-t pt-6 mt-8">
      <div className="flex flex-col items-center gap-4">
        <PaymentMethodLogos showLabel={true} size="medium" />
        
        <div className="text-xs text-center text-muted-foreground max-w-md">
          <p>
            Payment processing provided by Barion Payment Inc., an EU-licensed financial institution. 
            All transactions are secure and protected. By proceeding with a donation, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FooterPaymentSection;