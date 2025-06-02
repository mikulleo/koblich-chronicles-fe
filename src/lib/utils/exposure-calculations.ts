// src/lib/utils/exposure-calculations.ts

export interface TradeExit {
  price: number
  shares: number
  date: string
  reason?: string
  notes?: string
}

export interface ExposureTrade {
  id: string
  ticker: {
    id: string
    symbol: string
  }
  entryPrice: number
  shares: number
  status: 'open' | 'partial' | 'closed'
  exits?: TradeExit[]
  positionSize?: number
}

export interface ExposureCalculationResult {
  originalExposure: number
  currentExposure: number
  remainingShares: number
  exitedShares: number
  exitedValue: number
  exposureReduction: number
  exposureReductionPercent: number
}

/**
 * Calculate current exposure for a trade position
 */
export function calculateTradeExposure(trade: ExposureTrade): ExposureCalculationResult {
  const originalShares = trade.shares
  const entryPrice = trade.entryPrice
  const originalExposure = originalShares * entryPrice
  
  // Calculate exited shares and value
  let exitedShares = 0
  let exitedValue = 0
  
  if (trade.exits && trade.exits.length > 0) {
    exitedShares = trade.exits.reduce((sum, exit) => sum + exit.shares, 0)
    exitedValue = trade.exits.reduce((sum, exit) => sum + (exit.shares * entryPrice), 0)
  }
  
  // Calculate remaining exposure
  const remainingShares = Math.max(0, originalShares - exitedShares)
  const currentExposure = remainingShares * entryPrice
  
  // Calculate exposure reduction
  const exposureReduction = originalExposure - currentExposure
  const exposureReductionPercent = originalExposure > 0 ? (exposureReduction / originalExposure) * 100 : 0
  
  return {
    originalExposure,
    currentExposure,
    remainingShares,
    exitedShares,
    exitedValue,
    exposureReduction,
    exposureReductionPercent
  }
}

/**
 * Calculate total portfolio exposure
 */
export function calculatePortfolioExposure(trades: ExposureTrade[]) {
  let totalOriginalExposure = 0
  let totalCurrentExposure = 0
  let totalExitedValue = 0
  
  const tradeExposures = trades.map(trade => {
    const exposure = calculateTradeExposure(trade)
    totalOriginalExposure += exposure.originalExposure
    totalCurrentExposure += exposure.currentExposure
    totalExitedValue += exposure.exitedValue
    return { trade, exposure }
  })
  
  const totalReduction = totalOriginalExposure - totalCurrentExposure
  const totalReductionPercent = totalOriginalExposure > 0 ? (totalReduction / totalOriginalExposure) * 100 : 0
  
  return {
    totalOriginalExposure,
    totalCurrentExposure,
    totalExitedValue,
    totalReduction,
    totalReductionPercent,
    tradeCount: trades.length,
    openTradeCount: trades.filter(t => t.status === 'open').length,
    partialTradeCount: trades.filter(t => t.status === 'partial').length,
    tradeExposures
  }
}

/**
 * Distribute trades across buckets using a balanced algorithm
 */
export interface ExposureBucket {
  id: number
  trades: ExposureTrade[]
  totalExposure: number
  percentageFull: number
  targetExposure: number
}

export function distributeTradesToBuckets(
  trades: ExposureTrade[], 
  bucketCount: number = 4, 
  targetTotalExposure: number = 400
): ExposureBucket[] {
  const targetPerBucket = targetTotalExposure / bucketCount
  
  // Initialize buckets
  const buckets: ExposureBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    id: i + 1,
    trades: [],
    totalExposure: 0,
    percentageFull: 0,
    targetExposure: targetPerBucket
  }))
  
  // Calculate exposures and sort trades by size (largest first)
  const tradesWithExposure = trades.map(trade => ({
    trade,
    exposure: calculateTradeExposure(trade).currentExposure
  })).sort((a, b) => b.exposure - a.exposure)
  
  // Distribute trades using balanced algorithm
  for (const { trade, exposure } of tradesWithExposure) {
    // Find bucket with least total exposure
    const targetBucket = buckets.reduce((min, bucket) => 
      bucket.totalExposure < min.totalExposure ? bucket : min
    )
    
    targetBucket.trades.push(trade)
    targetBucket.totalExposure += exposure
  }
  
  // Calculate percentages
  buckets.forEach(bucket => {
    bucket.percentageFull = bucket.targetExposure > 0 
      ? (bucket.totalExposure / bucket.targetExposure) * 100 
      : 0
  })
  
  return buckets
}

/**
 * Calculate exposure risk levels
 */
export interface ExposureRiskAssessment {
  level: 'low' | 'moderate' | 'high' | 'critical'
  color: string
  bgColor: string
  message: string
  percentage: number
}

export function assessExposureRisk(
  currentExposure: number, 
  targetExposure: number = 400
): ExposureRiskAssessment {
  const percentage = (currentExposure / targetExposure) * 100
  
  if (percentage < 50) {
    return {
      level: 'low',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      message: 'Low exposure - room for additional positions',
      percentage
    }
  }
  
  if (percentage < 80) {
    return {
      level: 'moderate',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      message: 'Moderate exposure - monitor closely',
      percentage
    }
  }
  
  if (percentage < 100) {
    return {
      level: 'high',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      message: 'High exposure - approaching target limit',
      percentage
    }
  }
  
  return {
    level: 'critical',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    message: 'Critical exposure - exceeds recommended target',
    percentage
  }
}

/**
 * Format currency values consistently
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format percentage values consistently
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}