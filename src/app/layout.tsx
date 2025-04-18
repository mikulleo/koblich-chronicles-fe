import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import MainLayout from "@/components/layout/main-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Koblich Chronicles - Stock Trading Tracker",
  description: "Track your stock trades and chart patterns",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <MainLayout>
          {children}
        </MainLayout>
        <Toaster />
      </body>
    </html>
  )
}