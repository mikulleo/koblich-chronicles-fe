// src/components/trades/trades-table.tsx

"use client"

import React, { useState, useEffect } from 'react'
import { DataTable } from './data-table'
import { columns, Trade } from './columns'
import { TradeFilters, FilterState } from './trades-table-filters'
import { useRouter } from 'next/navigation'
import { AlertCircle, Filter, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import apiClient from '@/lib/api/client'

export function TradesTable() {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState | undefined>(undefined)
  const [showFilters, setShowFilters] = useState(false)
  
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/trades')
        
        if (response.data && response.data.docs) {
          setTrades(response.data.docs)
          setError(null)
        } else {
          setError('Unexpected response format from API')
        }
      } catch (error) {
        console.error('Error fetching trades:', error)
        setError('Failed to load trade data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchTrades()
  }, [])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }
  
  const handleViewCharts = (trade: Trade) => {
    // Navigate to charts page filtered by this ticker and date
    const tickerId = trade?.ticker?.id
    
    if (!tickerId) {
      console.warn("Ticker ID not found for trade:", trade)
      return
    }

    const tradeDate = new Date(trade.entryDate)
    
    // Calculate a date range around the trade date (3 days before and after)
    const fromDate = new Date(tradeDate)
    fromDate.setDate(fromDate.getDate() - 3)
    
    const toDate = new Date(tradeDate)
    toDate.setDate(toDate.getDate() + 3)
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]
    }
    
    // Create URL with query parameters
    const url = `/charts?tickers=${tickerId}&from=${formatDate(fromDate)}&to=${formatDate(toDate)}`
    
    router.push(url)
  }

  // Count active filters
  const getActiveFiltersCount = (filters: FilterState | undefined): number => {
    if (!filters) return 0
    
    let count = 0
    if (filters.type.length > 0) count++
    if (filters.tickers.length > 0) count++
    if (filters.dateRange) count++
    if (filters.hasModifiedStops !== null) count++
    if (filters.hasExits !== null) count++
    if (filters.status.length > 0) count++
    // Add range filters that aren't at their default values
    // (This would need to be calculated based on data ranges)
    
    return count
  }

  const activeFiltersCount = getActiveFiltersCount(filters)
  
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-md mb-6"></div>
        <div className="h-10 w-full bg-muted rounded-md mb-4"></div>
        <div className="border rounded-md p-4">
          <div className="h-6 bg-muted rounded-md mb-4 w-full"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-md mb-3 w-full"></div>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trade Log</h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze your trading performance
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-muted/40 p-3 rounded-md text-sm text-muted-foreground border-l-4 border-blue-400">
        <div className="flex items-center gap-2">
          <span>💡</span>
          <span>
            <strong>Pro tip:</strong> Click on any trade row to view related charts for that ticker and time period. 
            Use the filters to narrow down your trades by any criteria.
          </span>
        </div>
      </div>

      {/* Layout with Filters and Table */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 flex-shrink-0">
            {trades.length > 0 && (
              <TradeFilters
                data={trades}
                onFiltersChange={handleFiltersChange}
                className="sticky top-4"
              />
            )}
          </div>
        )}

        {/* Main Table Area */}
        <div className="flex-1 min-w-0">
          <DataTable 
            columns={columns} 
            data={trades} 
            onRowClickAction={handleViewCharts}
            filters={filters}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>
      </div>
    </div>
  )
}