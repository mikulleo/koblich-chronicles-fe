// src/components/trade-story/EventStack.tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import TimelineEvent, {
  EventCardBack,
  EVENT_CARD_HEIGHT,
  type TimelineEventLike,
} from './TimelineEvent'

/** Vertical peek of each card behind the active one, in px. */
const PEEK = 14
/** Depth (px) each card behind sits further back in 3D space. */
const DEPTH = 60
/** How many cards are drawn behind the active one. */
const MAX_BEHIND = 3
const NAV_HEIGHT = 30
const PERSPECTIVE = 1100
/** Degrees of side-tilt the fan gains per card further back. */
const FAN_PER_CARD = 1.9
/** Horizontal spread (px) per card further back. */
const SPREAD_PER_CARD = 5

/** Total vertical space a stack occupies — constant, so every column lines up. */
export const EVENT_STACK_HEIGHT = EVENT_CARD_HEIGHT + PEEK * MAX_BEHIND + NAV_HEIGHT + 12

/**
 * Stable per-card "hand-stacked" jitter in [-1, 1] — a perfectly regular fan
 * looks machine-made; a slightly uneven one looks like a real deck.
 */
const jitter = (i: number) => {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

export default function EventStack({
  events,
  className,
}: {
  events: TimelineEventLike[]
  className?: string
}) {
  const [active, setActive] = useState(0)
  const [dir, setDir] = useState(1)
  const reduceMotion = useReducedMotion()
  const total = events.length
  const deckRef = useRef<HTMLDivElement>(null)

  /* pointer-driven tilt for the front card — the same motion values also give
     drag its 3D feedback, because dragging moves the pointer. */
  const rawTiltX = useMotionValue(0)
  const rawTiltY = useMotionValue(0)
  const tiltX = useSpring(rawTiltX, { stiffness: 180, damping: 18, mass: 0.4 })
  const tiltY = useSpring(rawTiltY, { stiffness: 180, damping: 18, mass: 0.4 })

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduceMotion || !deckRef.current) return
    const r = deckRef.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    rawTiltY.set(px * 16) // turn left/right
    rawTiltX.set(-py * 10) // nod up/down
  }
  const resetTilt = () => {
    rawTiltX.set(0)
    rawTiltY.set(0)
  }

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(total - 1, 0)))
  }, [total])

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), Math.max(total - 1, 0))
      setActive((cur) => {
        if (clamped !== cur) setDir(clamped > cur ? 1 : -1)
        return clamped
      })
    },
    [total]
  )
  const go = useCallback((delta: number) => setActive((i) => {
    const next = Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0))
    if (next !== i) setDir(delta > 0 ? 1 : -1)
    return next
  }), [total])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      goTo(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      goTo(total - 1)
    }
  }

  if (!total) return null

  /* The dismissed card lifts off the deck, turns face-down mid-air and slots
     back in underneath — a deal-and-bury rather than a fade-out. */
  const shuffleUnder = reduceMotion
    ? { duration: 0 }
    : { duration: 0.66, times: [0, 0.34, 0.68, 1], ease: 'easeInOut' as const }

  return (
    <div
      className={cn('relative w-full outline-none', className)}
      style={{ height: EVENT_STACK_HEIGHT }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-roledescription="card stack"
      aria-label={`Trade events, ${active + 1} of ${total}`}
    >
      {/* 3D deck */}
      <div
        ref={deckRef}
        className="relative"
        style={{
          height: EVENT_CARD_HEIGHT + PEEK * MAX_BEHIND,
          perspective: PERSPECTIVE,
          transformStyle: 'preserve-3d',
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={resetTilt}
      >
        {events.map((event, i) => {
          const offset = i - active
          // Only the active card, a few behind it, and the one just dismissed exist in the DOM.
          if (offset < -1 || offset > MAX_BEHIND) return null

          const isActive = offset === 0
          const gone = offset < 0
          const behind = Math.max(offset, 0)
          const lean = jitter(i)

          /* Only the top card is face-up. Cards behind are face-down (rotateY
             180), fanned at their own angle and sunk back in Z; the dismissed
             one arcs out, flips over and buries itself under the deck. */
          const deckState = gone
            ? {
                x: [0, dir * 82, dir * 58, dir * 12],
                y: [0, -16, 8, MAX_BEHIND * PEEK + 6],
                z: [0, 110, 30, -(MAX_BEHIND + 1) * DEPTH],
                rotateY: [0, dir * -70, dir * -140, dir * -180],
                rotateZ: [lean * 1.2, dir * 9, dir * 6, dir * 3],
                rotateX: [0, -7, 1, 7],
                scale: [1, 1.05, 0.99, 0.85],
                opacity: [1, 1, 1, 0],
              }
            : {
                x: lean * SPREAD_PER_CARD * behind,
                y: behind * PEEK,
                z: -behind * DEPTH,
                // face-up on top, face-down behind — the active card turns over as it arrives
                rotateY: isActive ? (reduceMotion ? 0 : [180, 0]) : 180,
                rotateZ: lean * (1.2 + behind * FAN_PER_CARD),
                rotateX: behind === 0 ? 0 : 5,
                scale: 1 - behind * 0.025,
                opacity: behind === 0 ? 1 : Math.max(0.92 - behind * 0.16, 0.35),
              }

          /* Cards restack in sequence rather than as one rigid block — that
             cascade is what reads as a riffle. */
          const settle = reduceMotion
            ? { duration: 0 }
            : {
                type: 'spring' as const,
                stiffness: isActive ? 300 : 250,
                damping: isActive ? 24 : 26,
                mass: 0.9,
                delay: 0.06 + behind * 0.05,
              }

          return (
            <div
              key={`${event.date}-${event.type}-${i}`}
              className="absolute inset-x-0 top-0"
              style={{
                zIndex: gone ? total + 1 : total - behind,
                pointerEvents: gone ? 'none' : 'auto',
                transformStyle: 'preserve-3d',
              }}
            >
              <motion.div
                className="[transform-origin:50%_60%] [transform-style:preserve-3d]"
                initial={false}
                animate={deckState}
                transition={gone ? shuffleUnder : settle}
              >
                <motion.div
                  className={cn(
                    'relative [transform-style:preserve-3d]',
                    isActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                  )}
                  style={isActive ? { rotateX: tiltX, rotateY: tiltY } : undefined}
                  drag={isActive && total > 1 ? 'y' : false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.25}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (info.offset.y < -40 || info.velocity.y < -400) go(1)
                    else if (info.offset.y > 40 || info.velocity.y > 400) go(-1)
                  }}
                  onClick={() => !isActive && goTo(i)}
                  aria-hidden={!isActive}
                >
                  {/* face */}
                  <div className="[backface-visibility:hidden]">
                    <TimelineEvent
                      event={event}
                      className={cn(isActive ? 'shadow-xl' : 'shadow-md')}
                    />
                  </div>
                  {/* reverse — pre-turned so it shows once the card passes 90° */}
                  <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    <EventCardBack
                      event={event}
                      className={cn(isActive ? 'shadow-xl' : 'shadow-md')}
                    />
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* controls */}
      {total > 1 && (
        <div className="mt-2 flex items-center justify-between gap-2" style={{ height: NAV_HEIGHT }}>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {total <= 8 ? (
              events.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show event ${i + 1}`}
                  aria-current={i === active}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === active
                      ? 'bg-primary w-4'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5'
                  )}
                />
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {active + 1} / {total}
              </span>
            )}
          </div>

          <div className="flex flex-none items-center gap-1">
            {total <= 8 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {active + 1} / {total}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-full"
              onClick={() => go(-1)}
              disabled={active === 0}
              aria-label="Previous event"
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-full"
              onClick={() => go(1)}
              disabled={active === total - 1}
              aria-label="Next event"
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
