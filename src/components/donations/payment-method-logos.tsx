// src/donations/payment-method-logos.tsx
import React from 'react';
import Image from 'next/image';

interface PaymentMethodLogosProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}

const PaymentMethodLogos: React.FC<PaymentMethodLogosProps> = ({
  size = 'medium',
  showLabel = true,
  className = '',
}) => {
  const sizes = {
    small: { width: 32, height: 20 },
    medium: { width: 48, height: 30 },
    large: { width: 64, height: 40 },
  };

  const { width, height } = sizes[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {showLabel && (
        <p className="text-sm text-muted-foreground mb-2">
          Secure payments powered by:
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* PayPal Logo */}
        <div className="relative" style={{ width: width * 2.5, height }}>
          <Image
            src="/PayPal_logo.svg"
            alt="PayPal"
            width={width * 2.5}
            height={height}
            className="object-contain"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Visa Logo */}
          <div className="relative" style={{ width, height }}>
            <Image
              src="/Visa_Inc.svg"
              alt="Visa"
              width={width}
              height={height}
              className="object-contain"
            />
          </div>

          {/* Mastercard Logo */}
          <div className="relative" style={{ width, height }}>
            <Image
              src="/Mastercard-logo.png"
              alt="Mastercard"
              width={width}
              height={height}
              className="object-contain"
            />
          </div>

          {/* American Express Logo */}
          <div className="relative" style={{ width, height: height * 0.8 }}>
            <Image
              src="/amex-logo.svg"
              alt="American Express"
              width={width}
              height={height * 0.8}
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodLogos;