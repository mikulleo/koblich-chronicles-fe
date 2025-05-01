import { Suspense } from 'react'
import { ThankYouContent } from '@/components/donations/thank-you-content'

export default function ThankYouPage() {
  return (
    <div className="container mx-auto py-16">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <ThankYouContent />
      </Suspense>
    </div>
  )
}
