'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dumbbell, FlaskConical, TrendingUp, TrendingDown, Calendar, Search,
  Play, Layers, Eye, MousePointerClick, BarChart3, ChevronDown, ChevronUp,
  ArrowLeft, Brain, Crosshair, Loader2, ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client'
import type { Trade, Ticker } from '@/lib/types'
import TradeReplayPlayer from '@/components/trade-replay/TradeReplayPlayer'
import { MentalEdge } from '@/components/mental-edge/MentalEdge'
import { useAnalytics } from '@/hooks/use-analytics'
import { useAuth } from '@/providers/auth-provider'
import { countryOptions } from '@/lib/country-options'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface TradeCard {
  id: string
  symbol: string
  type: 'long' | 'short'
  sector: string
  month: string
  year: string
  entryDate: string
  addonCount: number
}

type ActiveSection = null | 'replay' | 'mindset'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getMonth(dateStr: string): string {
  try { return MONTHS[new Date(dateStr).getMonth()] } catch { return '' }
}

function getYear(dateStr: string): string {
  try { return new Date(dateStr).getFullYear().toString() } catch { return '' }
}

/* ------------------------------------------------------------------ */
/* Add-on detection                                                     */
/* ------------------------------------------------------------------ */

function getLastExitDate(trade: Trade): number | null {
  if (!trade.exits || trade.exits.length === 0) return null
  let latest = 0
  for (const exit of trade.exits) {
    const t = new Date(exit.date).getTime()
    if (t > latest) latest = t
  }
  return latest || null
}

function detectAddons(trades: Trade[]): { addonIds: Set<string>; addonCounts: Map<string, number> } {
  const addonIds = new Set<string>()
  const addonCounts = new Map<string, number>()

  const groups = new Map<string, Trade[]>()
  for (const t of trades) {
    const tickerId = typeof t.ticker === 'object' ? (t.ticker as Ticker).id : String(t.ticker)
    const key = `${tickerId}__${t.type}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue
    group.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())

    for (let i = 0; i < group.length; i++) {
      const parent = group[i]
      if (addonIds.has(parent.id)) continue

      const lastExit = getLastExitDate(parent)
      if (!lastExit) continue

      for (let j = i + 1; j < group.length; j++) {
        const candidate = group[j]
        if (addonIds.has(candidate.id)) continue

        if (new Date(candidate.entryDate).getTime() <= lastExit) {
          addonIds.add(candidate.id)
          addonCounts.set(parent.id, (addonCounts.get(parent.id) || 0) + 1)
        }
      }
    }
  }

  return { addonIds, addonCounts }
}

/* ------------------------------------------------------------------ */
/* Decorative chart path per symbol                                     */
/* ------------------------------------------------------------------ */

function generateChartPath(symbol: string): string {
  let h = 0
  for (let i = 0; i < symbol.length; i++) {
    h = ((h << 5) - h) + symbol.charCodeAt(i)
    h |= 0
  }
  h = Math.abs(h)

  const pts: number[] = []
  let seed = h
  for (let i = 0; i < 10; i++) {
    seed = (seed * 16807) % 2147483647
    pts.push(12 + (seed % 26))
  }

  return pts
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${((i / (pts.length - 1)) * 180).toFixed(1)},${y}`)
    .join(' ')
}

/* ------------------------------------------------------------------ */
/* Full-screen Gym Entrance (unauthenticated)                           */
/* ------------------------------------------------------------------ */

