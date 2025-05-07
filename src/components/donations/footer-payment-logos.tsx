// src/donaations/footer-payment-logos.tsx

import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import MainLayout from "@/components/layout/main-layout"
import BarionPixel from "@/components/donations/barion-pixel"
//import FooterPaymentSection from '@/components/layout/footer-payment-section';

// Load fonts with display: swap for better performance
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  preload: true,
})

const manrope = Manrope({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
  preload: true,
})

export const metadata: Metadata = {
  title: "Koblich Chronicles - Interactive Stock Trading Model Book",
  description: "Track and analyze real-time trades, chart patterns, and performance insights with an interactive trading model book.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${inter.variable}`}> 
      <body>
        {/* Add Barion Pixel for fraud prevention */}
        {process.env.NEXT_PUBLIC_BARION_POS_KEY && (
          <BarionPixel posKey={process.env.NEXT_PUBLIC_BARION_POS_KEY} />
        )}
        
        <MainLayout>
          {children}
        </MainLayout>
        <Toaster />
      </body>
    </html>
  )
}