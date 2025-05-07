'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Spinner } from '@/components/ui/spinner'

declare global {
  interface Window {
    paypal: any;
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
  const cardContainerRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const buttonsInstanceRef = useRef<any>(null)
  const cardButtonsInstanceRef = useRef<any>(null)
  const isMountedRef = useRef(true) // Track component mount state
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])
  
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

      script.onload = () => {
        if (isMountedRef.current) {
          setScriptLoaded(true)
        }
      }
      script.onerror = (e) => {
        console.error('PayPal script loading error:', e)
        if (isMountedRef.current) {
          setScriptError(new Error('Failed to load PayPal script'))
        }
      }

      document.body.appendChild(script)
      scriptRef.current = script
    }

    loadScript()

    // Cleanup
    return () => {
      // Don't immediately remove the script as it might still be in use
      // In a real app, you might want to check if any other PayPal components are still active
      // before removing the script
    }
  }, [clientId, currency, scriptLoaded])

  // Main cleanup effect that runs on unmount
  useEffect(() => {
    return () => {
      try {
        // Clear containers if they still exist
        if (paypalContainerRef.current) {
          paypalContainerRef.current.innerHTML = ''
        }
        
        if (cardContainerRef.current) {
          cardContainerRef.current.innerHTML = ''
        }
        
        // Reset instance refs
        buttonsInstanceRef.current = null
        cardButtonsInstanceRef.current = null
      } catch (err) {
        console.warn('PayPal cleanup error:', err)
      }
    }
  }, [])

  // Render PayPal buttons when script is loaded
  useEffect(() => {
    // Only proceed if script is loaded and container exists
    if (!scriptLoaded || !window.paypal || !paypalContainerRef.current) return

    // Clear any existing content
    if (paypalContainerRef.current.firstChild) {
      paypalContainerRef.current.innerHTML = ''
    }

    try {
      // Create buttons with proper error handling
      const buttonOptions = {
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
            // Check if component is still mounted
            if (!isMountedRef.current) return
            
            console.log('PayPal order approved with ID:', data.orderID);
            onSuccess({
              orderId: data.orderID
            })
          } catch (err) {
            console.error('Error handling PayPal approval:', err)
            if (isMountedRef.current) {
              onError(err)
            }
          }
        },
        onCancel: () => {
          if (isMountedRef.current) {
            onCancel()
          }
        },
        onError: (err: any) => {
          console.error('PayPal button error:', err)
          if (isMountedRef.current) {
            onError(err)
          }
        }
      }
      
      // Only render if container is still in DOM
      if (document.body.contains(paypalContainerRef.current)) {
        const buttons = window.paypal.Buttons(buttonOptions)
        
        // Store instance for cleanup
        buttonsInstanceRef.current = buttons
        
        // Check if eligible to render
        if (buttons.isEligible()) {
          buttons.render(paypalContainerRef.current)
        } else {
          console.warn('PayPal buttons not eligible to render')
        }
      }
    } catch (err) {
      console.error('Error rendering PayPal buttons:', err)
      if (isMountedRef.current) {
        onError(err)
      }
    }
    
    // Cleanup this specific instance
    return () => {
      buttonsInstanceRef.current = null
    }
  }, [scriptLoaded, amount, currency, onSuccess, onError, onCancel])

  // Separately render card buttons
  useEffect(() => {
    if (!scriptLoaded || !window.paypal) return
    
    // Get container by ref instead of ID
    if (!cardContainerRef.current) return
    
    // Clear existing content
    if (cardContainerRef.current.firstChild) {
      cardContainerRef.current.innerHTML = ''
    }
    
    try {
      // Skip rendering if not mounted
      if (!isMountedRef.current) return
      
      // Only render if container is still in DOM
      if (!document.body.contains(cardContainerRef.current)) return
      
      const cardButtonOptions = {
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
            if (!isMountedRef.current) return
            
            console.log('Card payment approved with ID:', data.orderID);
            onSuccess({
              orderId: data.orderID,
              paymentSource: 'card'
            })
          } catch (err) {
            console.error('Error handling card approval:', err)
            if (isMountedRef.current) {
              onError(err)
            }
          }
        },
        onCancel: () => {
          if (isMountedRef.current) {
            onCancel()
          }
        },
        onError: (err: any) => {
          console.error('Card button error:', err)
          if (isMountedRef.current) {
            onError(err)
          }
        }
      }
      
      const cardButtons = window.paypal.Buttons(cardButtonOptions)
      
      // Store instance for cleanup
      cardButtonsInstanceRef.current = cardButtons
      
      // Only render if eligible
      if (cardButtons.isEligible()) {
        cardButtons.render(cardContainerRef.current)
      }
    } catch (err) {
      console.error('Error rendering card button:', err)
      // Don't call onError for card button failures
    }
    
    // Cleanup this specific instance
    return () => {
      cardButtonsInstanceRef.current = null
    }
  }, [scriptLoaded, amount, currency, onSuccess, onError, onCancel])

  // UI rendering
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
      <div ref={cardContainerRef} id="card-button-container" className="w-full min-h-[50px]"></div>
    </div>
  )
}