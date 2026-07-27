'use client'

import { useCallback, useEffect, useState } from 'react'
import apiClient from '@/lib/api/client'

/* Mirrors the BE gym progress shapes (src/utilities/gymProgress.ts) */

export interface GymLevel {
  level: number
  minPoints: number
  title: string
  avatar: string
}

export interface GymProgress {
  totalPoints: number
  level: GymLevel
  nextLevel: GymLevel | null
  stats: {
    replaysCompleted: number
    uniqueReplaysCompleted: number
    totalStudySeconds: number
    submissions: number
    reviewedSubmissions: number
  }
  levels: GymLevel[]
}

export interface RecordReplayResult {
  pointsAwarded: number
  leveledUp: boolean
  progress: GymProgress
}

/** Fire-and-forget replay session report; resolves to null on failure */
export async function recordReplaySession(input: {
  refId: string
  source: 'trade' | 'submission'
  durationSeconds: number
  completed: boolean
}): Promise<RecordReplayResult | null> {
  try {
    const { data } = await apiClient.post('/gym-activity/record-replay', input)
    if (!data?.success || data?.skipped) return null
    return {
      pointsAwarded: Number(data.pointsAwarded) || 0,
      leveledUp: data.leveledUp === true,
      progress: data.progress as GymProgress,
    }
  } catch {
    return null
  }
}

export function formatStudyTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function useGymProgress() {
  const [progress, setProgress] = useState<GymProgress | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/gym-activity/progress')
      if (data?.success && data?.progress) setProgress(data.progress as GymProgress)
    } catch {
      // Progress is decorative — fail silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { progress, loading, refresh }
}
