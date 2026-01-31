'use client'

import React, { useEffect, useRef, useState } from 'react'
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

// Track which PayPal SDK script is currently loaded (globally, since only one can exist)
let loadedPayPalCurrency: string | null = null

function usePayPalScript(currency: string, clientId: string | undefined) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    if (!clientId) {
      setStatus('error')
      return
    }

    // If PayPal SDK is already loaded for the right currency, reuse it
    if (loadedPayPalCurrency === currency && window.paypal) {
      setStatus('ready')
      return
    }

    // Remove any existing PayPal SDK script (only one instance supported)
    const existingScripts = document.querySelectorAll('script[src*="paypal.com/sdk/js"]')
    existingScripts.forEach((s) => s.remove())
    // Clear the global PayPal object so stale references don't persist
    delete window.paypal
    loadedPayPalCurrency = null

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&enable-funding=card&disable-funding=credit,paylater&components=buttons`
    script.async = true
    script.setAttribute('data-sdk-integration-source', 'button-factory')

    setStatus('loading')

    const handleLoad = () => {
      loadedPayPalCurrency = currency
      setStatus('ready')
    }
    const handleError = () => {
      loadedPayPalCurrency = null
      setStatus('error')
    }

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)
    document.body.appendChild(script)

    return () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
  }, [currency, clientId])

  return status
}

export default function PayPalButton({
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonsInstanceRef = useRef<any>(null)

  // Use refs for callbacks to avoid re-rendering PayPal buttons when parent re-renders
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const onCancelRef = useRef(onCancel)
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError
  onCancelRef.current = onCancel

  const scriptStatus = usePayPalScript(currency, clientId)

  // Render PayPal buttons when SDK is ready
  useEffect(() => {
    if (scriptStatus !== 'ready' || !window.paypal || !containerRef.current) return

    // Clear previous buttons
    if (buttonsInstanceRef.current) {
      buttonsInstanceRef.current.close?.()
      buttonsInstanceRef.current = null
    }
    containerRef.current.innerHTML = ''

    const buttons = window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'donate',
        tagline: false,
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
          onSuccessRef.current(details)
        } catch (err) {
          console.error('Error capturing PayPal order:', err)
          onErrorRef.current(err)
        }
      },
      onCancel: () => {
        onCancelRef.current()
      },
      onError: (err: any) => {
        console.error('PayPal error:', err)
        onErrorRef.current(err)
      },
    })

    buttonsInstanceRef.current = buttons

    buttons.render(containerRef.current).catch((err: any) => {
      // Ignore render errors if component unmounted (container removed)
      if (containerRef.current) {
        console.error('Error rendering PayPal buttons:', err)
        onErrorRef.current(err)
      }
    })

    return () => {
      buttons.close?.()
      buttonsInstanceRef.current = null
    }
  }, [scriptStatus, amount, currency])

  if (!clientId) {
    return (
      <div className="text-destructive text-center py-4">
        Payment system is not configured. Please contact support.
      </div>
    )
  }

  if (scriptStatus === 'loading' || scriptStatus === 'idle') {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner className="mr-2" /> Loading payment options...
      </div>
    )
  }

  if (scriptStatus === 'error') {
    return (
      <div className="text-destructive text-center py-4">
        Error loading payment system. Please refresh the page or try again later.
      </div>
    )
  }

  return <div ref={containerRef} className="w-full min-h-[200px]" />
}
