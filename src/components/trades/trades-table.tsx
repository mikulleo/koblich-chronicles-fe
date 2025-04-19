"use client"

import React, { useState, useEffect } from 'react'
import { DataTable } from './data-table'
import { columns, Trade } from './columns'
import { useRouter } from 'next/navigation'

import apiClient from '@/lib/api/client'

// Mock data for demonstration
/*
const mockTrades: Trade[] = [
  {
    id: "1",
    type: "long",
    ticker: "LUNR",
    entryDate: "2025-02-25",
    entryPrice: 15.47,
    shares: 100,
    size: 46,
    initialStopLoss: 15.29,
    status: "open",
    riskPercent: 1.15,
  },
  {
    id: "2",
    type: "long",
    ticker: "ATAT",
    entryDate: "2025-03-06",
    entryPrice: 31.32,
    shares: 50,
    size: 13,
    initialStopLoss: 30.00,
    status: "open",
    riskPercent: 4.21,
  },
  {
    id: "3",
    type: "short",
    ticker: "CNX",
    entryDate: "2025-02-27",
    entryPrice: 29.15,
    shares: 75,
    size: 21,
    initialStopLoss: 29.85,
    status: "open",
    riskPercent: 2.40,
  },
  {
    id: "4",
    type: "short",
    ticker: "SE",
    entryDate: "2025-02-27",
    entryPrice: 132.54,
    shares: 10,
    size: 53,
    initialStopLoss: 134.70,
    status: "closed",
    riskPercent: 1.63,
  },
  {
    id: "5",
    type: "long",
    ticker: "CHKP",
    entryDate: "2025-03-07",
    entryPrice: 225.17,
    shares: 15,
    size: 36,
    initialStopLoss: 222.65,
    status: "partial",
    riskPercent: 1.12,
  },
  {
    id: "6",
    type: "long",
    ticker: "CHKP",
    entryDate: "2025-03-07",
    entryPrice: 230.59,
    shares: 20,
    initialStopLoss: 222.65,
    status: "closed",
    riskPercent: 3.44,
  },
]

// Map tickers to their IDs (this would come from your API in a real app)
const tickerMap: Record<string, string> = {
  "LUNR": "1",
  "ATAT": "2", 
  "CNX": "3",
  "SE": "4",
  "CHKP": "5"
} 
*/

export function TradesTable() {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  
  // In a real app, you would fetch trades from your API here
  useEffect(() => {
    const fetchTrades = async () => {
       try {
         const response = await apiClient.get('/trades')
         console.log('Response:', response.data);
         const data = await response.data;
         setTrades(data.docs);
       } catch (error) {
         console.error('Error fetching trades:', error);
       }
     };
    
     fetchTrades();
    
    // For now, use mock data:
    //setTrades(mockTrades);
  }, [])
  
  const handleRowClick = (trade: Trade) => {
    // Navigate to charts page filtered by this ticker and date
    //const tickerId = tickerMap[trade.ticker as string]
    const tickerId = (trade as Trade)?.ticker?.id
    console.log("Ticker ID:", tickerId)
    if (!tickerId) {
      console.warn("Ticker ID not found for trade:", trade)
      return
    }

    const tradeDate = new Date(trade.entryDate)
    console.log("Trade Date:", tradeDate)
    
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
  
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Trade Log</h1>
      <div className="bg-muted/40 p-2 rounded-md mb-4">
        <p className="text-sm text-muted-foreground">Click on any trade row to view related charts for that ticker and date.</p>
      </div>
      <DataTable 
        columns={columns} 
        data={trades} 
        onRowClickAction={handleRowClick}
      />
    </div>
  )
}