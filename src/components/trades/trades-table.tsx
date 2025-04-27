"use client"

import React, { useState, useEffect } from 'react'
import { DataTable } from './data-table'
import { columns, Trade } from './columns'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import apiClient from '@/lib/api/client'

export function TradesTable() {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Trade Log</h1>
      <div className="bg-muted/40 p-3 rounded-md mb-4 text-sm text-muted-foreground">
        <p>Click the View button to see charts related to a specific trade.</p>
      </div>
      <DataTable 
        columns={columns} 
        data={trades} 
        onRowClickAction={handleViewCharts}
      />
    </div>
  )
}