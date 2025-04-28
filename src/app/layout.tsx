import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"
import "../styles/fonts.css" // Import custom font styles
import { Toaster } from "@/components/ui/sonner"
import MainLayout from "@/components/layout/main-layout"

// Load fonts with display: swap for better performance
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'], // Added specific weights for better control
  preload: true, // Ensure preloading
})

const manrope = Manrope({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['500', '600', '700', '800'], // Added specific weights for headings
  preload: true, // Ensure preloading
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${manrope.variable}`}>
      <head>
        {/* Force font loading with high priority */}
        <link rel="preload" href={inter.style.src} as="style" />
        <link rel="preload" href={manrope.style.src} as="style" />
        <style>
          {`
            /* Force font application immediately */
            html {
              font-family: ${inter.style.fontFamily}, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            h1, h2, h3, h4, h5, h6 {
              font-family: ${manrope.style.fontFamily}, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
          `}
        </style>
      </head>
      <body className={inter.className}>
        <MainLayout>
          {children}
        </MainLayout>
        <Toaster />
      </body>
    </html>
  )
}