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
        {/* Barion Logo */}
        <div className="relative" style={{ width: width * 2.5, height }}>
          <Image
            src="/barion.png"
            alt="Barion Payment"
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

          {/* Apple Pay Logo */}
          <div className="relative" style={{ width: width * 1.5, height }}>
            <Image
              src="/Apple_Pay_logo.png"
              alt="Apple Pay"
              width={width * 1.5}
              height={height}
              className="object-contain"
            />
          </div>

          {/* Google Pay Logo */}
          <div className="relative" style={{ width: width * 1.5, height }}>
            <Image
              src="/Google_Pay_Logo.webp"
              alt="Google Pay"
              width={width * 1.5}
              height={height}
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodLogos;
