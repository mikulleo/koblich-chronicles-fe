"use client"

import React, { useState } from "react"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoonIcon, SunIcon, User, LogOut, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/providers/auth-provider"
import { AuthModal } from "@/components/auth/auth-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export default function Header() {
  const { theme, setTheme } = useTheme()
  const { user, loading, logout, deleteAccount } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-card/90 backdrop-blur-sm h-14 shadow-sm">
        <div className="flex h-full items-center justify-between px-4 w-full">
          <div className="flex items-center gap-2">
            <div className="md:hidden mr-2">
              <SidebarTrigger />
            </div>
            <Link href="/" className="font-semibold text-lg tracking-tight font-manrope text-primary">
              Koblich Chronicles
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle button */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </Button>

            {/* Auth */}
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <span className="hidden sm:inline text-sm max-w-[120px] truncate">
                        {user.name || user.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-sm">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)} className="gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data (check-ins, journals, discipline logs). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault()
                setDeleting(true)
                try {
                  await deleteAccount()
                  toast.success("Account deleted successfully.")
                  setDeleteOpen(false)
                } catch {
                  toast.error("Failed to delete account. Please try again.")
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {deleting ? "Deleting..." : "Yes, delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
