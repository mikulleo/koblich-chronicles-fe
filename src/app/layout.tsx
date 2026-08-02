// src/app/layout.tsx
import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import MainLayout from "@/components/layout/main-layout"
import AnalyticsProvider from "@/providers/AnalyticsProvider"
import { ThemeProvider } from "@/providers/ThemeProviders"
import { PrefetchInitializer } from "@/components/prefetch-initializer"
import { AuthProvider } from "@/providers/auth-provider"

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

  // GA4 is loaded directly via gtag.js inside AnalyticsProvider, which gates it
  // on consent. Google Tag Manager used to be mounted here as well; it was
  // removed because a GA4 config tag inside the container double-counts every
  // page view, and it bypassed the consent gate entirely.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <AnalyticsProvider gaMeasurementId={gaMeasurementId}>
              <MainLayout>
                {children}
              </MainLayout>
              <PrefetchInitializer />
              <Toaster />
            </AnalyticsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}