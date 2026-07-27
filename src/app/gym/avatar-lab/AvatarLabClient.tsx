'use client'

import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Expand, Lock, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import LevelAvatar3D from '@/components/trading-gym/avatars/LevelAvatar3D'
import { avatarForLevel } from '@/components/trading-gym/avatars/levelAvatars'

/**
 * REVIEW-ONLY PAGE — not linked from anywhere in the app.
 *
 * Preview of the proposed 3D gym level avatars before wiring them into
 * GymProgress.tsx. Mirrors GYM_LEVELS from the BE locally so the page renders
 * without an API call or a logged-in user.
 */

const LEVELS = [
  { level: 1, minPoints: 0, title: 'Gym Rookie', emoji: '🐣' },
  { level: 2, minPoints: 150, title: 'Chart Watcher', emoji: '🐰' },
  { level: 3, minPoints: 400, title: 'Candle Counter', emoji: '🦉' },
  { level: 4, minPoints: 800, title: 'Breakout Scout', emoji: '🦊' },
  { level: 5, minPoints: 1500, title: 'Momentum Hunter', emoji: '🐺' },
  { level: 6, minPoints: 2500, title: 'Swing Surgeon', emoji: '🦅' },
  { level: 7, minPoints: 4000, title: 'Risk Tamer', emoji: '🦁' },
  { level: 8, minPoints: 6000, title: 'Market Brute', emoji: '👹' },
  { level: 9, minPoints: 9000, title: 'Trading Dragon', emoji: '🐉' },
  { level: 10, minPoints: 13000, title: 'Gym GOAT', emoji: '🐐' },
]

/** Pretend the reviewer is level 5 so locked/unlocked states are both visible */
const DEMO_LEVEL = 5
const DEMO_POINTS = 1840

/** Deterministic thousands separator — toLocaleString() differs between the
 *  Node server locale and the browser, which trips React hydration. */
