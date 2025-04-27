"use client"

import React from 'react'
import { DataTable } from '@/components/trades/data-table'
import { columns, Trade } from '@/components/trades/columns'

// Mock data for demonstration
const mockTrades: Trade[] = [
  {
    id: "1",
    type: "long",
    ticker: {
      id: 1,
      symbol: "AAPL",
      name: "Apple Inc.",
      tags: [],
      createdAt: "2023-01-01",
    },
    entryDate: "2023-01-10",
    entryPrice: 150.25,
    shares: 200,
    initialStopLoss: 145.50,
    status: "closed",
    normalizationFactor: 1,
    riskAmount: 950,
    riskPercent: 3.16,
    profitLossAmount: 1900,
    profitLossPercent: 6.32,
    rRatio: 2.0,
    exits: [
      {
        price: 160.25,
        shares: 100,
        date: "2023-01-15",
        reason: "strength",
        notes: "Hit first price target, taking partial profits"
      },
      {
        price: 165.75,
        shares: 100,
        date: "2023-01-20",
        reason: "violation",
        notes: "Bearish reversal pattern forming, exiting remaining position"
      }
    ]
  },
  {
    id: "2",
    type: "short",
    ticker: {
      id: 2,
      symbol: "NFLX",
      name: "Netflix Inc.",
      tags: [],
      createdAt: "2023-01-01",
    },
    entryDate: "2023-02-05",
    entryPrice: 400.75,
    shares: 50,
    initialStopLoss: 415.00,
    status: "partial",
    normalizationFactor: 0.5,
    riskAmount: 712.50,
    riskPercent: 3.56,
    profitLossAmount: 2503.75,
    profitLossPercent: 12.50,
    rRatio: 3.51,
    modifiedStops: [
      {
        price: 410.00,
        date: "2023-02-07",
        notes: "Tightening stop as market shows weakness"
      },
      {
        price: 395.00,
        date: "2023-02-12",
        notes: "Moving stop below recent support level"
      }
    ],
    exits: [
      {
        price: 350.25,
        shares: 30,
        date: "2023-02-15",
        reason: "strength",
        notes: "Hit first target, taking partial profits"
      }
    ]
  },
  {
    id: "3",
    type: "long",
    ticker: {
      id: 3,
      symbol: "MSFT",
      name: "Microsoft Corporation",
      tags: [],
      createdAt: "2023-01-01",
    },
    entryDate: "2023-03-10",
    entryPrice: 250.50,
    shares: 100,
    initialStopLoss: 245.00,
    status: "open",
    normalizationFactor: 1.25,
    riskAmount: 550,
    riskPercent: 2.20,
    currentPrice: 275.25
  },
  {
    id: "4",
    type: "long",
    ticker: {
      id: 4,
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      tags: [],
      createdAt: "2023-01-01",
    },
    entryDate: "2023-04-05",
    entryPrice: 3100.75,
    shares: 10,
    initialStopLoss: 3000.00,
    status: "partial",
    normalizationFactor: 0.75,
    riskAmount: 1007.50,
    riskPercent: 3.25,
    profitLossAmount: 856.25,
    profitLossPercent: 2.76,
    rRatio: 0.85,
    modifiedStops: [
      {
        price: 3050.00,
        date: "2023-04-10",
        notes: "Raising stop after positive earnings"
      }
    ],
    exits: [
      {
        price: 3150.50,
        shares: 3,
        date: "2023-04-12",
        reason: "backstop",
        notes: "Taking partial profits at first target"
      },
      {
        price: 3180.25,
        shares: 2,
        date: "2023-04-15",
        reason: "other",
        notes: "Technical resistance reached"
      }
    ]
  },
  {
    id: "5",
    type: "short",
    ticker: {
      id: 5,
      symbol: "TSLA",
      name: "Tesla Inc.",
      tags: [],
      createdAt: "2023-01-01",
    },
    entryDate: "2023-05-01",
    entryPrice: 180.50,
    shares: 100,
    initialStopLoss: 188.75,
    status: "closed",
    normalizationFactor: 1,
    riskAmount: 825,
    riskPercent: 4.57,
    profitLossAmount: -825,
    profitLossPercent: -4.57,
    rRatio: -1,
    exits: [
      {
        price: 188.75,
        shares: 100,
        date: "2023-05-03",
        reason: "stop",
        notes: "Stop loss triggered on market rally"
      }
    ]
  }
]

export default function TradesDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Trades Demo</h1>
      <p className="text-muted-foreground mb-8">
        This page demonstrates the trade exits feature. Click on the blue button in the "Exits" column to see details.
      </p>
      
      <DataTable 
        columns={columns} 
        data={mockTrades} 
        onRowClickAction={(trade) => {
          console.log("Row clicked:", trade)
        }}
      />
    </div>
  )
}