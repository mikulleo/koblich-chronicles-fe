"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
  icon?: string
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: "home",
  },
  {
    title: "Charts",
    href: "/charts",
    icon: "chart",
  },
  {
    title: "Trades",
    href: "/trades",
    icon: "trade",
  },
  {
    title: "Statistics",
    href: "/statistics",
    icon: "stats",
  },
  {
    title: "Tickers",
    href: "/tickers",
    icon: "ticker",
  },
  {
    title: "Tags",
    href: "/tags",
    icon: "tag",
  },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Navigation
      </div>
      <nav className="grid gap-1">
        {navItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <span>{item.icon}</span>
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}