const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default function AvatarLabClient() {
  const [showcase, setShowcase] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  const current = LEVELS.find((l) => l.level === DEMO_LEVEL)!
  const next = LEVELS.find((l) => l.level === DEMO_LEVEL + 1)!
  const currentAvatar = avatarForLevel(DEMO_LEVEL)
  const barPct = Math.round(
    ((DEMO_POINTS - current.minPoints) / (next.minPoints - current.minPoints)) * 100,
  )

  const showcaseLevel = showcase === null ? null : LEVELS.find((l) => l.level === showcase)!

  return (
    <div className="min-h-screen bg-[#070d18] text-white">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400/70">
            Review only — not linked in the app
          </p>
          <h1 className="mt-2 text-3xl font-black">Gym Level Avatars — 3D preview</h1>
          <p className="mt-2 max-w-2xl text-sm text-purple-100/50">
            Rigged, animated CC0 characters by Quaternius, one per level. Drag any large avatar to
            rotate it. Nothing here is wired into the real gym yet.
          </p>
        </header>

        {/* -------------------------------------------------------- */}
        {/* 1. Proposed card treatment                                */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <SectionTitle n={1} title="The progress card" note="How it looks in the gym hub" />

          <div className="overflow-hidden rounded-xl border border-purple-500/20 bg-purple-500/[0.06] backdrop-blur-sm">
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              {/* Avatar — the whole thing is a button into the showcase */}
              <button
                onClick={() => setShowcase(DEMO_LEVEL)}
                className="group relative shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                aria-label={`Open ${current.title} showcase`}
              >
                <div className="relative h-[104px] w-[104px] overflow-hidden rounded-xl bg-purple-500/10 ring-2 ring-purple-500/40 transition-all group-hover:ring-purple-400/80 group-hover:shadow-[0_0_28px_rgba(168,85,247,0.4)]">
                  <LevelAvatar3D
                    avatar={currentAvatar}
                    fallbackEmoji={current.emoji}
                    className="h-full w-full"
                  />
                  {/* Click affordance — always visible, brightens on hover */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-[#0a1629]/95 to-transparent py-1 text-[9px] font-bold uppercase tracking-wide text-purple-200/80 transition-colors group-hover:text-white">
                    <Expand className="h-2.5 w-2.5" />
                    View
                  </span>
                </div>
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-[11px] font-black text-white ring-2 ring-[#070d18]">
                  {current.level}
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight text-purple-100">
                  {current.title}{' '}
                  <span className="text-purple-300/50">· {currentAvatar.name}</span>
                </p>
                <p className="mb-2 text-xs text-purple-200/50">
                  {fmt(DEMO_POINTS)} pts ·{' '}
                  {fmt(next.minPoints - DEMO_POINTS)} to {next.title}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-purple-950/60">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-purple-200/40">
                  {barPct}% to Level {next.level}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs text-purple-100/40">
            The avatar tile is a button: permanent “View” strip, ring brightens and glows on hover.
          </p>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 2. All ten characters                                     */}
        {/* -------------------------------------------------------- */}
        <section className="mb-14">
          <SectionTitle
            n={2}
            title="The full ladder"
            note={`Locked states shown as if you were level ${DEMO_LEVEL}`}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LEVELS.map((lvl) => {
              const avatar = avatarForLevel(lvl.level)
              const unlocked = lvl.level <= DEMO_LEVEL
              const isCurrent = lvl.level === DEMO_LEVEL
              return (
                <button
                  key={lvl.level}
                  onClick={() => setShowcase(lvl.level)}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border text-left transition-all',
                    isCurrent
                      ? 'border-purple-400/60 bg-purple-500/15 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                      : unlocked
                        ? 'border-purple-500/25 bg-purple-500/[0.07] hover:border-purple-400/50'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20',
                  )}
                >
                  <LevelAvatar3D
                    avatar={avatar}
                    fallbackEmoji={lvl.emoji}
                    locked={!unlocked}
                    className="h-56 w-full"
                  />

                  <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2.5">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'truncate text-sm font-bold',
                          unlocked ? 'text-purple-100' : 'text-gray-400',
                        )}
                      >
                        {lvl.title}
                      </p>
                      <p className="flex items-center gap-1 text-[10px] text-purple-200/40">
                        {unlocked ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <Lock className="h-2.5 w-2.5" />
                        )}
                        Lv {lvl.level} · {fmt(lvl.minPoints)} pts · {avatar.name}
                      </p>
                    </div>
                    <Expand className="h-3.5 w-3.5 shrink-0 text-purple-300/40 transition-colors group-hover:text-purple-200" />
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* 3. Level-up celebration                                   */}
        {/* -------------------------------------------------------- */}
        <section className="mb-10">
          <SectionTitle n={3} title="Level-up animation" note="Each model has a celebrate clip" />
          <div className="flex flex-col items-start gap-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] p-4 sm:flex-row sm:items-center">
            <LevelAvatar3D
              avatar={avatarForLevel(7)}
              fallbackEmoji="🦁"
              celebrate={celebrate}
              spin={false}
              className="h-64 w-full shrink-0 sm:w-72"
            />
            <div>
              <p className="mb-1 text-sm font-bold text-purple-100">The Bull — Risk Tamer</p>
              <p className="mb-3 max-w-md text-xs text-purple-100/50">
                Idle loop by default; on level-up it plays the character&apos;s action clip
                (headbutt, jump, gallop, dive — depends on the model).
              </p>
              <button
                onClick={() => setCelebrate((c) => !c)}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-purple-500"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {celebrate ? 'Back to idle' : 'Play celebrate'}
              </button>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/[0.06] pt-5 text-xs text-purple-100/35">
          Models: Quaternius, CC0 1.0 (public domain) — ~3.4 MB total, lazy-loaded per level. Full
          credits in <code className="text-purple-200/60">public/gym/avatars/CREDITS.md</code>.
        </footer>
      </div>

      {/* -------------------------------------------------------- */}
      {/* Fullscreen showcase modal                                 */}
      {/* -------------------------------------------------------- */}
      <AnimatePresence>
        {showcaseLevel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070f]/92 p-4 backdrop-blur-sm"
            onClick={() => setShowcase(null)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-[#070d18] shadow-[0_0_60px_rgba(168,85,247,0.2)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowcase(null)}
                className="absolute right-3 top-3 z-10 rounded-lg border border-white/10 p-2 text-purple-200/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <LevelAvatar3D
                avatar={avatarForLevel(showcaseLevel.level)}
                fallbackEmoji={showcaseLevel.emoji}
                interactive
                spin={false}
                locked={showcaseLevel.level > DEMO_LEVEL}
                className="h-[55vh] max-h-[520px] w-full"
              />

              <div className="border-t border-white/[0.07] px-6 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-400/70">
                  Level {showcaseLevel.level} ·{' '}
                  {fmt(showcaseLevel.minPoints)} pts
                </p>
                <h2 className="mt-1 text-2xl font-black">{showcaseLevel.title}</h2>
                <p className="mt-1 text-sm text-purple-100/50">
                  {avatarForLevel(showcaseLevel.level).name} ·{' '}
                  {showcaseLevel.level > DEMO_LEVEL ? 'Locked' : 'Unlocked'} · drag to rotate,
                  scroll to zoom
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionTitle({ n, title, note }: { n: number; title: string; note: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600/30 text-xs font-black text-purple-200">
        {n}
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      <span className="text-xs text-purple-100/35">{note}</span>
    </div>
  )
}
