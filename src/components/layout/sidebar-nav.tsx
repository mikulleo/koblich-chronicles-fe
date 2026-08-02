"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  BarChart3,
  LineChart,
  Tag as TagIcon,
  ListFilter,
  Hash,
  Dumbbell
} from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useAnalytics } from "@/hooks/use-analytics"

export default function SidebarNav() {
  const pathname = usePathname()
  const { trackNavClick } = useAnalytics()

  // page_view tells you where people land; nav_click tells you how they chose
  // to get there, which is what makes a path exploration legible.
  const navClick = (label: string, href: string) => () =>
    trackNavClick({ label, href, source: "sidebar" })

  // Visual indicator to show that Trades and Statistics are related
  const isTradeSection = pathname === "/trades" || pathname === "/statistics"

  return (
    <div className="h-full py-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/" passHref onClick={navClick("Home", "/")}>
            <SidebarMenuButton isActive={pathname === "/"} tooltip="Home">
              <Home className="h-5 w-5" />
              <span>Home</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <Link href="/charts" passHref onClick={navClick("Charts", "/charts")}>
            <SidebarMenuButton isActive={pathname === "/charts"} tooltip="Charts">
              <LineChart className="h-5 w-5" />
              <span>Charts</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <Link href="/tags" passHref onClick={navClick("Tag Performance", "/tags")}>
            <SidebarMenuButton isActive={pathname === "/tags"} tooltip="Tag Performance">
              <TagIcon className="h-5 w-5" />
              <span>Tag Performance</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        
        {/* Trading section with visual grouping */}
        <div className={cn(
          "relative mt-2 mb-2 rounded-md transition-all",
          isTradeSection && "bg-primary/10 py-1"
        )}>
          {isTradeSection && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary ml-2 rounded-full"></div>
          )}
          
          <SidebarMenuItem>
            <Link href="/trades" passHref onClick={navClick("Trades", "/trades")}>
              <SidebarMenuButton isActive={pathname === "/trades"} tooltip="Trades">
                <ListFilter className="h-5 w-5" />
                <span>Trades</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <Link href="/statistics" passHref onClick={navClick("Statistics", "/statistics")}>
              <SidebarMenuButton isActive={pathname === "/statistics"} tooltip="Statistics">
                <BarChart3 className="h-5 w-5" />
                <span>Statistics</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </div>
        
        <SidebarMenuItem>
          <Link href="/tickers" passHref onClick={navClick("Tickers", "/tickers")}>
            <SidebarMenuButton isActive={pathname === "/tickers"} tooltip="Tickers">
              <Hash className="h-5 w-5" />
              <span>Tickers</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>

        <Separator className="my-2" />

        <SidebarMenuItem>
          <Link href="/gym" passHref onClick={navClick("Trading Gym", "/gym")}>
            <SidebarMenuButton isActive={pathname === "/gym" || pathname.startsWith("/gym/")} tooltip="Trading Gym">
              <Dumbbell className="h-5 w-5" />
              <span>Trading Gym</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  )
}