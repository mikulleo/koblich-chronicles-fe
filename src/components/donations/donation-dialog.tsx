'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogOverlay } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HeartIcon } from 'lucide-react'
import { DonationForm } from './donation-form'

export function DonationDialog() {
  const [open, setOpen] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    setShowPayment(false)
  }

  // When payment is about to be shown
  const handleShowPayment = () => {
    setShowPayment(true)
  }

  // When returning from payment section back to form
  const handleHidePayment = () => {
    setShowPayment(false)
  }

  // Apply CSS fix for iframe interaction when payment is shown
  useEffect(() => {
    if (showPayment) {
      // Add a class to the body to prevent background scrolling
      document.body.classList.add('payment-active')
      
      // Optional: Focus trap inside the dialog
      const dialog = document.querySelector('[role="dialog"]')
      if (dialog) {
        dialog.setAttribute('aria-modal', 'true')
      }
    } else {
      document.body.classList.remove('payment-active')
    }

    return () => {
      document.body.classList.remove('payment-active')
    }
  }, [showPayment])

  return (
    <>
      {/* Add global styles for fixing iframe interaction */}
      <style jsx global>{`
        /* Payment mode specific styles */
        body.payment-active [data-paypal-button],
        body.payment-active iframe {
          z-index: 2147483647 !important; /* Maximum possible z-index */
          position: relative !important;
          pointer-events: auto !important;
        }

        /* Ensure dialog has higher z-index than other page elements */
        [data-dialog-overlay] {
          z-index: 1000 !important;
        }
        
        [data-dialog-content] {
          z-index: 1001 !important;
        }
        
        /* When payment is active, add a special overlay */
        body.payment-active::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.01);
          pointer-events: none;
          z-index: 1050;
        }
      `}</style>

      <Dialog open={open} onOpenChange={(newOpen) => {
        // Only allow closing if we're not in payment mode
        if (showPayment && !newOpen) {
          // Prevent closing while in payment mode
          return
        }
        setOpen(newOpen)
        if (!newOpen) {
          setShowPayment(false)
        }
      }}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600">
            <HeartIcon className="mr-2 h-4 w-4" />
            Donate
          </Button>
        </DialogTrigger>
        <DialogOverlay data-dialog-overlay />
        <DialogContent 
          data-dialog-content
          className={`sm:max-w-[425px] max-h-[85vh] overflow-y-auto ${showPayment ? 'payment-mode' : ''}`}
          onInteractOutside={(e) => {
            // Prevent closing when in payment mode
            if (showPayment) {
              e.preventDefault()
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing on Escape when in payment mode
            if (showPayment) {
              e.preventDefault()
            }
          }}
        >
          <DialogTitle className="sr-only">Donation Form</DialogTitle>
          <DonationForm 
            onSuccess={handleSuccess} 
            onShowPayment={handleShowPayment}
            onHidePayment={handleHidePayment}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}