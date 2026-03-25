'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { MentalEdge } from '@/components/mental-edge/MentalEdge'
import { FlaskConical, ShieldCheck } from 'lucide-react'

export default function MentalEdgeClient() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const wasAuthenticated = useRef(!!user)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/gym')
    }
    wasAuthenticated.current = !!user
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Mental Edge</h1>
        <p className="text-muted-foreground">
          Track your mindset, identify emotional traps, and build trading discipline through structured self-awareness.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10">
          <FlaskConical className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-300">Experimental Feature</span>
            <p className="text-xs text-yellow-600/70 dark:text-yellow-200/70 mt-0.5">
              This section is under active development. Features may change, and results may not always be perfect.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/20 bg-green-500/5">
          <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            All your data is fully encrypted in our database. Your entries are private and secure — nobody can read them.
          </p>
        </div>
      </div>

      <MentalEdge />
    </div>
  )
}
