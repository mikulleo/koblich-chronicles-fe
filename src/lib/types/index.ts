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

// ===== Mental Edge Types =====

export type PreMarketRatingKey = 'focus' | 'patience' | 'confidence' | 'calmness' | 'urgencyToMakeMoney' | 'fomoLevel';
export type PostMarketRatingKey = 'planAdherence' | 'emotionalStability' | 'selectivity';

export type ContextFlag = 'recent_loss' | 'recent_win' | 'winning_streak' | 'losing_streak' | 'slept_poorly' | 'personal_stress' | 'market_volatile' | 'account_at_high' | 'account_at_low' | 'big_news_day' | 'end_of_week' | 'end_of_month';
export type Intention = 'avoid_forcing' | 'stay_patient' | 'stick_to_plan' | 'manage_risk' | 'avoid_fomo' | 'stay_calm' | 'be_selective' | 'protect_gains';
export type EmotionalTrap = 'overtrading' | 'fomo_entries' | 'revenge_trading' | 'moving_stops' | 'oversizing' | 'not_taking_setups' | 'chasing' | 'impatience';
export type RiskPredictionOutcome = 'accurate' | 'inaccurate' | 'worry_not_fulfilled' | 'emotionally_set' | 'blind_spot';
export type RuleCategory = 'risk_management' | 'entry_rules' | 'exit_rules' | 'position_sizing' | 'emotional' | 'routine';
export type JournalEntryType = 'pre_market_note' | 'post_market_reflection' | 'mistake_review' | 'trigger_review' | 'weekly_review' | 'rule_violation_review';
export type ViolationMentalState = 'frustrated' | 'overconfident' | 'fearful' | 'impatient' | 'revenge_trading' | 'fomo' | 'bored' | 'tired';

export interface MentalCheckIn {
  id: string;
  user: string;
  date: string;
  preMarket?: {
    completedAt?: string;
    ratings?: Record<PreMarketRatingKey, number>;
    contextFlags?: ContextFlag[];
    intentions?: Intention[];
    biggestRisk?: EmotionalTrap;
  };
  postMarket?: {
    completedAt?: string;
    ratings?: Record<PostMarketRatingKey, number>;
    behaviors?: {
      forcedTrades?: boolean;
      feltFomo?: boolean;
      reactiveAfterLoss?: boolean;
      carelessAfterWin?: boolean;
    };
    reflections?: {
      whatWentWell?: string;
      whatWentPoorly?: string;
      lessonsLearned?: string;
      tomorrowFocus?: string;
      emotionalHighlight?: string;
    };
    actualTraps?: EmotionalTrap[];
  };
  analysis?: {
    stateConsistency?: number;
    intentionAdherence?: number;
    /** New: string enum. Legacy data may still have boolean true/false. */
    riskPredictionAccuracy?: RiskPredictionOutcome | boolean;
    emotionalDrift?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface MindsetJournalEntry {
  id: string;
  user: string;
  date: string;
  entryType: JournalEntryType;
  title: string;
  guidedPrompts?: {
    prompt: string;
    response: string;
  }[];
  freeContent?: string;
  linkedTraps?: EmotionalTrap[];
  linkedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineRule {
  id: string;
  user: string;
  title: string;
  description?: string;
  category: RuleCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineLogEntry {
  id: string;
  user: string;
  date: string;
  entries?: {
    rule: string | DisciplineRule;
    status: 'respected' | 'violated';
    notes?: string;
    mentalStateAtViolation?: ViolationMentalState;
  }[];
  summary?: {
    totalRules: number;
    respected: number;
    violated: number;
    complianceRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineStreaks {
  currentStreak: number;
  bestStreak: number;
  totalDays: number;
  averageCompliance: number;
}

export interface DisciplineAnalytics {
  totalDays: number;
  violationsByMentalState: Record<string, number>;
  violationsByRule: { title: string; count: number }[];
  dailyCompliance: { date: string; complianceRate: number }[];
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  daysLogged: number;
  trapCounts: Record<string, number>;
  behaviorCounts: Record<string, number>;
  driftPatterns: Record<string, number>;
  averageIntentionAdherence: number | null;
  averageStateConsistency: number | null;
  riskPredictionRate: number | null;
  dailyData: {
    date: string;
    preMarketRatings?: Record<string, number>;
    postMarketRatings?: Record<string, number>;
    traps: string[];
    analysis?: MentalCheckIn['analysis'];
  }[];
}

export interface CheckInTrendDay {
  date: string;
  preMarket: Record<string, number>;
  postMarket: Record<string, number>;
  behaviors: Record<string, boolean>;
  stateConsistency?: number;
  intentionAdherence?: number;
  /** New: string enum. Legacy data may still have boolean true/false. */
  riskPredictionAccuracy?: RiskPredictionOutcome | boolean | null;
  traps: string[];
  contextFlags: string[];
  driftPatterns: string[];
}

export interface CheckInTrends {
  totalDays: number;
  trends: CheckInTrendDay[];
}

// ===== Deterministic Insights Types =====

export interface MetricExplanation {
  label: string;
  description: string;
  currentAverage: number | null;
  currentInterpretation: string | null;
}

export interface ConditionalInsight {
  condition: string;
  outcome: string;
  rate: number;
  occurrences: number;
  total: number;
}

export interface DeterministicInsights {
  totalDays: number;
  completeDays: number;
  latestDate: string | null;
  oldestDate: string | null;
  todayInsights: {
    strengths: string[];
    issues: string[];
  };
  recurringPatterns: {
    issues: string[];
    strengths: string[];
  };
  trendInsights: string[];
  conditionalInsights: ConditionalInsight[];
  metrics: {
    stateConsistency: MetricExplanation;
    intentionAdherence: MetricExplanation;
  };
}

// ===== Mindset Evaluation Types =====

export type EvaluationType = 'daily_post_market' | 'weekly_summary' | 'on_demand';
export type EvaluationStatus = 'pending' | 'completed' | 'failed' | 'rate_limited';

export interface MindsetEvaluation {
  id: string;
  user: string;
  date: string;
  evaluationType: EvaluationType;
  inputSnapshot?: {
    checkInId?: string;
    disciplineLogId?: string;
    dataHash?: string;
  };
  deterministicAnalysis?: {
    stateConsistency?: number;
    intentionAdherence?: number;
    riskPredictionAccuracy?: RiskPredictionOutcome | boolean;
    emotionalDrift?: string[];
  };
  aiAnalysis?: {
    coachingFeedback?: string;
    patternsIdentified?: string[];
    actionableInsights?: string[];
    riskAlerts?: string[];
    strengthsHighlighted?: string[];
    focusForTomorrow?: string;
    overallScore?: number;
  };
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
  };
  status: EvaluationStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
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
