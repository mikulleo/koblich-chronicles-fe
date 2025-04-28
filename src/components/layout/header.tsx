"use client"

import Link from "next/link"
import Image from "next/image"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background h-14">
      <div className="flex h-full items-center px-4 w-full">
        <div className="md:hidden mr-2">
          <SidebarTrigger />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden">
            {/* Replace with actual logo path - this is using the donut chart image from your example */}
            <Image 
              src="/logo.png" 
              alt="Koblich Chronicles Logo" 
              width={32} 
              height={32}
              className="object-contain"
            />
          </div>
          <Link href="/" className="font-bold text-lg">
            Koblich Chronicles
          </Link>
        </div>
        
        {/* Login button commented out for later use 
        <div className="ml-auto">
          <Button variant="outline" size="sm" asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
        */}
      </div>
    </header>
  )
}