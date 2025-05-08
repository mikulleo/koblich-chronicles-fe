'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HeartIcon } from 'lucide-react'
import { DonationForm } from './donation-form'

export function DonationDialog() {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600">
          <HeartIcon className="mr-2 h-4 w-4" />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto" 
        // Higher z-index to ensure payment UI is properly displayed
        style={{ zIndex: 1000 }}
        // Reduce animation to prevent conflicts with payment interface
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking inside payment interface iframe
          if (e.target instanceof HTMLElement && 
              (e.target.closest('iframe') || 
               e.target.closest('[data-paypal-button]'))) {
            e.preventDefault()
          }
        }}
      >
        <DialogTitle className="sr-only">Donation Form</DialogTitle>
        <DonationForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}