// src/donations/paypal-button.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useScript } from '@/hooks/use-script'
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
  const [buttonRendered, setButtonRendered] = useState(false)
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  // Load the PayPal SDK script
  const { status: scriptStatus, error: scriptError } = useScript(
    `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`
  )

  // Render PayPal buttons after script loads
  useEffect(() => {
    if (scriptStatus !== 'ready' || buttonRendered) return

    try {
      const renderButton = async () => {
        // Clear previous buttons if they exist
        const container = document.getElementById('paypal-button-container')
        if (container) container.innerHTML = ''

        // Render the PayPal button
        
        window.paypal
          .Buttons({
            fundingSource: window.paypal.FUNDING.CARD,
            style: {
              layout: 'vertical',
              color: 'black',
              shape: 'rect',
              label: 'paypal',
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
                },
              })
            },
            onApprove: async (_data: any, actions: any) => {
              try {
                const details = await actions.order.capture()
                onSuccess(details)
              } catch (err) {
                console.error('Error capturing PayPal order:', err)
                onError(err)
              }
            },
            onCancel: () => {
              onCancel()
            },
            onError: (err: any) => {
              console.error('PayPal error:', err)
              onError(err)
            },
          })
          .render('#paypal-button-container')
          .then(() => {
            setButtonRendered(true)
          })
      }

      renderButton()
    } catch (err) {
      console.error('Error rendering PayPal button:', err)
      onError(err)
    }
  }, [scriptStatus, buttonRendered, amount, currency, onSuccess, onError, onCancel])

  // Create a hook to create PayPal script loading
  function useScript(src: string) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
      src ? 'loading' : 'idle'
    )
    const [error, setError] = useState<Error | null>(null)
  
    useEffect(() => {
      if (!src) {
        setStatus('idle')
        return
      }
  
      // Check if the script is already in the document
      let script = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement
  
      if (!script) {
        // Create script
        script = document.createElement('script')
        script.src = src
        script.async = true
        script.setAttribute('data-sdk-integration-source', 'button-factory')
        document.body.appendChild(script)
  
        // Set status state
        setStatus('loading')
  
        // Add event handlers
        script.onload = () => setStatus('ready')
        script.onerror = (err) => {
          console.error('Script loading error:', err)
          setError(new Error(`Failed to load script: ${src}`))
          setStatus('error')
        }
      } else if (script.getAttribute('data-status') === 'ready') {
        // Script is already loaded
        setStatus('ready')
      }
  
      // Cleanup function
      return () => {
        // Only remove the script if we created it
        if (script && script.getAttribute('data-status') !== 'ready') {
          document.body.removeChild(script)
        }
      }
    }, [src])
  
    return { status, error }
  }

  // Display appropriate UI based on script loading status
  if (scriptStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner className="mr-2" /> Loading PayPal...
      </div>
    )
  }

  if (scriptStatus === 'error') {
    return (
      <div className="text-destructive text-center py-4">
        Error loading PayPal. Please refresh the page or try again later.
      </div>
    )
  }

  return <div id="paypal-button-container" className="w-full min-h-[150px]"></div>
}