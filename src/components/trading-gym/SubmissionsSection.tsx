'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Inbox, Play, Plus, TrendingUp, TrendingDown, Search,
  Pencil, Trash2, Globe, Clock, CheckCircle2, User as UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client'
import { useAuth } from '@/providers/auth-provider'
import SubmissionForm from './SubmissionForm'

export interface TradeSubmissionDoc {
  id: string
  user: string | { id: string; name?: string }
  tickerSymbol: string
  tradeType: 'long' | 'short'
  entryDate: string
  entryPrice: number
  positionSizePct?: number | null
  initialStopLoss: number
  movedStops?: { date: string; price: number; comment?: string }[]
  exits?: { date: string; price: number; sizePct: number; comment?: string }[]
  notes?: string
  makePublic?: boolean
  reviewStatus?: 'pending' | 'reviewed'
  createdAt: string
}

interface SubmissionsSectionProps {
  onBack: () => void
  onSelectSubmission: (id: string) => void
}

const ownerId = (doc: TradeSubmissionDoc): string =>
  typeof doc.user === 'object' ? String(doc.user.id) : String(doc.user)

export default function SubmissionsSection({ onBack, onSelectSubmission }: SubmissionsSectionProps) {
  const { user } = useAuth()
  const [docs, setDocs] = useState<TradeSubmissionDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine' | 'community'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<TradeSubmissionDoc | null>(null)

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true)
      // Server-side access control already limits this to own + public reviewed
      const { data } = await apiClient.get('/trade-submissions', {
        params: { limit: 200, depth: 0, sort: '-createdAt' },
      })
      setDocs(data?.docs ?? [])
    } catch (e) {
      console.error('Failed to fetch submissions:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const myId = user ? String(user.id) : null

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      const mine = myId != null && ownerId(d) === myId
      if (filter === 'mine' && !mine) return false
      if (filter === 'community' && mine) return false
      if (search && !d.tickerSymbol.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [docs, filter, search, myId])

  async function handleDelete(doc: TradeSubmissionDoc) {
    if (!window.confirm(`Delete your ${doc.tickerSymbol} submission?`)) return
    try {
      await apiClient.delete(`/trade-submissions/${doc.id}`)
      toast.success('Submission deleted')
      fetchSubmissions()
    } catch (e) {
      console.error('Failed to delete submission:', e)
      toast.error('Failed to delete submission')
    }
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <Inbox className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">User Submitted Tickers</h2>
            <p className="text-sm text-muted-foreground">
              {"Drop your trades in the box — Leoš reviews them and adds his own take"}
            </p>
          </div>
        </div>
        <div className="ml-auto">
          {user ? (
            <Button onClick={() => { setEditDoc(null); setFormOpen(true) }} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />Submit a Ticker
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Sign in to submit your own tickers</p>
          )}
        </div>
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
            className="pl-8 pr-3 py-1.5 bg-background border rounded-md text-sm w-40 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-md p-0.5">
          {[
            { key: 'all', label: 'All' },
            { key: 'mine', label: 'Mine' },
            { key: 'community', label: 'Community' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                filter === f.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-1">No submissions yet</p>
          {user && (
            <p className="text-xs text-muted-foreground">
              Be the first — submit a ticker you traded and see what Leoš thinks.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence>
            {filtered.map((doc, i) => {
              const mine = myId != null && ownerId(doc) === myId
              const reviewed = doc.reviewStatus === 'reviewed'
              const canEdit = mine && !reviewed

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 30 }}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border transition-all duration-300 h-36',
                    'bg-gradient-to-br from-card via-card to-card/80',
                    'hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-500/40',
                  )}
                >
                  <div className={cn(
                    'absolute top-0 left-0 right-0 h-[2px]',
                    doc.tradeType === 'long'
                      ? 'bg-gradient-to-r from-emerald-500 via-emerald-400/50 to-transparent'
                      : 'bg-gradient-to-r from-rose-500 via-rose-400/50 to-transparent',
                  )} />

                  <button
                    onClick={() => onSelectSubmission(doc.id)}
                    className="absolute inset-0 w-full text-left p-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1 mr-2">
                        <h3 className="text-xl font-bold tracking-tight group-hover:text-amber-400 transition-colors">
                          {doc.tickerSymbol}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {(() => { try { return new Date(doc.entryDate).toLocaleDateString() } catch { return doc.entryDate } })()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5 py-0 h-4 shrink-0',
                          doc.tradeType === 'long'
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                            : 'border-rose-500/30 text-rose-400 bg-rose-500/10',
                        )}
                      >
                        {doc.tradeType === 'long' ? (
                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                        )}
                        {doc.tradeType}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {mine && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-purple-500/30 text-purple-400 bg-purple-500/10">
                          <UserIcon className="h-2.5 w-2.5 mr-0.5" />Mine
                        </Badge>
                      )}
                      {reviewed ? (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Reviewed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />Pending review
                        </Badge>
                      )}
                      {doc.makePublic && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-500/30 text-blue-400 bg-blue-500/10">
                          <Globe className="h-2.5 w-2.5 mr-0.5" />Public
                        </Badge>
                      )}
                      <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                          <Play className="h-3 w-3 fill-amber-400" />Replay
                        </span>
                      </span>
                    </div>
                  </button>

                  {/* Owner actions (outside the replay button) */}
                  {mine && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditDoc(doc); setFormOpen(true) }}
                          className="p-1.5 rounded-md bg-black/40 text-muted-foreground hover:text-foreground"
                          title="Edit submission"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc) }}
                        className="p-1.5 rounded-md bg-black/40 text-muted-foreground hover:text-red-400"
                        title="Delete submission"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {formOpen && (
        <SubmissionForm
          initial={editDoc}
          onSaved={() => { setFormOpen(false); setEditDoc(null); fetchSubmissions() }}
          onCancel={() => { setFormOpen(false); setEditDoc(null) }}
        />
      )}
    </div>
  )
}
