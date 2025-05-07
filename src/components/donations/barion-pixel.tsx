// src/donations/barion-pixel.tsx
'use client';

import { useEffect } from 'react';

// This component implements the Barion Pixel for fraud prevention
// More info: https://docs.barion.com/Barion_Pixel

declare global {
  interface Window {
    // Barion Pixel global object
    BP: {
      init: (posKey: string, options?: object) => void;
      trackProduct: (productData: object) => void;
      trackSearch: (searchData: object) => void;
    };
  }
}

interface BarionPixelProps {
  posKey: string; // Your Barion POS Key
}

export const BarionPixel = ({ posKey }: BarionPixelProps) => {
  useEffect(() => {
    // Load Barion Pixel script
    const loadBarionPixel = () => {
      if (window.BP) return; // Avoid loading it twice
      
      const script = document.createElement('script');
      script.src = 'https://pixel.barion.com/bp.js';
      script.async = true;
      script.onload = () => {
        // Initialize Barion Pixel with your POS key
        if (window.BP) {
          window.BP.init(posKey, {
            // Optional settings
            domain: window.location.hostname,
          });
          
          console.log('Barion Pixel initialized');
        }
      };
      document.body.appendChild(script);
    };
    
    loadBarionPixel();
    
    // Cleanup on unmount
    return () => {
      // Nothing to clean up for Barion Pixel as it's a global script
    };
  }, [posKey]);
  
  // This component doesn't render anything visible
  return null;
};

// Component to track product view
export const BarionTrackProduct = ({ productId, title, price, currency = 'CZK' }: { 
  productId: string;
  title: string;
  price: number;
  currency?: string;
}) => {
  useEffect(() => {
    // Track product view when component mounts
    if (window.BP) {
      window.BP.trackProduct({
        productId: productId,
        title: title,
        price: price,
        currency: currency,
      });
    }
  }, [productId, title, price, currency]);
  
  return null;
};

export default BarionPixel;