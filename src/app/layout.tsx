import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import MainLayout from "@/components/layout/main-layout"

// Use Inter as our primary font - modern, clean, professional
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
})

// Use Manrope as an accent font for headings
const manrope = Manrope({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-manrope',
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
      <body className={inter.className}>
        <MainLayout>
          {children}
        </MainLayout>
        <Toaster />
      </body>
    </html>
  )
}