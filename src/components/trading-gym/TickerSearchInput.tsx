'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Search } from 'lucide-react'
import type { SymbolSearchResult } from '@/lib/types/candlestick'

interface TickerSearchInputProps {
  value: string
  onChange: (symbol: string) => void
  className?: string
  placeholder?: string
}

/**
 * Ticker field with listing lookup. Searching by company name lets the user pick
 * the exact listing (SAP on NYSE vs SAP.DE on XETRA), so non-US trades get the
 * exchange-suffixed symbol the chart data provider needs. Free typing still works.
 */
export default function TickerSearchInput({
  value,
  onChange,
  className,
  placeholder = 'AAPL or "Toyota"',
}: TickerSearchInputProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<SymbolSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  /** Set when a suggestion was just picked, so we don't immediately re-search it */
  const skipNextSearchRef = useRef(false)

  // Keep the visible text in sync when the parent resets the field
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Debounced lookup
  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      fetch(`/api/symbol-search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          setResults(Array.isArray(json.results) ? json.results : [])
          setHighlight(0)
          setOpen(true)
          setLoading(false)
        })
        .catch((err) => {
          if (err.name === 'AbortError') return
          setResults([])
          setLoading(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Close on outside click
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const pick = (r: SymbolSearchResult) => {
    skipNextSearchRef.current = true
    setQuery(r.symbol)
    onChange(r.symbol)
    setOpen(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      // Enter picks the highlighted listing instead of submitting the form
      const hit = results[highlight]
      if (hit) {
        e.preventDefault()
        pick(hit)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(className, 'font-mono pr-8')}
        placeholder={placeholder}
        maxLength={24}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 opacity-50" />}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-[min(22rem,80vw)] max-h-60 overflow-y-auto overscroll-contain rounded-lg border bg-card shadow-xl py-1">
          {results.map((r, i) => (
            <li key={`${r.symbol}-${i}`}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(r)}
                className={cn(
                  'w-full text-left px-3 py-1.5 flex items-baseline gap-2',
                  i === highlight ? 'bg-amber-500/15' : 'hover:bg-muted/50',
                )}
              >
                <span className="font-mono text-sm font-semibold shrink-0">{r.symbol}</span>
                <span className="text-xs text-muted-foreground truncate flex-1">{r.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 shrink-0">
                  {r.exchange}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
