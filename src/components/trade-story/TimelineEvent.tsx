// src/components/trade-story/TimelineEvent.tsx
'use client'

import React from 'react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { 
  TrendingUp, 
  Shield, 
  LogOut,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventDetails {
  price?: number
  shares?: number // Kept for description in TradeStoryTimeline, but not displayed here
  riskAmount?: number // Kept for description in TradeStoryTimeline, but not displayed here
  positionSizeDescription?: string; // Added for display
  initialRiskPercent?: number; // Added for display
  previousStop?: number
  newStop?: number
  notes?: string
  // profitLoss?: number // Removed dollar amount
  profitLossPercent?: number // Added normal percentage
  normalizedProfitLossPercent?: number // Added normalized percentage
  reason?: string
}

interface TimelineEventProps {
  event: {
    date: string
    type: 'entry' | 'stopModified' | 'exit'
    title: string
    description: string
    details: EventDetails
  }
}

export default function TimelineEvent({ event }: TimelineEventProps) {
  const getEventIcon = () => {
    switch (event.type) {
      case 'entry':
        return <TrendingUp className="h-5 w-5" />
      case 'stopModified':
        return <Shield className="h-5 w-5" />
      case 'exit':
        return <LogOut className="h-5 w-5" />
      default:
        return <DollarSign className="h-5 w-5" />
    }
  }

  const getEventColor = () => {
    switch (event.type) {
      case 'entry':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'stopModified':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'exit':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className={cn("p-4 min-w-[200px] cursor-pointer hover:shadow-md transition-shadow", getEventColor())}>
      <div className="flex items-start justify-between mb-2">
        <div className={cn("p-2 rounded-full", getEventColor())}>
          {getEventIcon()}
        </div>
        <span className="text-xs">
          {format(new Date(event.date), 'MMM dd')}
        </span>
      </div>
      
      <h4 className="font-medium text-sm mb-1">{event.title}</h4>
      <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
      
      <div className="text-xs space-y-1">
        {event.type === 'entry' && event.details && (
          <>
            <p>Price: ${event.details.price}</p>
            {/* Display Position Size % */}
            {event.details.positionSizeDescription !== undefined && (
                <p> Size: {event.details.positionSizeDescription} </p>
            )}
            {/* Display Initial Risk % */}
            {event.details.initialRiskPercent !== undefined && (
                <p>Risk: {event.details.initialRiskPercent.toFixed(2)}%</p>
            )}
          </>
        )}
        
        {event.type === 'stopModified' && event.details && (
          <>
            <p>From: ${event.details.previousStop}</p>
            <p>To: ${event.details.newStop}</p>
            {event.details.notes && (
  <p className="italic mt-1 whitespace-normal break-words">
    {event.details.notes}
  </p>
)}

          </>
        )}
        
        {event.type === 'exit' && event.details && (
          <>
            <p>Price: ${event.details.price}</p>
            {/* <p>Shares: {event.details.shares}</p> */}
            {/* Display profit/loss percentages */}
            {event.details.profitLossPercent !== undefined && (
              <p className={cn(
                "font-medium",
                event.details.profitLossPercent >= 0 ? "text-green-600" : "text-red-600"
              )}>
                P/L: {event.details.profitLossPercent >= 0 ? '+' : ''}{event.details.profitLossPercent}%
                {event.details.normalizedProfitLossPercent !== undefined && 
                 event.details.normalizedProfitLossPercent !== event.details.profitLossPercent && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({event.details.normalizedProfitLossPercent >= 0 ? '+' : ''}{event.details.normalizedProfitLossPercent}% N)
                  </span>
                )}
              </p>
            )}
            {event.details.reason && (
              <p>Reason: {event.details.reason}</p>
            )}
            {event.details.notes && (
              <p className="text-xs italic mt-1 whitespace-normal break-words">
                {event.details.notes}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  )
}