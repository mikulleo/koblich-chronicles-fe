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
  Hash 
} from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function SidebarNav() {
  const pathname = usePathname()

  // Visual indicator to show that Trades and Statistics are related
  const isTradeSection = pathname === "/trades" || pathname === "/statistics"

  return (
    <div className="h-full py-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/" passHref>
            <SidebarMenuButton isActive={pathname === "/"} tooltip="Dashboard">
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <Link href="/charts" passHref>
            <SidebarMenuButton isActive={pathname === "/charts"} tooltip="Charts">
              <LineChart className="h-5 w-5" />
              <span>Charts</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        
        <SidebarMenuItem>
          <Link href="/tags" passHref>
            <SidebarMenuButton isActive={pathname === "/tags"} tooltip="Tags">
              <TagIcon className="h-5 w-5" />
              <span>Tags</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        
        {/* Trading section with visual grouping */}
        <div className={cn(
          "relative mt-2 mb-2 rounded-md",
          isTradeSection && "bg-secondary py-1"
        )}>
          {isTradeSection && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary ml-2"></div>
          )}
          
          <SidebarMenuItem>
            <Link href="/trades" passHref>
              <SidebarMenuButton isActive={pathname === "/trades"} tooltip="Trades">
                <ListFilter className="h-5 w-5" />
                <span>Trades</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <Link href="/statistics" passHref>
              <SidebarMenuButton isActive={pathname === "/statistics"} tooltip="Statistics">
                <BarChart3 className="h-5 w-5" />
                <span>Statistics</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </div>
        
        <SidebarMenuItem>
          <Link href="/tickers" passHref>
            <SidebarMenuButton isActive={pathname === "/tickers"} tooltip="Tickers">
              <Hash className="h-5 w-5" />
              <span>Tickers</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  )
}