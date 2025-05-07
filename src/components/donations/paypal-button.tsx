'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Spinner } from '@/components/ui/spinner'

declare global {
  interface Window {
    paypal: any
  }
}

interface PayPalButtonProps {
  amount: number
  currency: string
  onSuccess: (details: any) => void
  onError: (error: any) => void
  onCancel: () => void
}

export default function PayPalButton({
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [scriptError, setScriptError] = useState<Error | null>(null)
  const paypalContainerRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  useEffect(() => {
    return () => {
      if (window.paypal) {
        try {
          if (paypalContainerRef.current) {
            paypalContainerRef.current.innerHTML = '';
          }
          const cardContainer = document.getElementById('card-button-container');
          if (cardContainer) {
            cardContainer.innerHTML = '';
          }
        } catch (err) {
          console.warn('Error cleaning up PayPal buttons:', err);
        }
      }
    };
  }, []);

  // Load PayPal script
  useEffect(() => {
    if (!clientId || scriptLoaded) return

    const loadScript = () => {
      // Check if script already exists
      const existingScript = document.querySelector(
        `script[src*="paypal.com/sdk/js"][data-client-id="${clientId}"]`
      )

      if (existingScript) {
        setScriptLoaded(true)
        return
      }

      // Create script element
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&components=buttons&intent=capture&commit=true&disable-funding=paylater,venmo`
      script.async = true
      script.dataset.clientId = clientId

      const cspNonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content'); // Example: get from a meta tag
    if (cspNonce) {
      script.setAttribute('data-csp-nonce', cspNonce);
    }
    
      script.onload = () => setScriptLoaded(true)
      script.onerror = (e) => {
        console.error('PayPal script loading error:', e)
        setScriptError(new Error('Failed to load PayPal script'))
      }

      document.body.appendChild(script)
      scriptRef.current = script
    }

    loadScript()

    // Cleanup
    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current)
      }
    }
  }, [clientId, currency, scriptLoaded])

  // Render buttons when script is loaded
  useEffect(() => {
    // Only proceed if script is loaded and container exists
    if (!scriptLoaded || !window.paypal || !paypalContainerRef.current) return

    // Clear any existing content
    if (paypalContainerRef.current.firstChild) {
      paypalContainerRef.current.innerHTML = ''
    }

    try {
      window.paypal
        .Buttons({
          // Explicitly set to only show PayPal option
          fundingSource: window.paypal.FUNDING.PAYPAL,
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
          },
          createOrder: (_data: any, actions: any) => {
            return actions.order.create({
              purchase_units: [
                {
                  description: 'Donation to Koblich Chronicles',
                  amount: {
                    currency_code: currency,
                    value: amount.toFixed(2),
                  },
                },
              ],
              application_context: {
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
                landing_page: 'BILLING',
              },
            })
          },
          onApprove: async (data: any, actions: any) => {
            try {
              // Log the order ID to verify it's present
              console.log('PayPal order approved with ID:', data.orderID);
              
              // Ensure we pass the correct property name for orderID
              onSuccess({
                orderId: data.orderID // Use orderId (not orderID) to match backend expectations
                //paymentSource: 'paypal'
              })
            } catch (err) {
              console.error('Error handling PayPal approval:', err)
              onError(err)
            }
          },
          onCancel,
          onError
        })
        .render(paypalContainerRef.current)
    } catch (err) {
      console.error('Error rendering PayPal buttons:', err)
      onError(err)
    }
  }, [scriptLoaded, amount, currency, onSuccess, onError, onCancel])

  // Separately render card button when PayPal script is loaded
  useEffect(() => {
    // Only proceed if script is loaded and container exists
    if (!scriptLoaded || !window.paypal) return
    
    const cardContainer = document.getElementById('card-button-container')
    if (!cardContainer) return
    
    // Clear existing content
    if (cardContainer.firstChild) {
      cardContainer.innerHTML = ''
    }
    
    try {
      // This renders a separate card-only button
      window.paypal
        .Buttons({
          fundingSource: window.paypal.FUNDING.CARD,
          style: {
            layout: 'vertical',
            color: 'black',
            shape: 'rect',
            label: 'pay'
          },
          createOrder: (_data: any, actions: any) => {
            return actions.order.create({
              purchase_units: [
                {
                  description: 'Donation to Koblich Chronicles',
                  amount: {
                    currency_code: currency,
                    value: amount.toFixed(2),
                  },
                },
              ],
              application_context: {
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
                landing_page: 'BILLING',
              },
            })
          },
          onApprove: async (data: any, actions: any) => {
            try {
              // Log the order ID to verify it's present
              console.log('Card payment approved with ID:', data.orderID);
              
              // Ensure we pass the correct property name for orderID
              onSuccess({
                orderId: data.orderID, // Use orderId (not orderID) to match backend expectations
                paymentSource: 'card'
              })
            } catch (err) {
              console.error('Error handling card approval:', err)
              onError(err)
            }
          },
          onCancel,
          onError
        })
        .render('#card-button-container')
    } catch (err) {
      console.error('Error rendering card button:', err)
      // Don't call onError here - it's not critical if this fails
    }
  }, [scriptLoaded, amount, currency, onSuccess, onError, onCancel])

  // Render UI based on script loading state
  if (!clientId) {
    return (
      <div className="p-4 text-center border border-destructive bg-destructive/10 rounded-md">
        <p className="font-medium text-destructive">PayPal configuration error</p>
        <p className="text-sm mt-1">Please contact the site administrator</p>
      </div>
    )
  }

  if (scriptError) {
    return (
      <div className="text-destructive text-center py-4">
        Error loading payment options. Please refresh the page or try again later.
      </div>
    )
  }

  if (!scriptLoaded) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner className="mr-2" /> Loading payment options...
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div ref={paypalContainerRef} className="w-full min-h-[50px]"></div>
      <div id="card-button-container" className="w-full min-h-[50px]"></div>
    </div>
  )
}