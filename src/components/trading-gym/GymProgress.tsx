'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Clock, Inbox, Play, Check, Lock, Expand, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymProgress, formatStudyTime } from '@/hooks/use-gym-progress'
import type { GymLevel } from '@/hooks/use-gym-progress'
import LevelAvatar3D from './avatars/LevelAvatar3D'
import { avatarForLevel } from './avatars/levelAvatars'

/**
 * Lifetime training progress card for the gym hub: 3D avatar + level, points,
 * progress toward the next level, and study stats. Expands into the full
 * level roadmap, and any level opens a fullscreen showcase of its character.
 *
 * Only the card (and the showcase, while open) renders a WebGL canvas. The
 * roadmap tiles deliberately stay on the emoji glyph — ten live canvases would
 * crowd the browser's context limit for a panel that's collapsed by default.
 */
export default function GymProgressCard() {
  const { progress, loading } = useGymProgress()
  const [roadmapOpen, setRoadmapOpen] = useState(false)
  const [showcase, setShowcase] = useState<GymLevel | null>(null)

  if (loading || !progress) return null

  const { totalPoints, level, nextLevel, stats, levels } = progress

  // % of the way from the current level's floor to the next level's floor
  const barPct = nextLevel
    ? Math.min(
        100,
        Math.round(
          ((totalPoints - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100,
        ),
      )
    : 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] backdrop-blur-sm overflow-hidden"
    >
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Avatar + level */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowcase(level)}
            aria-label={`View your ${level.title} avatar up close`}
            className="group relative shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <div className="relative h-[92px] w-[92px] overflow-hidden rounded-xl bg-purple-500/10 ring-2 ring-purple-500/40 shadow-[0_0_18px_rgba(168,85,247,0.25)] transition-all group-hover:ring-purple-400/80 group-hover:shadow-[0_0_28px_rgba(168,85,247,0.45)]">
              <LevelAvatar3D
                avatar={avatarForLevel(level.level)}
                fallbackEmoji={level.avatar}
                className="h-full w-full"
              />
              {/* Always-visible cue that the avatar opens a bigger view */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-[#0a1629]/95 to-transparent py-1 text-[9px] font-bold uppercase tracking-wide text-purple-200/80 transition-colors group-hover:text-white">
                <Expand className="h-2.5 w-2.5" />
                View
              </span>
            </div>
            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-purple-600 ring-2 ring-[#0a1629] flex items-center justify-center text-[10px] font-black text-white">
              {level.level}
            </span>
          </button>
          <div>
            <p className="text-sm font-bold text-purple-100 leading-tight">{level.title}</p>
            <p className="text-xs text-purple-200/50">
              {totalPoints.toLocaleString()} pts
              {nextLevel && (
                /* Deliberately no next-level avatar here — the next character
                   stays a surprise until it's earned. */
                <span> · {(nextLevel.minPoints - totalPoints).toLocaleString()} to Level {nextLevel.level}</span>
              )}
            </p>
          </div>
        </div>

        {/* Progress bar to next level */}
        <div className="flex-1 min-w-0">
          <div className="h-2 rounded-full bg-purple-950/60 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400"
              initial={{ width: 0 }}
              animate={{ width: `${barPct}%` }}
              transition={{ delay: 0.8, duration: 0.9, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-1 text-[10px] text-purple-200/40 text-right">
            {nextLevel ? `${barPct}% to Level ${nextLevel.level} — ${nextLevel.title}` : 'Max level reached'}
          </p>
        </div>

        {/* Lifetime stats */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <StatChip icon={<Play className="h-3 w-3" />} label="replays" value={String(stats.replaysCompleted)} />
          <StatChip icon={<Inbox className="h-3 w-3" />} label="symbols" value={String(stats.submissions)} />
          <StatChip icon={<Clock className="h-3 w-3" />} label="studied" value={formatStudyTime(stats.totalStudySeconds)} />
          <button
            onClick={() => setRoadmapOpen((o) => !o)}
            className="p-1.5 rounded-lg border border-purple-500/20 text-purple-300/70 hover:text-purple-200 hover:bg-purple-500/10 transition-colors"
            aria-label={roadmapOpen ? 'Hide level roadmap' : 'Show level roadmap'}
          >
            {roadmapOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Level roadmap */}
      <AnimatePresence>
        {roadmapOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {levels.map((lvl) => (
                <RoadmapTile
                  key={lvl.level}
                  lvl={lvl}
                  current={level.level}
                  points={totalPoints}
                  onOpen={() => setShowcase(lvl)}
                />
              ))}
              <p className="col-span-2 sm:col-span-5 text-[10px] text-purple-200/40 mt-1">
                Earn points by finishing replays (+50 first time, +10 repeats), studying (1 pt/min),
                submitting symbols (+100) and getting them reviewed (+50).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen character showcase.
          Portalled to <body>: this card sets backdrop-blur and is animated by
          framer-motion, and both backdrop-filter and transform make an element
          the containing block for fixed-position children — inside it the
          overlay would anchor to the card and be clipped by overflow-hidden. */}
      {showcase &&
        createPortal(
          <AnimatePresence>
            <AvatarShowcase lvl={showcase} onClose={() => setShowcase(null)} />
          </AnimatePresence>,
          document.body,
        )}
    </motion.div>
  )
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.08]">
      <span className="text-purple-300/70">{icon}</span>
      <span className="text-xs font-bold text-purple-100">{value}</span>
      <span className="text-[10px] text-purple-200/40">{label}</span>
    </div>
  )
}

function RoadmapTile({
  lvl,
  current,
  points,
  onOpen,
}: {
  lvl: GymLevel
  current: number
  points: number
  onOpen: () => void
}) {
  const unlocked = points >= lvl.minPoints
  const isCurrent = lvl.level === current

  // Locked levels reveal nothing about their character — no avatar, no name.
  // The rank title is the goal you're chasing; the creature is the payoff.
  if (!unlocked) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 flex items-center gap-2 opacity-60">
        <span className="text-lg text-gray-500 w-[1.125rem] text-center leading-none">?</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold truncate text-gray-400">{lvl.title}</p>
          <p className="text-[10px] text-purple-200/40 flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" />
            {lvl.minPoints.toLocaleString()} pts
          </p>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onOpen}
      aria-label={`View the ${lvl.title} avatar`}
      className={cn(
        'group rounded-lg border px-2.5 py-2 flex items-center gap-2 text-left transition-colors',
        isCurrent
          ? 'border-purple-400/60 bg-purple-500/15 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
          : 'border-purple-500/25 bg-purple-500/[0.07] hover:border-purple-400/50',
      )}
    >
      <span className="text-lg">{lvl.avatar}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold truncate text-purple-100">{lvl.title}</p>
        <p className="text-[10px] text-purple-200/40 flex items-center gap-1">
          <Check className="h-2.5 w-2.5" />
          {lvl.minPoints.toLocaleString()} pts
        </p>
      </div>
      <Expand className="h-3 w-3 shrink-0 text-purple-300/30 transition-colors group-hover:text-purple-200" />
    </button>
  )
}

/**
 * Fullscreen 3D showcase for a single level's character.
 *
 * Only ever opened for unlocked levels — locked roadmap tiles aren't clickable,
 * so a character is never seen before it's earned. That also means locked
 * models are never fetched, so the surprise doesn't leak over the network.
 */
function AvatarShowcase({ lvl, onClose }: { lvl: GymLevel; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070f]/92 p-4 backdrop-blur-sm"
      onClick={onClose}
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
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-lg border border-white/10 p-2 text-purple-200/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <LevelAvatar3D
          avatar={avatarForLevel(lvl.level)}
          fallbackEmoji={lvl.avatar}
          interactive
          className="h-[55vh] max-h-[520px] w-full"
        />

        <div className="border-t border-white/[0.07] px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400/70">
            Level {lvl.level} · {lvl.minPoints.toLocaleString()} pts
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">{lvl.title}</h2>
          <p className="mt-1 text-sm text-purple-100/50">
            {avatarForLevel(lvl.level).name} · drag to rotate, scroll to zoom
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
