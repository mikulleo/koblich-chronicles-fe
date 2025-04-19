"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChartCarousel, ChartImage } from './chart-carousel'
import { ChartFiltersComponent, ChartFilters } from './chart-filters'
import { parseISO } from 'date-fns'
import { Timeframe } from './chart-timeframe-selector'
import apiClient from '@/lib/api/client'

// Define the Ticker interface according to your backend structure
export interface Tag {
  name: string;
  color: string;
  description?: string | null;
  chartsCount?: number | null;
}

export interface Ticker {
  id: number;
  symbol: string;
  name: string;
  description?: string | null;
  sector?: string | null;
  profitLoss?: number | null;
  chartsCount?: number | null;
  tradesCount?: number | null;
  tags: Tag[];
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// Define the API Chart interface based on the data structure we received
interface ApiChart {
  id: number;
  displayTitle?: string;
  image: {
    url: string;
    filename: string;
    sizes: {
      [key: string]: {
        url: string | null;
        width: number | null;
        height: number | null;
      };
    };
  };
  ticker: Ticker;
  timeframe: Timeframe;
  timestamp: string;
  notes?: string;
  tags?: Tag[]; // We'll map this to string[] for ChartImage
  annotatedImage?: string | null;
}

export function ChartGallery() {
  const searchParams = useSearchParams()
  
  // Initialize filters from URL params if they exist
  const initialTickers = searchParams.get('tickers')?.split(',') || []
  const fromDate = searchParams.get('from') ? parseISO(searchParams.get('from')!) : undefined
  const toDate = searchParams.get('to') ? parseISO(searchParams.get('to')!) : undefined
  const initialTimeframes = (searchParams.get('timeframes')?.split(',') || []) as Timeframe[]
  
  const [filters, setFilters] = useState<ChartFilters>({
    tickers: initialTickers,
    dateRange: fromDate && toDate ? { from: fromDate, to: toDate } : undefined,
    timeframes: initialTimeframes.length > 0 ? initialTimeframes : ['daily', 'weekly'],
  })
  
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [tickersLoading, setTickersLoading] = useState(true)
  const [tickersError, setTickersError] = useState<Error | null>(null)
  
  const [charts, setCharts] = useState<ChartImage[]>([])
  const [chartsLoading, setChartsLoading] = useState(true)
  const [chartsError, setChartsError] = useState<Error | null>(null)
  
  const [filteredCharts, setFilteredCharts] = useState<ChartImage[]>([])
  
  // Fetch tickers from API using apiClient which has the correct API URL configuration
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        setTickersLoading(true)
        const response = await apiClient.get('/tickers')
        setTickers(response.data.docs)
        setTickersError(null)
      } catch (error) {
        console.error('Error fetching tickers:', error)
        setTickersError(error instanceof Error ? error : new Error('Failed to fetch tickers'))
      } finally {
        setTickersLoading(false)
      }
    }
    
    fetchTickers()
  }, [])
  
  // Fetch charts from API using apiClient
  useEffect(() => {
    const fetchCharts = async () => {
      try {
        setChartsLoading(true)
        const response = await apiClient.get('/charts')
        
        if (response.data && response.data.docs) {
          // Map API charts to ChartImage format
          const mappedCharts: ChartImage[] = response.data.docs.map((chart: ApiChart) => {
            // Get tag names from chart.tags (if available)
            const tagNames = Array.isArray(chart.tags) 
              ? chart.tags.map(tag => typeof tag === 'object' && tag.name ? tag.name : String(tag))
              : [];
            
            // Get proper image URL - we need to make sure we use the correct base URL
            // If the URL is absolute (starts with http), use it as is
            // If it's relative, it should come from the same API server
            const imageUrl = chart.image.url.startsWith('http') 
              ? chart.image.url 
              : `${apiClient.defaults.baseURL?.split('/api')[0]}${chart.image.url}`;
            
            return {
              id: String(chart.id),
              url: imageUrl,
              // Use displayTitle if available, otherwise construct a title
              title: chart.displayTitle || `${chart.ticker.symbol} ${chart.timeframe} Chart`,
              ticker: chart.ticker.symbol,
              timestamp: chart.timestamp,
              timeframe: chart.timeframe,
              tags: tagNames,
              // Include additional properties if they're used in your component
              tickerId: chart.ticker.id,
              notes: chart.notes,
              // If annotatedImage exists and has a URL, process it the same way as the main image URL
              annotatedImageUrl: chart.annotatedImage 
                ? (chart.annotatedImage.startsWith('http') 
                  ? chart.annotatedImage 
                  : `${apiClient.defaults.baseURL?.split('/api')[0]}${chart.annotatedImage}`)
                : null,
            };
          });
          
          setCharts(mappedCharts);
        }
        
        setChartsError(null)
      } catch (error) {
        console.error('Error fetching charts:', error)
        setChartsError(error instanceof Error ? error : new Error('Failed to fetch charts'))
      } finally {
        setChartsLoading(false)
      }
    }
    
    fetchCharts()
  }, [])
  
  // Apply filters to charts when filters or charts change
  useEffect(() => {
    if (charts.length === 0) return;
    
    let filtered = [...charts]
    
    // Filter by tickers
    if (filters.tickers.length > 0) {
      const tickerSymbols = filters.tickers.map(id => {
        // Convert string id to number for comparison with API data
        const tickerId = typeof id === 'string' ? parseInt(id, 10) : id
        const ticker = tickers.find(t => t.id === tickerId)
        return ticker?.symbol
      }).filter(Boolean) as string[]
      
      filtered = filtered.filter(chart => tickerSymbols.includes(chart.ticker))
    }
    
    // Filter by date range
    if (filters.dateRange?.from) {
      filtered = filtered.filter(chart => {
        const chartDate = new Date(chart.timestamp)
        return chartDate >= filters.dateRange!.from!
      })
      
      if (filters.dateRange.to) {
        filtered = filtered.filter(chart => {
          const chartDate = new Date(chart.timestamp)
          return chartDate <= filters.dateRange!.to!
        })
      }
    }
    
    // Filter by timeframes
    if (filters.timeframes.length > 0) {
      filtered = filtered.filter(chart => filters.timeframes.includes(chart.timeframe))
    }
    
    setFilteredCharts(filtered)
    
    // Update URL with filters
    const params = new URLSearchParams()
    
    if (filters.tickers.length > 0) {
      params.set('tickers', filters.tickers.join(','))
    }
    
    if (filters.dateRange?.from) {
      params.set('from', filters.dateRange.from.toISOString().split('T')[0])
      
      if (filters.dateRange.to) {
        params.set('to', filters.dateRange.to.toISOString().split('T')[0])
      }
    }
    
    if (filters.timeframes.length > 0) {
      params.set('timeframes', filters.timeframes.join(','))
    }
    
    // Replace the URL with the new search params
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.replaceState({}, '', newUrl)
    
  }, [filters, charts, tickers])
  
  const handleFiltersChange = (newFilters: ChartFilters) => {
    setFilters(newFilters)
  }
  
  const handleResetFilters = () => {
    setFilters({
      tickers: [],
      dateRange: undefined,
      timeframes: ['daily', 'weekly'],
    })
  }
  
  const handleChartClick = (chart: ChartImage) => {
    console.log('Chart clicked:', chart)
    // Additional functionality can be added here
  }
  
  // Display loading state while fetching initial data
  if (tickersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading tickers...</p>
      </div>
    )
  }
  
  if (tickersError) {
    return (
      <div className="flex items-center justify-center h-64 bg-destructive/10 rounded-md">
        <p className="text-destructive">Error loading tickers: {tickersError.message}</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <ChartFiltersComponent
        tickers={tickers}
        filters={filters}
        onFiltersChangeAction={handleFiltersChange}
        onResetFiltersAction={handleResetFilters}
      />
      
      {chartsLoading ? (
        <div className="flex items-center justify-center h-64 bg-muted rounded-md">
          <p className="text-muted-foreground">Loading charts...</p>
        </div>
      ) : chartsError ? (
        <div className="flex items-center justify-center h-64 bg-destructive/10 rounded-md">
          <p className="text-destructive">Error loading charts: {chartsError.message}</p>
        </div>
      ) : filteredCharts.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-muted rounded-md">
          <p className="text-muted-foreground">No charts match your current filters.</p>
        </div>
      ) : (
        <ChartCarousel 
          charts={filteredCharts}
          onChartClick={handleChartClick}
        />
      )}
    </div>
  )
}