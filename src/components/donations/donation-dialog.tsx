'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HeartIcon } from 'lucide-react'
import { DonationForm } from './donation-form'
import { useAnalytics } from '@/hooks/use-analytics'

export function DonationDialog() {
  const [open, setOpen] = useState(false)
  const analytics = useAnalytics()

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (newOpen) {
        analytics.trackEvent('donate_button_click')
      }
      setOpen(newOpen)
    }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600">
          <HeartIcon className="mr-2 h-4 w-4" />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Donation Form</DialogTitle>
        <DonationForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
