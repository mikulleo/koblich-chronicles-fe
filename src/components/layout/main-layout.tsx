"use client"

import { ReactNode } from "react"
import Header from "./header"
import SidebarNav from "./sidebar-nav"

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <aside className="hidden w-64 border-r bg-muted/40 md:block">
          <SidebarNav />
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}