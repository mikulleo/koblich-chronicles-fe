'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/providers/auth-provider'
import { Loader2, ShieldCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { countryOptions } from '@/lib/country-options'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const { login, register, forgotPassword } = useAuth()

  function resetForm() {
    setName('')
    setEmail('')
    setPassword('')
    setCountry('')
    setError('')
    setSubmitting(false)
    setForgotSent(false)
  }

  function switchMode(newMode: 'login' | 'register' | 'forgot') {
    setMode(newMode)
    setError('')
    setForgotSent(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'forgot') {
        await forgotPassword(email)
        setForgotSent(true)
      } else if (mode === 'login') {
        await login(email, password)
        toast.success('Welcome back!')
        resetForm()
        onOpenChange(false)
      } else {
        if (!name.trim()) {
          setError('Name is required')
          setSubmitting(false)
          return
        }
        if (!country) {
          setError('Please select your country')
          setSubmitting(false)
          return
        }
        await register(name.trim(), email, password, country)
        toast.success('Account created! Check your email for a welcome message.', {
          duration: 5000,
        })
        resetForm()
        onOpenChange(false)
      }
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { errors?: { message: string; data?: { errors?: { message: string }[] } }[] } } })?.response?.data
      // Payload nests field-level messages inside errors[0].data.errors[0].message
      const fieldMsg = resp?.errors?.[0]?.data?.errors?.[0]?.message
      const topMsg = resp?.errors?.[0]?.message
      const fallback = mode === 'login'
        ? 'Invalid email or password'
        : mode === 'forgot'
        ? 'Failed to send reset email. Please try again.'
        : 'Registration failed. Please try again.'
      const msg = fieldMsg || topMsg || fallback
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const title = mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'
  const description = mode === 'login'
    ? 'Sign in to access your Trading Gym features.'
    : mode === 'register'
    ? 'Create a free account to use Mental Edge and other personal tools.'
    : 'Enter your email and we\'ll send you a link to reset your password.'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {mode === 'forgot' && forgotSent ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="p-3 rounded-full bg-green-500/10">
              <Mail className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              If an account with that email exists, we&apos;ve sent a password reset link. Check your inbox.
            </p>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm text-primary underline-offset-4 hover:underline font-medium"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="auth-name">Name</Label>
                  <Input
                    id="auth-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                  />
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}

              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="auth-country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="auth-country" className="w-full">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
              </Button>

              {mode === 'register' && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border border-border/50">
                  <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    All your data is fully encrypted in our database. Your entries are private and secure — nobody can read them.
                  </p>
                </div>
              )}
            </form>

            <div className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-primary underline-offset-4 hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-primary underline-offset-4 hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
