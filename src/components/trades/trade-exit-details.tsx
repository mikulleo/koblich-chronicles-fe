"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { ChartLine } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

// Define the exit interface
export interface TradeExit {
  price: number
  shares: number
  date: string
  reason?: 'strength' | 'stop' | 'backstop' | 'violation' | 'other'
  notes?: string
}

interface TradeExitDetailsProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  exits?: TradeExit[]
  totalShares: number
  tickerId: number | string
  entryPrice: number
  profitLossPercent?: number
  tradeType: 'long' | 'short'  // Added trade type
}

const getReasonColor = (reason?: string) => {
    switch (reason) {
        case 'strength':
          return 'bg-green-500 text-white'
        case 'stop':
          return 'bg-red-500 text-white'
        case 'backstop':
            return 'bg-yellow-500 text-white'
        case 'violation':
          return 'bg-blue-500 text-white'
        case 'other':
          return 'bg-purple-500 text-white'
        default:
          return 'bg-gray-500 text-white'
      }
}

// Color palette for the progress segments
const progressColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-emerald-500',
]

export function TradeExitDetails({
  isOpen,
  setIsOpen,
  exits = [],
  totalShares,
  tickerId,
  entryPrice,
  profitLossPercent,
  tradeType,
}: TradeExitDetailsProps) {
  const router = useRouter()
  
  // Sort exits by date (most recent first)
  const sortedExits = [...exits].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  
  // Calculate cumulative shares and percentages
  let remainingShares = totalShares
  const exitsWithCalculations = sortedExits.map((exit, index) => {
    // Calculate percentage of original position
    const percentOfTotal = (exit.shares / totalShares) * 100
    
    // Calculate percentage of remaining position before this exit
    const percentOfRemaining = (exit.shares / remainingShares) * 100
    
    // Calculate profit/loss
    const priceChange = exit.price - entryPrice
    let percentChange = (priceChange / entryPrice) * 100
    
    // For SHORT trades, invert the sign to correct the display
    if (tradeType === 'short') {
      percentChange = -percentChange
    }
    
    const profitLoss = priceChange * exit.shares
    
    // Update remaining shares for next exit
    const prevRemaining = remainingShares
    remainingShares -= exit.shares
    
    return {
      ...exit,
      percentOfTotal,
      percentOfRemaining,
      prevRemaining,
      profitLoss,
      percentChange,
      color: progressColors[index % progressColors.length],
    }
  })
  
  // Reverse exits for display order (earliest first)
  const chronologicalExits = [...exitsWithCalculations].reverse()
  
  // Calculate cumulative percentages for progress bar
  let cumulativePercent = 0
  const progressSegments = chronologicalExits.map(exit => {
    const start = cumulativePercent
    cumulativePercent += exit.percentOfTotal
    return {
      start,
      end: cumulativePercent,
      percent: exit.percentOfTotal,
      color: exit.color
    }
  })
  
  // Calculate total profit/loss
  const totalProfitLoss = exitsWithCalculations.reduce((sum, exit) => sum + exit.profitLoss, 0)
  const isProfitable = totalProfitLoss > 0
  
  // Handle navigation to charts for a specific exit date
  const navigateToCharts = (exitDate: string) => {
    const date = new Date(exitDate)
    
    // Create a date range around the exit date (1 day before and 2 days after)
    const fromDate = new Date(date)
    fromDate.setDate(fromDate.getDate() - 1)
    
    const toDate = new Date(date)
    toDate.setDate(toDate.getDate() + 2)
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]
    }
    
    // Create URL with query parameters
    const url = `/charts?tickers=${tickerId}&from=${formatDate(fromDate)}&to=${formatDate(toDate)}`
    
    setIsOpen(false) // Close the modal
    router.push(url) // Navigate to the charts page
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between">
            <span>Trade Exit Details</span>
            {profitLossPercent !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-muted-foreground">P/L:</span>
                <span className={`font-mono ${profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                </span>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {exits.length > 0 
              ? `Showing ${exits.length} exit${exits.length > 1 ? 's' : ''} for this trade`
              : 'No exits recorded for this trade'}
          </DialogDescription>
        </DialogHeader>
        
        {exits.length > 0 && (
          <div className="mt-4 space-y-6">
            {/* Progress bar showing exit distribution */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Position closure ({(cumulativePercent).toFixed(1)}% of {totalShares} shares)
              </div>
              <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                {progressSegments.map((segment, i) => (
                  <div
                    key={i}
                    className={`h-full ${segment.color}`}
                    style={{ width: `${segment.percent}%` }}
                    title={`Exit ${i+1}: ${segment.percent.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 shares</span>
                <span>{totalShares} shares</span>
              </div>
            </div>
            
            {/* Exit details */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">Exit details (chronological order)</div>
              
              <div className="border rounded-md divide-y">
                {chronologicalExits.map((exit, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full ${exit.color}`} 
                          title={`Exit ${index+1}`}
                        />
                        <span className="font-medium">
                          {format(parseISO(exit.date), "MMM d, yyyy")}
                        </span>
                        {exit.reason && (
                          <Badge className={getReasonColor(exit.reason)}>
                            {exit.reason.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2 py-0 flex items-center gap-1"
                        onClick={() => navigateToCharts(exit.date)}
                        >
                        <ChartLine className="h-4 w-4" />
                        <span className="text-xs">View Charts</span>
                        </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Price</div>
                        <div className="font-mono">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD"
                          }).format(exit.price)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Shares</div>
                        <div className="font-mono">
                          {exit.shares} ({exit.percentOfTotal.toFixed(1)}%)
                        </div>
                      </div>
                      {/* P/L in dollar amount is hidden for now but code is kept for future use */}
                      <div>
                        <div className="text-xs text-muted-foreground">P/L %</div>
                        <div className={`font-mono ${exit.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {exit.percentChange >= 0 ? '+' : ''}{exit.percentChange.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    {exit.notes && (
                      <div className="mt-2 text-sm text-muted-foreground bg-muted/40 p-2 rounded-md">
                        {exit.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}