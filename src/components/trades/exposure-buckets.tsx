// src/components/trades/exposure-buckets.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Target, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import apiClient from '@/lib/api/client'

// Define types
interface ExposureTrade {
  id: string
  ticker: {
    id: string
    symbol: string
  }
  status: 'open' | 'partial'
  exits?: Array<{
    price: number
    shares: number
    date: string
  }>
  normalizationFactor: number
  sizePercent: number // normalizationFactor * 100
  remainingPercent: number // For partial positions
}

interface BucketPosition {
  trade: ExposureTrade
  percentageInBucket: number
  isPartial: boolean
  bucketSpan: number[]
}

interface BucketData {
  id: number
  positions: BucketPosition[]
  totalPercent: number
  capacityUsed: number // 0-100% of this bucket's 400% capacity
  targetPercent: number
}

export function ExposureBuckets() {
  const [trades, setTrades] = useState<ExposureTrade[]>([])
  const [buckets, setBuckets] = useState<BucketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPercent, setTotalPercent] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  
  // Configuration - 4 buckets, each holds 400%, total target = 1600%
  const BUCKET_COUNT = 4
  const TARGET_PER_BUCKET = 400 // 400% per bucket
  const TOTAL_TARGET_PERCENT = TARGET_PER_BUCKET * BUCKET_COUNT // 1600% total
  
  useEffect(() => {
    fetchOpenTrades()
  }, [])
  
  const fetchOpenTrades = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get('/trades', {
        params: {
          limit: 1000,
          depth: 1
        }
      })
      
      if (response.data && response.data.docs) {
        const openTrades = response.data.docs.filter((trade: any) => 
          trade.status === 'open' || trade.status === 'partial'
        )
        
        const tradesData = openTrades.map(calculateTradePercentages)
        setTrades(tradesData)
        distributeTradesToBuckets(tradesData)
      }
    } catch (err) {
      console.error('Error fetching trades:', err)
      setError('Failed to load exposure data')
    } finally {
      setLoading(false)
    }
  }
  
  const calculateTradePercentages = (trade: any): ExposureTrade => {
    // Use normalizationFactor as defined in columns.tsx
    const sizePercent = trade.normalizationFactor ? Math.round(trade.normalizationFactor * 100) : 0
    
    // For partial positions, calculate remaining percentage
    let remainingPercent = sizePercent
    if (trade.status === 'partial' && trade.exits && trade.shares) {
      const exitedShares = trade.exits.reduce((sum: number, exit: any) => sum + exit.shares, 0)
      const remainingShares = trade.shares - exitedShares
      const remainingRatio = remainingShares / trade.shares
      remainingPercent = Math.round(sizePercent * remainingRatio)
    }
    
    return {
      id: trade.id,
      ticker: trade.ticker,
      status: trade.status,
      exits: trade.exits,
      normalizationFactor: trade.normalizationFactor || 0,
      sizePercent,
      remainingPercent
    }
  }
  
  const distributeTradesToBuckets = (tradesData: ExposureTrade[]) => {
    // Sort trades by remaining percentage (largest first)
    const sortedTrades = [...tradesData].sort((a, b) => b.remainingPercent - a.remainingPercent)
    
    // Initialize buckets
    const newBuckets: BucketData[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
      id: i + 1,
      positions: [],
      totalPercent: 0,
      capacityUsed: 0,
      targetPercent: TARGET_PER_BUCKET
    }))
    
    // Distribute each position
    for (const trade of sortedTrades) {
      const positionPercent = trade.remainingPercent
      
      if (positionPercent <= TARGET_PER_BUCKET) {
        // Position fits in one bucket - find best fit
        const targetBucket = newBuckets.reduce((best, bucket) => 
          (TARGET_PER_BUCKET - bucket.totalPercent) > (TARGET_PER_BUCKET - best.totalPercent) ? bucket : best
        )
        
        targetBucket.positions.push({
          trade,
          percentageInBucket: Math.round(positionPercent * 10) / 10,
          isPartial: false,
          bucketSpan: [targetBucket.id]
        })
        targetBucket.totalPercent += Math.round(positionPercent * 10) / 10
      } else {
        // Large position spans multiple buckets
        let remainingPercent = positionPercent
        const bucketSpan: number[] = []
        
        for (const bucket of newBuckets) {
          if (remainingPercent <= 0) break
          
          const availableSpace = Math.max(0, TARGET_PER_BUCKET - bucket.totalPercent)
          const percentInThisBucket = Math.round(Math.min(remainingPercent, Math.max(availableSpace, TARGET_PER_BUCKET * 0.3)) * 10) / 10
          
          if (percentInThisBucket > 0) {
            bucket.positions.push({
              trade,
              percentageInBucket: Math.round(percentInThisBucket * 10) / 10,
              isPartial: true,
              bucketSpan: []
            })
            bucket.totalPercent += Math.round(percentInThisBucket * 10) / 10
            bucketSpan.push(bucket.id)
            remainingPercent -= percentInThisBucket
            remainingPercent = Math.round(remainingPercent * 10) / 10
          }
        }
        
        // Update bucket span for all parts
        newBuckets.forEach(bucket => {
          bucket.positions.forEach(pos => {
            if (pos.trade.id === trade.id) {
              pos.bucketSpan = bucketSpan
            }
          })
        })
      }
    }
    
    // Calculate metrics
    let total = 0
    newBuckets.forEach(bucket => {
      bucket.totalPercent = Math.round(bucket.totalPercent * 10) / 10
      bucket.capacityUsed = Math.round((bucket.totalPercent / TARGET_PER_BUCKET) * 100 * 10) / 10
      total += bucket.totalPercent
    })
    
    setBuckets(newBuckets)
    setTotalPercent(Math.round(total * 10) / 10)
  }
  
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOpenTrades()
    setRefreshing(false)
  }
  
  const getExposureLevel = () => {
    const bucketsFull = totalPercent / TARGET_PER_BUCKET // How many buckets worth of exposure
    if (bucketsFull < 0.5) return { 
      level: 'conservative', 
      description: 'defensive positioning',
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100' 
    }
    if (bucketsFull < 1) return { 
      level: 'normal conditions', 
      description: 'slightly aggressive',
      color: 'text-green-600', 
      bgColor: 'bg-green-100' 
    }
    if (bucketsFull < 2) return { 
      level: 'very good conditions', 
      description: 'aggressive positioning',
      color: 'text-amber-600', 
      bgColor: 'bg-amber-100' 
    }
    return { 
      level: 'premium conditions', 
      description: 'extremely aggressive',
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100' 
    }
  }
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Position Exposure Buckets</CardTitle>
          <CardDescription>Loading exposure data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  const exposureLevel = getExposureLevel()
  
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Position Exposure Buckets
                </CardTitle>
                <CardDescription>
                  4 buckets × 400% each = 1600% total target (400% = 100% full equity)
                </CardDescription>
              </div>
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm" 
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{totalPercent.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Total Exposure</div>
                <div className="text-xs text-muted-foreground">{(totalPercent / 4).toFixed(1)}% of full equity</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${exposureLevel.color}`}>
                  {(totalPercent / TARGET_PER_BUCKET).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Buckets Full</div>
                <div className="text-xs text-muted-foreground">out of 4 total buckets</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{trades.length}</div>
                <div className="text-sm text-muted-foreground">Active Positions</div>
                <div className="text-xs text-muted-foreground">
                  {new Set(trades.map(trade => trade.ticker.symbol)).size} unique tickers
                </div>
              </div>
              <div className="space-y-1">
                <Badge className={`${exposureLevel.bgColor} ${exposureLevel.color}`} variant="secondary">
                  {exposureLevel.level.toUpperCase()}
                </Badge>
                <div className="text-xs text-muted-foreground capitalize">
                  {exposureLevel.description}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Buckets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {buckets.map((bucket) => (
            <div key={bucket.id} className="flex flex-col items-center space-y-4">
              {/* Bucket Header */}
              <div className="text-center">
                <h3 className="text-lg font-bold">Bucket {bucket.id}</h3>
                <p className="text-sm text-muted-foreground">
                  {bucket.totalPercent.toFixed(1)}% / {TARGET_PER_BUCKET}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {(bucket.totalPercent / 4).toFixed(1)}% of full equity
                </p>
                <Badge variant="outline" className="mt-1">
                  {bucket.positions.length} position{bucket.positions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {/* Modern Bucket Visual */}
              <div className="relative">
                <svg width="140" height="180" viewBox="0 0 140 180" className="drop-shadow-lg">
                  {/* Bucket outline */}
                  <defs>
                    <linearGradient id={`bucketGradient${bucket.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id={`fillGradient${bucket.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={
                        bucket.capacityUsed > 100 ? '#f97316' : 
                        bucket.capacityUsed > 80 ? '#8b5cf6' : 
                        bucket.capacityUsed > 50 ? '#06b6d4' : '#10b981'
                      } />
                      <stop offset="100%" stopColor={
                        bucket.capacityUsed > 100 ? '#ea580c' : 
                        bucket.capacityUsed > 80 ? '#7c3aed' : 
                        bucket.capacityUsed > 50 ? '#0891b2' : '#059669'
                      } />
                    </linearGradient>
                  </defs>
                  
                  {/* Bucket shape */}
                  <path 
                    d="M25 20 L115 20 L105 160 L35 160 Z" 
                    fill={`url(#bucketGradient${bucket.id})`}
                    stroke="#475569" 
                    strokeWidth="2"
                  />
                  
                  {/* Fill level */}
                  {bucket.totalPercent > 0 && (
                    <path 
                      d={`M${25 + (115-25) * (1 - Math.min(bucket.capacityUsed, 100)/100) * 0.15} ${20 + (160-20) * (1 - Math.min(bucket.capacityUsed, 100)/100)} L${115 - (115-25) * (1 - Math.min(bucket.capacityUsed, 100)/100) * 0.15} ${20 + (160-20) * (1 - Math.min(bucket.capacityUsed, 100)/100)} L105 160 L35 160 Z`}
                      fill={`url(#fillGradient${bucket.id})`}
                      opacity="0.8"
                    />
                  )}
                  
                  {/* Bucket rim */}
                  <ellipse cx="70" cy="20" rx="45" ry="8" fill="#475569" />
                  <ellipse cx="70" cy="20" rx="45" ry="8" fill="none" stroke="#334155" strokeWidth="1" />
                  
                  {/* Handles */}
                  <ellipse cx="15" cy="50" rx="8" ry="15" fill="#475569" stroke="#334155" strokeWidth="1" />
                  <ellipse cx="125" cy="50" rx="8" ry="15" fill="#475569" stroke="#334155" strokeWidth="1" />
                </svg>
                
                {/* Position blocks inside bucket */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 pt-12">
                  <div className="space-y-1">
                    {bucket.positions.map((position, index) => (
                      <Tooltip key={`${position.trade.id}-${index}`}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`relative rounded px-2 py-1 text-xs font-bold text-white text-center transition-all hover:scale-105 ${
                              position.trade.status === 'open' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-cyan-500 shadow-cyan-200'
                            } shadow-md`}
                            style={{ 
                              minHeight: '20px',
                              fontSize: '10px'
                            }}
                          >
                            <div className="flex items-center justify-center">
                              <span className="truncate max-w-[60px]">{position.trade.ticker.symbol}</span>
                              <span className="ml-1 text-[9px]">{position.percentageInBucket.toFixed(1)}%</span>
                            </div>
                            {position.isPartial && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full text-white text-[8px] flex items-center justify-center">
                                M
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <div className="font-medium">{position.trade.ticker.symbol}</div>
                            <div>Status: {position.trade.status.toUpperCase()}</div>
                            <div>Total Size: {position.trade.sizePercent.toFixed(1)}%</div>
                            <div>In this bucket: {position.percentageInBucket.toFixed(1)}%</div>
                            {position.isPartial && (
                              <div>Spans buckets: {position.bucketSpan.join(', ')}</div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Capacity indicator */}
              <div className="text-center">
                <div className="text-lg font-bold">
                  {bucket.capacityUsed.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Capacity</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Status and Legend */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-sm">Open positions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-cyan-500 rounded"></div>
                <span className="text-sm">Partial positions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Multi-bucket positions (M)</span>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Each bucket target: 400% (100% full equity) | Total target: 1600%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${exposureLevel.bgColor}`}>
                <div className={`w-3 h-3 rounded-full ${exposureLevel.color.replace('text-', 'bg-')}`}></div>
                <div>
                  <div className={`font-medium ${exposureLevel.color} capitalize`}>
                    {exposureLevel.level}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {exposureLevel.description}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                <div className="space-y-1">
                  <div>• 0-0.5 buckets: Conservative/defensive</div>
                  <div>• 0.5-1 buckets: Normal conditions, slightly aggressive</div>
                  <div>• 1-2 buckets: Very good conditions, aggressive</div>
                  <div>• 2-4 buckets: Premium conditions, extremely aggressive</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}