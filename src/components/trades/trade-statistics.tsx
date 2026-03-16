// src/components/trades/trade-statistics.tsx
"use client";

import React, { useState, useEffect } from "react";
import { StatisticsFilters } from "./statistics-filter";
import { StatisticsSummary } from "./statistics-summary";
import { StatisticsDetails } from "./statistics-details";
import { StatisticsCharts } from "./statistics-charts";
import { StatisticsByTimeperiod } from "./statistics-by-timeperiod";
import { StatisticsHistogram } from "./statistics-histogram"; // Add this import
import { MetricCalculationsInfo } from "./metric-calculation-info";
import { cachedFetch, invalidateCache } from "@/lib/prefetch-cache";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Define types for statistics data
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
  tradeStatusCounts: {
    closed: number;
    partial: number;
  };
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

export interface StatsMetadata {
  totalTrades: number;
  closedTrades: number;
  partialTrades: number;
  statusFilter: string;
  dateRange: string;
  tickerFilter: boolean;
}

// Trade interface for P/L calculation
interface Trade {
  profitLossPercent: number;
  normalizedMetrics?: {
    profitLossPercent: number;
  };
  status: 'open' | 'partial' | 'closed';
}

// Supported time periods for filtering
export type TimePeriod = "all" | "year" | "month" | "week" | "custom";

export interface StatsFilters {
  timePeriod: TimePeriod;
  startDate?: string;
  endDate?: string;
  tickerId?: string;
  statusFilter: "all" | "closed-only";
  viewMode: "standard" | "normalized";
}

