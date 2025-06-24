"use client"

import { ReactNode } from "react"
import Header from "./header"
import SidebarNav from "./sidebar-nav"
import { FooterComponent } from "./footer-component"

import { 
  Sidebar, 
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarProvider,
  SidebarFooter
} from "@/components/ui/sidebar"

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar variant="inset">
            <SidebarHeader className="border-b">
              <div className="flex items-center justify-between p-2">
                <span className="font-medium text-foreground">Navigation</span>
                <SidebarTrigger />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarNav />
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
              <div className="text-xs text-muted-foreground">
                Koblich Chronicles v1.0
              </div>
            </SidebarFooter>
          </Sidebar>
          <main className="flex-1 p-4 md:p-6 overflow-auto bg-background transition-all">
            <div className="max-w-8xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <FooterComponent />
      </div>
    </SidebarProvider>
    
  )
}