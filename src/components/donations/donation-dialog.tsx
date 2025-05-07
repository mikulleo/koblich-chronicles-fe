// src/donations/donation-dialog.tsx

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle className="sr-only">Donation Form</DialogTitle>
        <DonationForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}