export function TradeStatistics() {
  // State for statistics data
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [metadata, setMetadata] = useState<StatsMetadata | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [tradesError, setTradesError] = useState<string | null>(null);


  // State for filters
  const [filters, setFilters] = useState<StatsFilters>({
    timePeriod: "month",
    statusFilter: "all",
    viewMode: "standard",
  });

  // ────────────────────────────────────────────────────────────────────────────────
// Helpers for local‐time date parsing/formatting
const pad2 = (n: number) => String(n).padStart(2, "0");

// Build a "YYYY-MM-DD" *local* string (no UTC shift).
const toLocalISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Parse a "YYYY-MM-DD" as local-midnight rather than UTC-midnight.
const parseLocalDate = (isoDate: string) => new Date(`${isoDate}T00:00:00`);

// Parse end-of-day for a local date.
const parseLocalEndDate = (isoDate: string) => new Date(`${isoDate}T23:59:59.999`);
// ────────────────────────────────────────────────────────────────────────────────

  // Function to calculate total P/L percentage as simple sum
  const calculateTotalProfitLossPercent = (trades: Trade[]) => {
    // Filter trades to only include closed and partial (same as backend filter)
    const relevantTrades = trades.filter(trade => 
      trade.status === 'closed' || trade.status === 'partial'
    );

    // Standard total P/L % - simple sum
    const standardTotal = relevantTrades.reduce((sum, trade) => {
      return sum + (trade.profitLossPercent || 0);
    }, 0);

    // Normalized total P/L % - simple sum of normalized values
    const normalizedTotal = relevantTrades.reduce((sum, trade) => {
      return sum + (trade.normalizedMetrics?.profitLossPercent || trade.profitLossPercent || 0);
    }, 0);

    return {
      standard: Number(standardTotal.toFixed(2)),
      normalized: Number(normalizedTotal.toFixed(2))
    };
  };

  // Build query params from current filters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append("depth", "0"); // Stats don't need populated relationships

    if (filters.timePeriod === "custom" && filters.startDate && filters.endDate) {
      params.append("startDate", toLocalISODate(parseLocalDate(filters.startDate)));
      params.append("endDate", toLocalISODate(parseLocalEndDate(filters.endDate)));
    } else if (filters.timePeriod !== "all") {
      const today = new Date();
      let start: Date | undefined;

      if (filters.timePeriod === "year") {
        start = new Date(today.getFullYear(), 0, 1);
      } else if (filters.timePeriod === "month") {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (filters.timePeriod === "week") {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(today.getFullYear(), today.getMonth(), diff);
      }

      if (start) {
        params.append("startDate", toLocalISODate(start));
      }
      params.append("endDate", toLocalISODate(today));
    }

    if (filters.tickerId) {
      params.append("tickerId", filters.tickerId);
    }

    if (filters.statusFilter === "closed-only") {
      params.append("statusFilter", "closed-only");
    }

    return params;
  };

  // Fetch stats independently (uses prefetch cache — instant if already loaded)
  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);
        const params = buildQueryParams();
        const data = await cachedFetch<{ stats: TradeStats; metadata: StatsMetadata }>("/trades/stats", params);
        if (cancelled) return;
        if (data) {
          setStats(data.stats);
          setMetadata(data.metadata);
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching statistics:", error);
        setStatsError("Failed to load statistics data.");
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [filters]);

  // Fetch trades independently (uses prefetch cache — instant if already loaded)
  useEffect(() => {
    let cancelled = false;
    const fetchTrades = async () => {
      try {
        setTradesLoading(true);
        setTradesError(null);
        const params = buildQueryParams();
        const data = await cachedFetch<{ docs: any[] }>("/trades", params);
        if (cancelled) return;
        if (data) {
          setTrades(data.docs);
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching trades:", error);
        setTradesError("Failed to load trade data.");
      } finally {
        if (!cancelled) setTradesLoading(false);
      }
    };
    fetchTrades();
    return () => { cancelled = true; };
  }, [filters]);

  // Enhance stats with client-side P/L calculation once both are available
  const enhancedStats = React.useMemo(() => {
    if (!stats || trades.length === 0) return stats;
    const clientPL = calculateTotalProfitLossPercent(trades);
    return {
      ...stats,
      totalProfitLossPercent: clientPL.standard,
      normalized: {
        ...stats.normalized,
        totalProfitLossPercent: clientPL.normalized,
      },
    };
  }, [stats, trades]);

  // Handle filter changes — invalidate only stats cache, not the main trades list
  const handleFilterChange = (newFilters: Partial<StatsFilters>) => {
    invalidateCache("/trades/stats");
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Section loading placeholder
  const SectionLoader = ({ label }: { label: string }) => (
    <Card>
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span className="text-muted-foreground text-sm">{label}</span>
      </CardContent>
    </Card>
  );

  const displayStats = enhancedStats || stats;
  const hasStatsError = statsError && tradesError;

  return (
    <div className="space-y-6">
      {/* Filters - always visible immediately */}
      <StatisticsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Full error only if both requests failed */}
      {hasStatsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load statistics data. Please try again later.</AlertDescription>
        </Alert>
      )}

      {/* Summary statistics */}
      {statsLoading ? (
        <SectionLoader label="Loading summary..." />
      ) : !displayStats || !metadata ? (
        !hasStatsError && (
          <Card className="bg-muted/40">
            <CardHeader>
              <CardTitle>No Data Available</CardTitle>
              <CardDescription>
                No trade statistics are available for the selected filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Try changing your filter settings or add some trades to get started.</p>
            </CardContent>
          </Card>
        )
      ) : (
        <StatisticsSummary
          stats={displayStats}
          metadata={metadata}
          viewMode={filters.viewMode}
        />
      )}

      {/* Time-period based statistics - fetches its own data independently */}
      <StatisticsByTimeperiod
        viewMode={filters.viewMode}
        statusFilter={filters.statusFilter}
      />

      {/* Trade Distribution Histogram */}
      {tradesLoading ? (
        <SectionLoader label="Loading trade distribution..." />
      ) : trades.length > 0 ? (
        <StatisticsHistogram
          filters={filters}
          viewMode={filters.viewMode}
          trades={trades}
        />
      ) : null}

      {/* Visualizations */}
      {statsLoading ? (
        <SectionLoader label="Loading charts..." />
      ) : displayStats && metadata ? (
        <StatisticsCharts
          stats={displayStats}
          metadata={metadata}
          viewMode={filters.viewMode}
        />
      ) : null}

      {/* Detailed statistics */}
      {statsLoading ? (
        <SectionLoader label="Loading details..." />
      ) : displayStats && metadata ? (
        <StatisticsDetails
          stats={displayStats}
          metadata={metadata}
          viewMode={filters.viewMode}
        />
      ) : null}

      {/* Calculation formulas info - always visible */}
      <MetricCalculationsInfo />
    </div>
  );
}