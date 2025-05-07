// src/donations/thank-you-content.tsx

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, HeartHandshake, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PaymentMethodLogos from '@/components/donations/payment-method-logos'
import apiClient from '@/lib/api/client'

export function ThankYouContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [donationDetails, setDonationDetails] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      console.log('Order ID:', orderId)
      
      // Get donation details if needed
      /*
      const fetchDonationDetails = async () => {
        try {
          // Fix the URL - remove the duplicate /api/
          const response = await apiClient.get(`/paypal-capture?orderId=${orderId}`)
          if (response.data.success) {
            setDonationDetails(response.data)
          }
        } catch (error) {
          console.error('Error fetching donation details:', error)
        }
      }
      
      fetchDonationDetails()*/
    }
  }, [orderId])

  return (
    // Rest of your component remains the same
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="text-center">
        {/* Card content remains the same */}
        <CardHeader>
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 rounded-full p-4">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Thank You for Your Support!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg">
            Your donation to Koblich Chronicles has been received and is greatly appreciated.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <HeartHandshake className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              100% of your donation goes towards maintaining and improving Koblich Chronicles.
            </p>
          </div>
          <div className="mt-6">
            <PaymentMethodLogos size="small" />
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            If you have any questions about your donation, feel free to reach out via Twitter.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}