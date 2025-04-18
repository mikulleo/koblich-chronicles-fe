// Common types used throughout the application

export interface Ticker {
  id: string;
  symbol: string;
  name: string;
  description?: string;
  sector?: string;
  tags?: Tag[];
  chartsCount?: number;
  tradesCount?: number;
  profitLoss?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chart {
  id: string;
  image: Media;
  ticker: Ticker | string;
  timestamp: string;
  notes?: string;
  tags?: Tag[];
  annotatedImage?: Media;
  measurements?: {
    name: string;
    startPrice: number;
    endPrice: number;
    percentageChange?: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  ticker: Ticker | string;
  type: 'long' | 'short';
  entryDate: string;
  entryPrice: number;
  shares: number;
  initialStopLoss: number;
  status: 'open' | 'closed' | 'partial';
  modifiedStops?: {
    price: number;
    date: string;
    notes?: string;
  }[];
  exits?: {
    price: number;
    shares: number;
    date: string;
    reason?: 'target' | 'stop' | 'technical' | 'fundamental' | 'other';
    notes?: string;
  }[];
  currentPrice?: number;
  currentMetrics?: {
    profitLossAmount?: number;
    profitLossPercent?: number;
    rRatio?: number;
    riskAmount?: number;
    riskPercent?: number;
    breakEvenShares?: number;
    lastUpdated?: string;
  };
  notes?: string;
  riskAmount?: number;
  riskPercent?: number;
  profitLossAmount?: number;
  profitLossPercent?: number;
  rRatio?: number;
  daysHeld?: number;
  positionSize?: number;
  targetPositionSize?: number;
  normalizationFactor?: number;
  normalizedMetrics?: {
    profitLossAmount?: number;
    profitLossPercent?: number;
    rRatio?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  chartsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  alt?: string;
  url: string;
  filename: string;
  mimeType: string;
  filesize: number;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  battingAverage: number;
  averageWinPercent: number;
  averageLossPercent: number;
  winLossRatio: number;
  adjustedWinLossRatio: number;
  averageRRatio: number;
  profitFactor: number;
  expectancy: number;
  averageDaysHeldWinners: number;
  averageDaysHeldLosers: number;
  maxGainPercent: number;
  maxLossPercent: number;
  maxGainLossRatio: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  normalized: {
    totalProfitLoss: number;
    totalProfitLossPercent: number;
    averageRRatio: number;
    profitFactor: number;
    maxGainPercent: number;
    maxLossPercent: number;
    maxGainLossRatio: number;
    averageWinPercent: number;
    averageLossPercent: number;
    winLossRatio: number;
    adjustedWinLossRatio: number;
    expectancy: number;
  };
}
