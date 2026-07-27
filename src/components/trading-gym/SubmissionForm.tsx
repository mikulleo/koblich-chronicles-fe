'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client'
import type { TradeSubmissionDoc } from './SubmissionsSection'

interface EventRow {
  date: string
  price: string
  sizePct?: string
  comment: string
}

interface SubmissionFormProps {
  /** When set, the form edits an existing submission (PATCH) instead of creating */
  initial?: TradeSubmissionDoc | null
  onSaved: () => void
  onCancel: () => void
}

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-1 focus:ring-amber-500'
const labelCls = 'block text-xs text-muted-foreground mb-1'

const toDateInput = (v?: string): string => (v ? v.split('T')[0] : '')

export default function SubmissionForm({ initial, onSaved, onCancel }: SubmissionFormProps) {
  const [tickerSymbol, setTickerSymbol] = useState(initial?.tickerSymbol ?? '')
  const [tradeType, setTradeType] = useState<'long' | 'short'>(initial?.tradeType ?? 'long')
  const [entryDate, setEntryDate] = useState(toDateInput(initial?.entryDate))
  const [entryPrice, setEntryPrice] = useState(initial?.entryPrice != null ? String(initial.entryPrice) : '')
  const presetSizes = [100, 50, 25]
  const [sizeChoice, setSizeChoice] = useState<'100' | '50' | '25' | 'other'>(
    initial?.positionSizePct == null
      ? '100'
      : presetSizes.includes(initial.positionSizePct)
        ? (String(initial.positionSizePct) as '100' | '50' | '25')
        : 'other',
  )
  const [customSizePct, setCustomSizePct] = useState(
    initial?.positionSizePct != null && !presetSizes.includes(initial.positionSizePct)
      ? String(initial.positionSizePct)
      : '',
  )
  const [initialStopLoss, setInitialStopLoss] = useState(
    initial?.initialStopLoss != null ? String(initial.initialStopLoss) : '',
  )
  const [movedStops, setMovedStops] = useState<EventRow[]>(
    (initial?.movedStops ?? []).map((s) => ({
      date: toDateInput(s.date),
      price: String(s.price),
      comment: s.comment ?? '',
    })),
  )
  const [exits, setExits] = useState<EventRow[]>(
    (initial?.exits ?? []).map((x) => ({
      date: toDateInput(x.date),
      price: String(x.price),
      sizePct: String(x.sizePct),
      comment: x.comment ?? '',
    })),
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [makePublic, setMakePublic] = useState(initial?.makePublic ?? false)
  const [submitting, setSubmitting] = useState(false)

  const addStop = () => setMovedStops((rows) => [...rows, { date: '', price: '', comment: '' }])
  const addExit = () => setExits((rows) => [...rows, { date: '', price: '', sizePct: '', comment: '' }])

  const updateRow = (
    setter: React.Dispatch<React.SetStateAction<EventRow[]>>,
    idx: number,
    patch: Partial<EventRow>,
  ) => setter((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const removeRow = (setter: React.Dispatch<React.SetStateAction<EventRow[]>>, idx: number) =>
    setter((rows) => rows.filter((_, i) => i !== idx))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!tickerSymbol.trim()) return toast.error('Enter a ticker symbol')
    if (!entryDate || !entryPrice) return toast.error('Entry date and price are required')
    if (!initialStopLoss) return toast.error('Initial stop loss is required')
    const positionSizePct = sizeChoice === 'other' ? parseFloat(customSizePct) : Number(sizeChoice)
    if (!(positionSizePct >= 1 && positionSizePct <= 100)) {
      return toast.error('Position size must be between 1 and 100% of a full position')
    }
    if (exits.length === 0) return toast.error('Add at least one sell (full or partial)')
    for (const x of exits) {
      if (!x.date || !x.price || !x.sizePct) {
        return toast.error('Every sell needs a date, price, and % of position')
      }
    }
    for (const st of movedStops) {
      if (!st.date || !st.price) return toast.error('Every stop move needs a date and price')
    }

    const payload = {
      tickerSymbol: tickerSymbol.trim().toUpperCase(),
      tradeType,
      entryDate,
      entryPrice: parseFloat(entryPrice),
      positionSizePct,
      initialStopLoss: parseFloat(initialStopLoss),
      movedStops: movedStops.map((s) => ({
        date: s.date,
        price: parseFloat(s.price),
        comment: s.comment || undefined,
      })),
      exits: exits.map((x) => ({
        date: x.date,
        price: parseFloat(x.price),
        sizePct: parseFloat(x.sizePct || '100'),
        comment: x.comment || undefined,
      })),
      notes: notes || undefined,
      makePublic,
    }

    setSubmitting(true)
    try {
      if (initial?.id) {
        await apiClient.patch(`/trade-submissions/${initial.id}`, payload)
        toast.success('Submission updated')
      } else {
        await apiClient.post('/trade-submissions', payload)
        toast.success('Ticker submitted — Leoš will take a look!')
      }
      onSaved()
    } catch (err) {
      console.error('Failed to save submission:', err)
      toast.error('Failed to save. Please check your inputs and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderRows = (
    rows: EventRow[],
    setter: React.Dispatch<React.SetStateAction<EventRow[]>>,
    kind: 'stop' | 'exit',
  ) =>
    rows.map((row, i) => (
      <div key={`${kind}-${i}`} className="rounded-lg border bg-muted/20 p-3 space-y-2">
        <div className={cn('grid gap-2', kind === 'exit' ? 'grid-cols-3' : 'grid-cols-2')}>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={row.date} onChange={(e) => updateRow(setter, i, { date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{kind === 'stop' ? 'New stop price' : 'Sell price'}</label>
            <input type="number" step="0.01" min="0" value={row.price} onChange={(e) => updateRow(setter, i, { price: e.target.value })} className={inputCls} placeholder="0.00" />
          </div>
          {kind === 'exit' && (
            <div>
              <label className={labelCls}>% of position</label>
              <input type="number" min="1" max="100" value={row.sizePct} onChange={(e) => updateRow(setter, i, { sizePct: e.target.value })} className={inputCls} placeholder="100" />
            </div>
          )}
        </div>
        <div className="flex gap-2 items-start">
          <textarea
            value={row.comment}
            onChange={(e) => updateRow(setter, i, { comment: e.target.value })}
            className={cn(inputCls, 'min-h-[38px] flex-1')}
            placeholder={kind === 'stop' ? 'Why did you move the stop? (optional)' : 'Why did you sell? (optional)'}
            rows={1}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(setter, i)} className="text-muted-foreground hover:text-red-400 h-9 w-9 p-0 shrink-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    ))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h3 className="text-lg font-bold">{initial ? 'Edit Submission' : 'Submit a Ticker'}</h3>
            <p className="text-xs text-muted-foreground">
              Share a trade you made — entry, stop moves, and sells with your reasoning
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className={labelCls}>Ticker *</label>
              <input
                type="text"
                value={tickerSymbol}
                onChange={(e) => setTickerSymbol(e.target.value.toUpperCase())}
                className={cn(inputCls, 'font-mono uppercase')}
                placeholder="AAPL"
                maxLength={10}
              />
            </div>
            <div className="col-span-1">
              <label className={labelCls}>Direction *</label>
              <select value={tradeType} onChange={(e) => setTradeType(e.target.value as 'long' | 'short')} className={inputCls}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Entry date *</label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Entry price *</label>
              <input type="number" step="0.01" min="0" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Initial stop *</label>
              <input type="number" step="0.01" min="0" value={initialStopLoss} onChange={(e) => setInitialStopLoss(e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Position size *</label>
              <select
                value={sizeChoice}
                onChange={(e) => setSizeChoice(e.target.value as '100' | '50' | '25' | 'other')}
                className={inputCls}
              >
                <option value="100">Full</option>
                <option value="50">Half</option>
                <option value="25">Quarter</option>
                <option value="other">Other…</option>
              </select>
            </div>
            {sizeChoice === 'other' && (
              <div>
                <label className={labelCls}>% of full position *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customSizePct}
                  onChange={(e) => setCustomSizePct(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 75"
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Stop moves</label>
              <Button type="button" variant="outline" size="sm" onClick={addStop} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />Add stop move
              </Button>
            </div>
            <div className="space-y-2">
              {movedStops.length === 0 && (
                <p className="text-xs text-muted-foreground">No stop moves — add them if you trailed your stop.</p>
              )}
              {renderRows(movedStops, setMovedStops, 'stop')}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Sells / reductions *</label>
              <Button type="button" variant="outline" size="sm" onClick={addExit} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />Add sell
              </Button>
            </div>
            <div className="space-y-2">
              {exits.length === 0 && (
                <p className="text-xs text-muted-foreground">Add at least one sell — full (100%) or partial.</p>
              )}
              {renderRows(exits, setExits, 'exit')}
            </div>
          </div>

          <div>
            <label className={labelCls}>Overall notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={cn(inputCls, 'min-h-[70px]')} placeholder="Setup, reasoning, lessons learned..." />
          </div>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={makePublic}
              onChange={(e) => setMakePublic(e.target.checked)}
              className="mt-0.5 accent-amber-500"
            />
            <span className="text-sm">
              {"Make this trade visible to all users (after Leoš's review)"}
              <span className="block text-xs text-muted-foreground">
                Unchecked: only you and Leoš can see it.
              </span>
            </span>
          </label>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0 bg-card">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initial ? 'Save Changes' : 'Submit Ticker'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
