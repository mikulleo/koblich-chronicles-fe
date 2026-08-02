// src/lib/analytics/milestones.ts

/**
 * Fire-once-per-threshold tracker for progress events.
 *
 * Replay progress is recomputed on every candle tick, so a naive
 * `if (percent >= 50) track(...)` would emit hundreds of duplicates. This
 * yields each threshold exactly once and resets when a new replay starts.
 */
export function createMilestoneTracker(thresholds: number[] = [25, 50, 75]) {
  const sorted = [...thresholds].sort((a, b) => a - b)
  let reached = new Set<number>()

  return {
    /** Thresholds newly crossed by this percentage, in ascending order. */
    crossed(percent: number): number[] {
      const newlyReached: number[] = []
      for (const threshold of sorted) {
        if (percent >= threshold && !reached.has(threshold)) {
          reached.add(threshold)
          newlyReached.push(threshold)
        }
      }
      return newlyReached
    },

    /** Highest threshold crossed so far, or 0. */
    furthest(): number {
      return reached.size === 0 ? 0 : Math.max(...reached)
    },

    reset(): void {
      reached = new Set<number>()
    },
  }
}

export type MilestoneTracker = ReturnType<typeof createMilestoneTracker>
