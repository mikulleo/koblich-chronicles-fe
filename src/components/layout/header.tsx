"use client"

import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

export default function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/90 backdrop-blur-sm h-14 shadow-sm">
      <div className="flex h-full items-center justify-between px-4 w-full">
        <div className="flex items-center gap-2">
          <div className="md:hidden mr-2">
            <SidebarTrigger />
          </div>
          <Link href="/" className="font-bold text-lg tracking-tight">
            Koblich Chronicles
          </Link>
        </div>
        
        {/* Theme toggle button */}
        <div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  )
}