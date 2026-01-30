// src/app/layout.tsx
import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import MainLayout from "@/components/layout/main-layout"
import AnalyticsProvider from "@/providers/AnalyticsProvider"
import { ThemeProvider } from "@/providers/ThemeProviders"
import { GoogleTagManager } from '@next/third-parties/google'

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
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
  
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Add GTM script here. It fetches the original inline script after hydration. */}
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <body className={inter.className}>
        <ThemeProvider>
          <AnalyticsProvider gaMeasurementId={gaMeasurementId}>
            <MainLayout>
              {children}
            </MainLayout>
            <Toaster />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}