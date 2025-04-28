import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"
//import "../styles/fonts.css" // Import custom font styles
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
  weight: ['400', '500', '600', '700'], // Added specific weights for headings
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
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${inter.variable} `}> 
      <body>
        <MainLayout>
          {children}
        </MainLayout>
        <Toaster />
      </body>
    </html>
  )
}