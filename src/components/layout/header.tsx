"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Tag } from "lucide-react"

export default function Header() {
  const pathname = usePathname()
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold">
            Koblich Chronicles
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link 
                  href="/charts" 
                  className={cn(
                    navigationMenuTriggerStyle(), 
                    pathname === "/charts" && "bg-accent text-accent-foreground"
                  )}
                >
                  Charts
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/tags" legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(), 
                      "flex items-center gap-1",
                      pathname === "/tags" && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Tag className="h-4 w-4" />
                    Tags
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/trades" legacyBehavior passHref>
                  <NavigationMenuLink 
                    className={cn(
                      navigationMenuTriggerStyle(),
                      pathname === "/trades" && "bg-accent text-accent-foreground"
                    )}
                  >
                    Trades
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/statistics" legacyBehavior passHref>
                  <NavigationMenuLink 
                    className={cn(
                      navigationMenuTriggerStyle(),
                      pathname === "/statistics" && "bg-accent text-accent-foreground"
                    )}
                  >
                    Statistics
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}