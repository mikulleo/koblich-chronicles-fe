'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
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
    } else {
      document.body.classList.remove('payment-active')
    }

    return () => {
      document.body.classList.remove('payment-active')
    }
  }, [showPayment])

  return (
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
      <DialogContent 
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
  )
}