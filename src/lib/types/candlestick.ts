// Types for the candlestick chart replay system

export interface CandleData {
  time: string // YYYY-MM-DD format for lightweight-charts
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface TradeMarker {
  time: string
  position: 'aboveBar' | 'belowBar' | 'inBar'
  color: string
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown'
  text: string
  type: 'entry' | 'exit' | 'stopModified' | 'prediction' | 'add'
}

export interface PriceLine {
  price: number
  color: string
  lineWidth: number
  lineStyle: number // 0=solid, 1=dotted, 2=dashed, 3=large-dashed
  title: string
}

export interface UserPrediction {
  type: 'buy' | 'sell' | 'hold' | 'tightenStop'
  price?: number
  date: string
}

export interface DecisionPoint {
  prompt: string
  options: ('buy' | 'sell' | 'hold' | 'tightenStop')[]
  actualDecision: 'buy' | 'sell' | 'hold' | 'tightenStop'
  actualDecisions: ('buy' | 'sell' | 'hold' | 'tightenStop')[]
  actualPrice?: number
  stepIndex: number
}

export interface PredictionComparison {
  userAction: string
  actualAction: string
  userPrice?: number
  actualPrice?: number
  verdict: 'match' | 'close' | 'miss'
}

export type PredictionPhase = 'idle' | 'placing' | 'decided' | 'revealed'

export interface PredictionState {
  phase: PredictionPhase
  currentDecisionPoint: DecisionPoint | null
  userPredictions: UserPrediction[]
  userDecisions: UserPrediction['type'][]
  comparison: PredictionComparison | null
  score: { aligned: number; total: number }
}

export type ChartStyle = 'candlestick' | 'ohlc' | 'hlc'

export interface CandlestickChartProps {
  candles: CandleData[]
  revealCount: number
  markers?: TradeMarker[]
  priceLines?: PriceLine[]
  onPredictionClick?: (price: number, time: string) => void
  predictionMarkers?: TradeMarker[]
  isPredictionMode?: boolean
  onPriceSelect?: (price: number) => void
  isPriceSelectMode?: boolean
  lastCandleOverride?: { open: number; high: number; low: number; close: number } | null
  height?: number
  /** '1d' or '1wk' — controls which moving average periods are shown */
  interval?: '1d' | '1wk'
  /** Chart rendering style — candlestick (default), OHLC bars, or HLC bars */
  chartStyle?: ChartStyle
  /** Ticker symbol displayed on the chart */
  symbol?: string
}

// ── User Portfolio System ──

export interface TradeLot {
  id: string
  entryPrice: number
  shares: number
  remainingShares: number
  initialStop: number
  currentStop: number
  entryDate: string
}

export interface ClosedPortion {
  lotId: string
  shares: number
  entryPrice: number
  exitPrice: number
  exitDate: string
  pnlPercent: number
  pnlR: number
}

export type UserActionPhase =
  | 'idle'
  | 'entry_prompt'
  | 'entry_sizing'
  | 'entry_price'
  | 'entry_stop'
  | 'entry_reveal'
  | 'action_prompt'
  | 'sell_amount'
  | 'sell_price'
  | 'add_sizing'
  | 'add_price'
  | 'add_stop'
  | 'move_stop'
  | 'action_reveal'
  | 'stop_hit'
  | 'adhoc_prompt'

export interface TradeDetails {
  entryDate: string
  entryPrice: number
  initialStopLoss: number
  type: 'long' | 'short'
  modifiedStops?: { price: number; date: string; notes?: string }[]
  exits?: { price: number; shares: number; date: string; reason?: string; notes?: string }[]
  tickerSymbol: string
}
