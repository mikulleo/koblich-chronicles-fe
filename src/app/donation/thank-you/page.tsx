'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, HeartHandshake, ArrowLeft } from 'lucide-react'

export default function ThankYouPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentId')
  
  useEffect(() => {
    // You could verify the payment status here if needed
    if (paymentId) {
      console.log('Payment ID:', paymentId)
    }
  }, [paymentId])

  return (
    <div className="container max-w-lg mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader className="pb-2">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center text-2xl">Thank You for Your Support!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-6">
              Your donation to Koblich Chronicles has been received and is greatly appreciated.
              Your support helps maintain this resource and develop new features for the community.
            </p>
            
            <div className="flex justify-center mb-6">
              <HeartHandshake className="h-12 w-12 text-primary" />
            </div>
            
            <div className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Home
                </Link>
              </Button>
              
              <div className="text-sm text-muted-foreground">
                If you have any questions about your donation, feel free to reach out via Twitter.
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}