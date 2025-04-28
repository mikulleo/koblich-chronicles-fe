"use client"

import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background h-14">
      <div className="flex h-full items-center px-4 w-full">
        <div className="md:hidden mr-2">
          <SidebarTrigger />
        </div>
        <div className="flex items-center">
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