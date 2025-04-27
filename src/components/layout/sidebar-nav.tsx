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

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

export default function SidebarNav() {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "Charts",
      href: "/charts",
      icon: <LineChart className="h-5 w-5" />,
    },
    {
      title: "Tags",
      href: "/tags",
      icon: <TagIcon className="h-5 w-5" />,
    },
    {
      title: "Trades",
      href: "/trades",
      icon: <ListFilter className="h-5 w-5" />,
    },
    {
      title: "Statistics",
      href: "/statistics",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: "Tickers",
      href: "/tickers",
      icon: <Hash className="h-5 w-5" />,
    }
  ]

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Navigation
      </div>
      <nav className="grid gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span>{item.title}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}