function GymLockedLanding() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [doorsOpen, setDoorsOpen] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const { login, register, forgotPassword } = useAuth()

  async function handleDoorPush() {
    setError('')

    if (mode === 'forgot') {
      if (!email) {
        setError('Enter your email in the panel below first')
        return
      }
      setSubmitting(true)
      try {
        await forgotPassword(email)
        setForgotSent(true)
      } catch {
        setError('Failed to send reset email. Please try again.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!email || !password) {
      setError('Enter your credentials in the panel below first')
      return
    }
    if (mode === 'register' && !name.trim()) {
      setError('Enter your name in the panel below first')
      return
    }
    if (mode === 'register' && !country) {
      setError('Please select your country in the panel below')
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'login') {
        setDoorsOpen(true)
        await login(email, password)
      } else {
        setDoorsOpen(true)
        await register(name.trim(), email, password, country)
      }
    } catch (err: unknown) {
      setDoorsOpen(false)
      const resp = (err as { response?: { data?: { errors?: { message: string; data?: { errors?: { message: string }[] } }[] } } })?.response?.data
      const fieldMsg = resp?.errors?.[0]?.data?.errors?.[0]?.message
      const topMsg = resp?.errors?.[0]?.message
      const fallback = mode === 'login'
        ? 'Invalid email or password'
        : 'Registration failed. Please try again.'
      setError(fieldMsg || topMsg || fallback)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors'

  const handleVariants = {
    idle: {
      boxShadow: [
        '0 0 6px 1px rgba(168,85,247,0.2)',
        '0 0 18px 3px rgba(168,85,247,0.5)',
        '0 0 6px 1px rgba(168,85,247,0.2)',
      ],
    },
    open: { boxShadow: '0 0 0px 0px rgba(168,85,247,0)' },
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ perspective: '1200px' }}>
      {/* Gym interior behind the doors */}
      <img src="/gym/gym-dark3.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40" />

      {/* ═══ CINEMATIC PHOTO BACKDROP ═══ */}
      <div className="absolute inset-0 z-[5]">
        <img src="/gym/gym-dark5.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-purple-500/[0.08] rounded-full blur-[120px]" />
        <div className="absolute bottom-[15%] right-[10%] w-[400px] h-[400px] bg-emerald-500/[0.06] rounded-full blur-[100px]" />
      </div>

      {/* ═══ GLASS DOORS — with interactive handles ═══ */}
      <div className="absolute inset-0 z-10 flex" style={{ perspective: '1200px' }}>
        {/* Left door */}
        <motion.div
          className="relative w-1/2 h-full origin-left"
          animate={{ rotateY: doorsOpen ? -105 : 0 }}
          transition={{ duration: 3.2, ease: [0.76, 0, 0.24, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 bg-[#0a0a14]/40" />
          <div className="absolute inset-4 sm:inset-8 border border-white/[0.06] rounded-sm flex flex-col items-center justify-between py-12">
            <div className="w-[65%] h-[28%] rounded-sm border border-white/[0.1] bg-white/[0.03] backdrop-blur-[2px] overflow-hidden relative">
              <img src="/gym/gym-dark3.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            </div>
            <div className="w-[65%] h-[28%] rounded-sm border border-white/[0.06] bg-white/[0.02]" />
          </div>
          {/* Interactive handle */}
          <div
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 cursor-pointer group z-20"
            onClick={handleDoorPush}
            role="button"
            tabIndex={0}
            aria-label="Push door to enter"
            onKeyDown={(e) => e.key === 'Enter' && handleDoorPush()}
          >
            <motion.div
              className="gym-door-handle w-[14px] h-36 rounded-sm"
              variants={handleVariants}
              animate={doorsOpen ? 'open' : 'idle'}
              whileHover={{ boxShadow: '0 0 24px 5px rgba(168,85,247,0.75)', scaleX: 1.15 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-[10px] text-white/30 group-hover:text-purple-300 uppercase tracking-[0.25em] transition-colors font-medium">
              PUSH
            </span>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-purple-400/10 via-purple-400/25 to-purple-400/10" />
        </motion.div>

        {/* Right door */}
        <motion.div
          className="relative w-1/2 h-full origin-right"
          animate={{ rotateY: doorsOpen ? 105 : 0 }}
          transition={{ duration: 3.2, ease: [0.76, 0, 0.24, 1], delay: doorsOpen ? 0.05 : 0 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 bg-[#0a0a14]/40" />
          <div className="absolute inset-4 sm:inset-8 border border-white/[0.06] rounded-sm flex flex-col items-center justify-between py-12">
            <div className="w-[65%] h-[28%] rounded-sm border border-white/[0.1] bg-white/[0.03] backdrop-blur-[2px] overflow-hidden relative">
              <img src="/gym/gym-dark3.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            </div>
            <div className="w-[65%] h-[28%] rounded-sm border border-white/[0.06] bg-white/[0.02]" />
          </div>
          {/* Interactive handle */}
          <div
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 cursor-pointer group z-20"
            onClick={handleDoorPush}
            role="button"
            tabIndex={0}
            aria-label="Push door to enter"
            onKeyDown={(e) => e.key === 'Enter' && handleDoorPush()}
          >
            <motion.div
              className="gym-door-handle w-[14px] h-36 rounded-sm"
              variants={handleVariants}
              animate={doorsOpen ? 'open' : 'idle'}
              whileHover={{ boxShadow: '0 0 24px 5px rgba(168,85,247,0.75)', scaleX: 1.15 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-[10px] text-white/30 group-hover:text-purple-300 uppercase tracking-[0.25em] transition-colors font-medium">
              PUSH
            </span>
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-purple-400/10 via-purple-400/25 to-purple-400/10" />
        </motion.div>
      </div>

      {/* ═══ HEADER — fully visible, never covered ═══ */}
      <motion.div
        className="absolute top-3 sm:top-6 left-0 right-0 z-20 flex flex-col items-center pointer-events-none"
        animate={{ opacity: doorsOpen ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-center"
        >
          <h1 className="gym-neon-text text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none">
            TRADING
          </h1>
          <h1 className="gym-neon-text text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none -mt-1 sm:-mt-3">
            GYM
          </h1>
          <p className="text-purple-200/60 text-sm sm:text-lg md:text-xl mt-2 sm:mt-4 font-semibold tracking-wide px-4">
            Sharpen your edge — train your reads and strengthen your mindset
          </p>
        </motion.div>
        <motion.div
          className="flex flex-wrap justify-center gap-2 mt-3 sm:mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          {[
            { icon: <Crosshair className="h-3.5 w-3.5" />, label: 'Trade Replay' },
            { icon: <Brain className="h-3.5 w-3.5" />, label: 'Mental Edge' },
            { icon: <Eye className="h-3.5 w-3.5" />, label: 'Think Along' },
            { icon: <BarChart3 className="h-3.5 w-3.5" />, label: 'Discipline' },
          ].map((f) => (
            <span key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-black/30 backdrop-blur-sm text-xs text-white/40">
              {f.icon}{f.label}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* ═══ BOTTOM CREDENTIAL STRIP ═══ */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-30"
        animate={{ opacity: doorsOpen ? 0 : 1, y: doorsOpen ? 16 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="bg-black/75 backdrop-blur-xl border-t border-white/[0.08] px-4 sm:px-8 py-4">
          {/* Back link + mode toggle */}
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-white/25 hover:text-white/60 transition-colors text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to site
            </Link>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-white/30">
                {mode === 'forgot' ? '' : mode === 'login' ? 'No account?' : 'Have an account?'}
              </span>
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setForgotSent(false) }}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {mode === 'forgot' ? 'Back to sign in' : mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>

          {mode === 'forgot' && forgotSent ? (
            <div className="text-center py-2">
              <p className="text-sm text-green-400">Reset link sent! Check your inbox.</p>
              <p className="text-xs text-white/30 mt-1">If an account with that email exists, you&apos;ll receive a password reset link.</p>
            </div>
          ) : (
            <>
              {/* Inputs — horizontal on sm+, stacked on mobile */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleDoorPush() }}
                className="grid gap-2 grid-cols-1 sm:grid-cols-2"
              >
                {mode === 'register' && (
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className={inputCls}
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={cn(inputCls, mode === 'forgot' && 'sm:col-span-2')}
                />
                {mode !== 'forgot' && (
                  <input
                    type="password"
                    placeholder="Password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={6}
                    className={inputCls}
                  />
                )}
                {mode === 'register' && (
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={cn(inputCls, !country && 'text-white/25')}
                  >
                    <option value="" disabled>Select your country</option>
                    {countryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
                {/* Hidden submit so pressing Enter in a field still works */}
                <button type="submit" className="hidden" aria-hidden="true" />
              </form>

              {mode === 'login' && (
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError('') }}
                    className="text-[11px] text-white/25 hover:text-purple-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

          <p className="text-center text-[11px] text-white/20 mt-3 tracking-wider select-none">
            {submitting ? (
              <span className="flex items-center justify-center gap-1.5 text-purple-300/50">
                <Loader2 className="h-3 w-3 animate-spin" />
                {mode === 'forgot' ? 'Sending reset link…' : 'Opening the doors…'}
              </span>
            ) : mode === 'forgot' ? (
              '↑  Push a door handle to send the reset link  ↑'
            ) : (
              '↑  Push the door handles above to enter  ↑'
            )}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Gym Hub — immersive 3D gym interior (authenticated)                  */
/* ------------------------------------------------------------------ */

function GymHub({ onSelect, showWelcome }: { onSelect: (section: ActiveSection) => void; showWelcome?: boolean }) {
  const [entered, setEntered] = useState(false)
  const [welcomeVisible, setWelcomeVisible] = useState(!!showWelcome)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 200)
    return () => clearTimeout(t)
  }, [])

  // Auto-dismiss the welcome overlay
  useEffect(() => {
    if (!welcomeVisible) return
    const t = setTimeout(() => setWelcomeVisible(false), 3500)
    return () => clearTimeout(t)
  }, [welcomeVisible])

  function handleMouseMove(e: React.MouseEvent) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setMousePos({ x, y })
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[calc(100vh-6rem)] overflow-hidden"
    >
      {/* ═══ WELCOME OVERLAY ═══ */}
      <AnimatePresence>
        {welcomeVisible && (
          <motion.div
            key="welcome-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative text-center"
            >
              <motion.div
                animate={{
                  textShadow: [
                    '0 0 20px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.15)',
                    '0 0 40px rgba(168,85,247,0.6), 0 0 100px rgba(168,85,247,0.3)',
                    '0 0 20px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.15)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <p className="text-purple-300/80 text-lg sm:text-xl font-semibold tracking-widest uppercase mb-2">
                  Welcome to the
                </p>
                <h1 className="gym-neon-text text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter leading-none">
                  GYM
                </h1>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.6, duration: 1.5, ease: 'easeOut' }}
                className="h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto mt-4"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="text-white/40 text-sm mt-4 tracking-wider"
              >
                Pick a station and start training
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 3D GYM ROOM ═══ */}
      <div className="absolute inset-0 gym-room overflow-hidden">
        {/* Back wall — gym interior photo */}
        <div className="absolute inset-0">
          <motion.img
            src="/gym/gym-dark3.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ scale: 1.15 }}
            animate={{
              x: mousePos.x * -20,
              y: mousePos.y * -12,
            }}
            transition={{ type: 'spring', stiffness: 40, damping: 30 }}
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Floor — perspective grid receding into distance */}
        <div className="absolute bottom-0 left-0 right-0 h-[55%]" style={{ perspective: '600px' }}>
          <motion.div
            className="absolute inset-0 gym-floor"
            animate={{
              backgroundPositionX: `${mousePos.x * -15}px`,
            }}
            transition={{ type: 'spring', stiffness: 40, damping: 30 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1629] via-transparent to-transparent" />
        </div>

        {/* Ceiling — dark with light strips */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#06060f] to-transparent">
          {/* Overhead neon lights */}
          <div className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-purple-500/20 gym-overhead-light" />
          <div className="absolute bottom-0 left-[15%] right-[15%] h-8 bg-gradient-to-b from-purple-500/[0.03] to-transparent" />
        </div>

        {/* Side wall gradients for depth */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#06060f] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#06060f] to-transparent" />

        {/* Atmospheric light leaks */}
        <div className="absolute top-[15%] right-[15%] w-72 h-72 bg-purple-500/[0.06] rounded-full blur-[100px]" />
        <div className="absolute bottom-[30%] left-[10%] w-64 h-64 bg-emerald-500/[0.04] rounded-full blur-[80px]" />
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-96 h-48 bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* ═══ CONTENT LAYER ═══ */}
      <div className="relative z-10 flex flex-col min-h-[calc(100vh-6rem)]">
        {/* Header */}
        <motion.div
          className="pt-4 pb-4 px-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: entered ? 1 : 0, y: entered ? 0 : -20 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 ring-1 ring-purple-500/30 backdrop-blur-sm">
                <Dumbbell className="h-6 w-6 text-purple-300" />
              </div>
              <div>
                <h1 className="gym-neon-text text-3xl sm:text-4xl font-black tracking-tight">
                  TRADING GYM
                </h1>
                <p className="text-xs text-purple-200/40 font-medium">
                  You&apos;re inside — pick a station
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm">
              <FlaskConical className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">Beta</span>
            </div>
          </div>

          {/* Experimental notice banner */}
          <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] backdrop-blur-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <FlaskConical className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-300">Experimental — Work in Progress</span>
            </div>
            <span className="hidden sm:block text-yellow-500/40 text-sm">·</span>
            <p className="text-xs text-yellow-200/50 leading-relaxed">
              Things may not work perfectly yet. For now it&apos;s a <span className="text-yellow-300/80 font-semibold">free trial</span> — explore, test, and share your feedback. This will become a <span className="text-yellow-300/80 font-semibold">paid feature</span> once out of beta.
            </p>
          </div>
        </motion.div>

        {/* ═══ WORKOUT STATIONS — positioned in 3D space ═══ */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="w-full max-w-5xl" style={{ perspective: '1000px' }}>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{
                rotateX: mousePos.y * -1.5,
                rotateY: mousePos.x * 2.5,
              }}
              transition={{ type: 'spring', stiffness: 60, damping: 30 }}
            >
              {/* ── Trade Replay Station ── */}
              <motion.button
                initial={{ opacity: 0, y: 60, rotateX: 15 }}
                animate={{
                  opacity: entered ? 1 : 0,
                  y: entered ? 0 : 60,
                  rotateX: entered ? 0 : 15,
                }}
                transition={{ delay: 0.7, duration: 0.8, type: 'spring' }}
                whileHover={{ z: 40, scale: 1.03, rotateY: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect('replay')}
                className="group relative text-left overflow-hidden rounded-2xl h-96 md:h-[28rem] transition-shadow duration-500 hover:shadow-[0_0_60px_rgba(52,211,153,0.15)]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Photo with parallax */}
                <motion.img
                  src="/gym/gym-weights.jpg"
                  alt="Boxing heavy bag training"
                  className="absolute inset-0 w-full h-full object-cover grayscale"
                  animate={{ scale: 1.12, x: mousePos.x * -6, y: mousePos.y * -4 }}
                  transition={{ type: 'spring', stiffness: 40, damping: 30 }}
                />
                {/* Dark overlay with color on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 group-hover:from-black/80 group-hover:via-emerald-950/30 transition-all duration-700" />
                {/* Border glow */}
                <div className="absolute inset-0 rounded-2xl border border-white/[0.06] group-hover:border-emerald-500/30 transition-colors duration-500" />
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: 'inset 0 0 40px rgba(52,211,153,0.1)' }} />

                {/* Station label — like a sign on the wall */}
                <div className="absolute top-4 left-4 px-3 py-1 rounded bg-black/50 backdrop-blur-sm border border-emerald-500/20">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-[0.25em]">Station 01</span>
                </div>

                <div className="relative h-full flex flex-col justify-end p-6" style={{ transform: 'translateZ(25px)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30 backdrop-blur-sm group-hover:bg-emerald-500/30 group-hover:ring-emerald-400/50 transition-all">
                      <Crosshair className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">Trade Replay</h2>
                      <p className="text-xs text-white/30 font-semibold uppercase tracking-[0.2em]">Heavy Lifting Zone</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/45 leading-relaxed mb-4">
                    Replay real trades candle-by-candle. Make your own entry, sizing, and exit calls — then compare.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-emerald-400/50" /> Watch</span>
                    <span className="flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5 text-emerald-400/50" /> Decide</span>
                    <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5 text-emerald-400/50" /> Compare</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                    <Play className="h-3.5 w-3.5 fill-emerald-400" /> Walk to Station
                  </div>
                </div>
              </motion.button>

              {/* ── Mental Edge Station ── */}
              <motion.button
                initial={{ opacity: 0, y: 60, rotateX: 15 }}
                animate={{
                  opacity: entered ? 1 : 0,
                  y: entered ? 0 : 60,
                  rotateX: entered ? 0 : 15,
                }}
                transition={{ delay: 0.9, duration: 0.8, type: 'spring' }}
                whileHover={{ z: 40, scale: 1.03, rotateY: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect('mindset')}
                className="group relative text-left overflow-hidden rounded-2xl h-96 md:h-[28rem] transition-shadow duration-500 hover:shadow-[0_0_60px_rgba(34,211,238,0.15)]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <motion.img
                  src="/gym/gym-mind.jpg"
                  alt="Solitary meditation in gym"
                  className="absolute inset-0 w-full h-full object-cover grayscale"
                  animate={{ scale: 1.12, x: mousePos.x * -6, y: mousePos.y * -4 }}
                  transition={{ type: 'spring', stiffness: 40, damping: 30 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 group-hover:from-black/80 group-hover:via-cyan-950/30 transition-all duration-700" />
                <div className="absolute inset-0 rounded-2xl border border-white/[0.06] group-hover:border-cyan-500/30 transition-colors duration-500" />
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: 'inset 0 0 40px rgba(34,211,238,0.1)' }} />

                <div className="absolute top-4 left-4 px-3 py-1 rounded bg-black/50 backdrop-blur-sm border border-cyan-500/20">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-[0.25em]">Station 02</span>
                </div>

                <div className="relative h-full flex flex-col justify-end p-6" style={{ transform: 'translateZ(25px)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 ring-1 ring-cyan-500/30 backdrop-blur-sm group-hover:bg-cyan-500/30 group-hover:ring-cyan-400/50 transition-all">
                      <Brain className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-cyan-400 transition-colors">Mental Edge</h2>
                      <p className="text-xs text-white/30 font-semibold uppercase tracking-[0.2em]">Mind & Body Zone</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/45 leading-relaxed mb-4">
                    Track your psychology, journal your mindset, identify emotional traps, build discipline.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-white/30 flex-wrap">
                    <span className="flex items-center gap-1"><Brain className="h-3.5 w-3.5 text-cyan-400/50" /> Check-in</span>
                    <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-cyan-400/50" /> Insights</span>
                    <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5 text-cyan-400/50" /> Discipline</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-cyan-400 font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                    <Play className="h-3.5 w-3.5 fill-cyan-400" /> Walk to Station
                  </div>
                </div>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Trade Replay Section (original trade grid)                           */
/* ------------------------------------------------------------------ */

function TradeReplaySection({ onBack, onSelectTrade }: { onBack: () => void; onSelectTrade: (tradeId: string) => void }) {
  const [trades, setTrades] = useState<TradeCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const { trackEvent } = useAnalytics()

  useEffect(() => {
    async function fetchTrades() {
      try {
        const { data } = await apiClient.get('/trades', {
          params: { limit: 1000, depth: 1 },
        })
        const docs: Trade[] = data?.docs ?? []
        const closed = docs.filter((t) => t.status === 'closed')

        const { addonIds, addonCounts } = detectAddons(closed)

        const cards: TradeCard[] = closed
          .filter((t) => !addonIds.has(t.id))
          .map((t) => {
            const ticker = typeof t.ticker === 'object' ? (t.ticker as Ticker) : null
            const symbol = ticker?.symbol ?? (typeof t.ticker === 'string' ? t.ticker : '?')
            const sector = ticker?.sector ?? ''
            return {
              id: t.id,
              symbol,
              type: t.type,
              sector,
              month: getMonth(t.entryDate),
              year: getYear(t.entryDate),
              entryDate: t.entryDate,
              addonCount: addonCounts.get(t.id) || 0,
            }
          })
          .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())

        setTrades(cards)
      } catch (e) {
        console.error('Failed to fetch trades:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchTrades()
  }, [])

  const years = useMemo(() => {
    const s = new Set(trades.map((t) => t.year))
    return [...s].sort((a, b) => b.localeCompare(a))
  }, [trades])

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filterYear !== 'all' && t.year !== filterYear) return false
      if (filterType === 'long' && t.type !== 'long') return false
      if (filterType === 'short' && t.type !== 'short') return false
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [trades, filterYear, filterType, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, TradeCard[]>>()
    filtered.forEach((t) => {
      if (!map.has(t.year)) map.set(t.year, new Map())
      const yearMap = map.get(t.year)!
      if (!yearMap.has(t.month)) yearMap.set(t.month, [])
      yearMap.get(t.month)!.push(t)
    })
    return map
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* Section header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <Crosshair className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Trade Replay</h2>
            <p className="text-sm text-muted-foreground">Replay real trades candle-by-candle, make your own calls</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] overflow-hidden">
        <button
          onClick={() => setTutorialOpen(!tutorialOpen)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-emerald-500/5 transition-colors"
        >
          <span className="text-sm font-medium text-emerald-300">How does Trade Replay work?</span>
          {tutorialOpen ? (
            <ChevronUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-emerald-400" />
          )}
        </button>

        <AnimatePresence>
          {tutorialOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-emerald-500/10">
                      <Eye className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">1. Watch the setup</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The chart plays candle-by-candle, starting before the trade entry.
                        Study the price action as it develops and try to spot the setup.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-blue-500/10">
                      <MousePointerClick className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">2. Make your calls</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enable &quot;Think Along&quot; mode to decide: buy or pass? Set your own entry
                        price, stop loss, and position size. Manage the trade as new candles appear.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-purple-500/10">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">3. Compare results</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        After each decision, see what the trader actually did. At the end,
                        compare your P&L and R-multiple side by side.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/10">
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Space</kbd> Play / Pause</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Arrow keys</kbd> Step candles</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">P</kbd> Toggle Think Along</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">R</kbd> Restart</span>
                  <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Close</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-background border rounded-md text-sm w-40 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-1 bg-muted/50 rounded-md p-0.5">
          {['all', ...years].map((y) => (
            <button
              key={y}
              onClick={() => setFilterYear(y)}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                filterYear === y ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {y === 'all' ? 'All Years' : y}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-muted/50 rounded-md p-0.5">
          {[
            { key: 'all', label: 'All' },
            { key: 'long', label: 'Long' },
            { key: 'short', label: 'Short' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                filterType === f.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Trade list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border bg-card animate-pulse">
              <div className="p-4 space-y-3">
                <div className="h-5 w-16 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted/60 rounded" />
                <div className="flex-1" />
                <div className="h-3 w-12 bg-muted/40 rounded mt-8" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No trades match your filters</div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()]
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([year, monthMap]) => (
              <div key={year}>
                <h2 className="text-lg font-semibold text-muted-foreground mb-4">{year}</h2>
                <div className="space-y-5">
                  {[...monthMap.entries()]
                    .sort(([a], [b]) => MONTHS.indexOf(b) - MONTHS.indexOf(a))
                    .map(([month, cards]) => (
                      <div key={`${year}-${month}`}>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          {month} {year}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          <AnimatePresence>
                            {cards.map((trade, i) => (
                              <motion.button
                                key={trade.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  trackEvent('gym_trade_select', {
                                    trade_id: trade.id,
                                    ticker: trade.symbol,
                                    trade_type: trade.type,
                                  })
                                  onSelectTrade(trade.id)
                                }}
                                className={cn(
                                  'group relative text-left overflow-hidden rounded-xl border transition-all duration-300 h-32',
                                  'bg-gradient-to-br from-card via-card to-card/80',
                                  'hover:shadow-lg hover:shadow-emerald-500/10',
                                  'hover:border-emerald-500/40',
                                )}
                              >
                                {/* Top accent gradient bar */}
                                <div className={cn(
                                  'absolute top-0 left-0 right-0 h-[2px]',
                                  trade.type === 'long'
                                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-400/50 to-transparent'
                                    : 'bg-gradient-to-r from-rose-500 via-rose-400/50 to-transparent',
                                )} />

                                {/* Background watermark */}
                                <div className="absolute -right-1 -bottom-2 text-[3.5rem] font-black text-foreground/[0.03] leading-none select-none pointer-events-none tracking-tighter">
                                  {trade.symbol}
                                </div>

                                {/* Decorative chart line */}
                                <svg
                                  className={cn(
                                    'absolute bottom-1 left-3 right-3 h-8 opacity-[0.05] group-hover:opacity-[0.12] transition-opacity pointer-events-none',
                                    trade.type === 'long' ? 'text-emerald-400' : 'text-rose-400',
                                  )}
                                  viewBox="0 0 180 50"
                                  preserveAspectRatio="none"
                                >
                                  <path
                                    d={generateChartPath(trade.symbol)}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>

                                {/* Content */}
                                <div className="relative p-4 h-full flex flex-col justify-between">
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1 mr-2">
                                      <h3 className="text-xl font-bold tracking-tight group-hover:text-emerald-400 transition-colors">
                                        {trade.symbol}
                                      </h3>
                                      {trade.sector && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                          {trade.sector}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {trade.addonCount > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1.5 py-0 h-4 border-purple-500/30 text-purple-400 bg-purple-500/10"
                                        >
                                          <Layers className="h-2.5 w-2.5 mr-0.5" />
                                          +{trade.addonCount}
                                        </Badge>
                                      )}
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[9px] px-1.5 py-0 h-4',
                                          trade.type === 'long'
                                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                            : 'border-rose-500/30 text-rose-400 bg-rose-500/10',
                                        )}
                                      >
                                        {trade.type === 'long' ? (
                                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                        ) : (
                                          <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                        )}
                                        {trade.type}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground">
                                      {trade.month} {trade.year}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                                        <Play className="h-3 w-3 fill-emerald-400" />
                                        Replay
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.button>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mental Edge Section Wrapper                                          */
/* ------------------------------------------------------------------ */

function MentalEdgeSection({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
            <Brain className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Mental Edge</h2>
            <p className="text-sm text-muted-foreground">Track your mindset, identify traps, build discipline</p>
          </div>
        </div>
      </div>

      <MentalEdge />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main Component                                                       */
/* ------------------------------------------------------------------ */

export default function TradingGym() {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  const { user, loading } = useAuth()
  const router = useRouter()
  const wasAuthenticated = useRef(!!user)
  // Keep the landing mounted until the door-open animation finishes
  const [showLanding, setShowLanding] = useState(!user && !loading)
  // Track if the user just came through the doors (for welcome overlay)
  const [justEntered, setJustEntered] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShowLanding(true)
      if (wasAuthenticated.current) router.push('/')
    }
    if (!loading && user && showLanding) {
      // User just logged in — let the door animation finish (3.2 s) before unmounting
      setJustEntered(true)
      const t = setTimeout(() => setShowLanding(false), 3200)
      wasAuthenticated.current = true
      return () => clearTimeout(t)
    }
    wasAuthenticated.current = !!user
  }, [user, loading, router, showLanding])

  // Full-screen gym entrance for unauthenticated users (or while animation plays)
  if (showLanding) {
    return <GymLockedLanding />
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div
      data-theme="dark"
      className="dark bg-background text-foreground -mx-4 md:-mx-6 -mt-4 md:-mt-6 -mb-4 min-h-[calc(100vh-4rem)]"
    >
      <div className="p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeSection === null && (
            <motion.div
              key="hub"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(6px)' }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <GymHub onSelect={setActiveSection} showWelcome={justEntered} />
            </motion.div>
          )}

          {activeSection === 'replay' && (
            <motion.div
              key="replay"
              initial={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <TradeReplaySection onBack={() => setActiveSection(null)} onSelectTrade={setSelectedTradeId} />
            </motion.div>
          )}

          {activeSection === 'mindset' && (
            <motion.div
              key="mindset"
              initial={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <MentalEdgeSection onBack={() => setActiveSection(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Render player outside AnimatePresence so fixed positioning works
          (filter/transform on motion.div creates a containing block that breaks fixed) */}
      {selectedTradeId && (
        <TradeReplayPlayer tradeId={selectedTradeId} onClose={() => setSelectedTradeId(null)} />
      )}
    </div>
  )
}
