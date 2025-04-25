'use client'

import React from 'react'
import { DateRange } from 'react-day-picker'
import { ChartTickerSelector, Ticker } from './chart-ticker-selector'
import { ChartDateRange } from './chart-date-range'
import { ChartTimeframeSelector, Timeframe } from './chart-timeframe-selector'
import { ChartTagSelector } from './chart-tag-selector'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export interface ChartFilters {
  tickers: string[]
  dateRange?: DateRange
  timeframes: Timeframe[]
  tags: string[] // Added tags to the interface
}

interface ChartFiltersProps {
  tickers: Ticker[]
  filters: ChartFilters
  onFiltersChangeAction: (filters: ChartFilters) => void
  onResetFiltersAction: () => void
}

export function ChartFiltersComponent({
  tickers,
  filters,
  onFiltersChangeAction,
  onResetFiltersAction,
}: ChartFiltersProps) {
  const hasActiveFilters = filters.tickers.length > 0 ||
                          filters.dateRange !== undefined ||
                          filters.timeframes.length > 0 ||
                          filters.tags.length > 0 // Include tags in active filters check

  const handleTickerChange = (selectedTickers: string[]) => {
    onFiltersChangeAction({
      ...filters,
      tickers: selectedTickers,
    })
  }

  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    onFiltersChangeAction({
      ...filters,
      dateRange,
    })
  }

  const handleTimeframeChange = (timeframes: Timeframe[]) => {
    onFiltersChangeAction({
      ...filters,
      timeframes,
    })
  }

  // Add handler for tag changes
  const handleTagChange = (selectedTags: string[]) => {
    onFiltersChangeAction({
      ...filters,
      tags: selectedTags,
    })
  }

  return (
    <div className="bg-card border rounded-md p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        {hasActiveFilters && (
          <Button 
             variant="ghost"
             size="sm"
             onClick={onResetFiltersAction}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Reset all
          </Button>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ChartTickerSelector
           tickers={tickers}
          selectedTickers={filters.tickers}
          onSelectTickerAction={handleTickerChange}
        />
        
        <ChartDateRange
           dateRange={filters.dateRange}
          onDateRangeChangeAction={handleDateRangeChange}
        />
        
        <ChartTimeframeSelector
           selectedTimeframes={filters.timeframes}
          onTimeframeChangeAction={handleTimeframeChange}
        />
        
        {/* Add the tag selector */}
        <ChartTagSelector
          selectedTags={filters.tags}
          onTagChangeAction={handleTagChange}
        />
      </div>
      
      <Separator className="my-4" />
      
      <div className="flex justify-end">
        <Button>
          <RefreshCw className="h-4 w-4 mr-2" />
          Apply Filters
        </Button>
      </div>
    </div>
  )
}