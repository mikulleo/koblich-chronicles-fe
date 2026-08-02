'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HeartIcon } from 'lucide-react'
import { DonationForm } from './donation-form'
import { useAnalytics } from '@/hooks/use-analytics'

interface DonationDialogProps {
  /** Where this CTA lives, e.g. "header" or "footer" — lets you compare which
   *  placement actually drives donations. */
  placement?: string
}

export function DonationDialog({ placement = 'header' }: DonationDialogProps) {
  const [open, setOpen] = useState(false)
  const analytics = useAnalytics()
  const purchased = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Impression, so "clicked Donate" has a denominator.
  //
  // Tracked on actual visibility rather than on mount: this CTA sits well below
  // the fold, and counting every page load as an impression would understate
  // the click-through rate against a denominator nobody ever saw.
  useEffect(() => {
    const node = triggerRef.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      analytics.trackDonateCtaView(placement)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            analytics.trackDonateCtaView(placement)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.5 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [analytics, placement])

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (newOpen) {
        purchased.current = false
        analytics.trackDonateCtaClick(placement)
      } else if (!purchased.current) {
        // Closed without paying — records the furthest step reached.
        analytics.trackDonationAbandoned()
      }
      setOpen(newOpen)
    }}>
      <DialogTrigger asChild>
        <Button
          ref={triggerRef}
          className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600"
        >
          <HeartIcon className="mr-2 h-4 w-4" />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Donation Form</DialogTitle>
        <DonationForm
          onSuccess={() => {
            purchased.current = true
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
