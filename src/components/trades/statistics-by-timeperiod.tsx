// src/components/trades/statistics-by-timeperiod.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cachedFetch } from "@/lib/prefetch-cache";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { TradeStats, StatsMetadata } from "./trade-statistics";

interface TimeperiodStats {
  period: string;
  periodLabel: string;
  stats: TradeStats;
  metadata: StatsMetadata;
}

interface StatisticsByTimeperiodProps {
  viewMode: "standard" | "normalized";
  statusFilter: "all" | "closed-only";
  selectedYear?: number;
}

export function StatisticsByTimeperiod({ viewMode, statusFilter, selectedYear }: StatisticsByTimeperiodProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearlyStats, setYearlyStats] = useState<TimeperiodStats[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [monthlyStats, setMonthlyStats] = useState<Record<string, TimeperiodStats[]>>({});
  const [loadingMonths, setLoadingMonths] = useState<Set<string>>(new Set());

  const currentYear = new Date().getFullYear();
  const year = selectedYear || currentYear;

  // Format percentage values
  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Format ratio values
  const formatRatio = (value: number): string => {
    return value.toFixed(2);
  };

  // Helper to get color class based on value
  const getColorClass = (value: number, threshold: number = 0): string => {
    if (value > threshold) return "text-green-600 font-medium";
    if (value < threshold) return "text-red-600 font-medium";
    return "";
  };

  const emptyStats: TradeStats = { totalTrades: 0, winningTrades: 0, losingTrades: 0, breakEvenTrades: 0, battingAverage: 0, averageWinPercent: 0, averageLossPercent: 0, winLossRatio: 0, adjustedWinLossRatio: 0, averageRRatio: 0, profitFactor: 0, expectancy: 0, averageDaysHeldWinners: 0, averageDaysHeldLosers: 0, maxGainPercent: 0, maxLossPercent: 0, maxGainLossRatio: 0, totalProfitLoss: 0, totalProfitLossPercent: 0, tradeStatusCounts: { closed: 0, partial: 0 }, normalized: { totalProfitLoss: 0, totalProfitLossPercent: 0, averageRRatio: 0, profitFactor: 0, maxGainPercent: 0, maxLossPercent: 0, maxGainLossRatio: 0, averageWinPercent: 0, averageLossPercent: 0, winLossRatio: 0, adjustedWinLossRatio: 0, expectancy: 0 } } as TradeStats;

  // Fetch yearly statistics — both years in parallel, using cache
  useEffect(() => {
    let cancelled = false;

    const fetchYearlyStats = async () => {
      try {
        setLoading(true);

        const thisYear = year;
        // Temporarily exclude 2023 as requested
        const years = [thisYear, thisYear - 1].filter(y => y !== 2023);

        // Fetch both years in parallel (cached if prefetched)
        const results = await Promise.all(
          years.map(async (y) => {
            const params = new URLSearchParams();
            params.append("startDate", `${y}-01-01`);
            params.append("endDate", `${y}-12-31`);
            if (statusFilter !== "all") params.append("statusFilter", statusFilter);

            const data = await cachedFetch<{ stats: TradeStats; metadata: StatsMetadata }>("/trades/stats", params);
            return {
              period: y.toString(),
              periodLabel: y.toString(),
              stats: data.stats,
              metadata: data.metadata,
            } as TimeperiodStats;
          })
        );

        if (cancelled) return;
        setYearlyStats(results);

        // Auto-expand current year and start loading its months
        if (results.length > 0) {
          const defaultExpandedYear = results[0].period;
          setExpandedYears(new Set([defaultExpandedYear]));
          fetchMonthlyDataForYear(defaultExpandedYear);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching yearly statistics:", error);
        setError("Failed to load yearly statistics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Clear monthly stats when statusFilter changes to force a refresh
    setMonthlyStats({});
    fetchYearlyStats();

    return () => { cancelled = true; };
  }, [year, statusFilter]);

  // Fetch all 12 months in parallel, streaming results progressively
  const fetchMonthlyDataForYear = async (yearStr: string) => {
    if (monthlyStats[yearStr]) return;

    setLoadingMonths((prev) => new Set(prev).add(yearStr));

    const yearNum = parseInt(yearStr);

    // Fire all 12 months in parallel — each uses cachedFetch (instant if prefetched)
    const monthPromises = Array.from({ length: 12 }, (_, month) => {
      const start = startOfMonth(new Date(yearNum, month));
      const end = endOfMonth(new Date(yearNum, month));

      const params = new URLSearchParams();
      params.append("startDate", format(start, "yyyy-MM-dd"));
      params.append("endDate", format(end, "yyyy-MM-dd"));
      if (statusFilter !== "all") params.append("statusFilter", statusFilter);

      return cachedFetch<{ stats: TradeStats; metadata: StatsMetadata }>("/trades/stats", params)
        .then((data) => ({
          period: `${yearStr}-${month + 1}`,
          periodLabel: format(start, "MMMM"),
          stats: data.stats,
          metadata: data.metadata,
        } as TimeperiodStats))
        .catch(() => ({
          period: `${yearStr}-${month + 1}`,
          periodLabel: format(start, "MMMM"),
          stats: emptyStats,
          metadata: { totalTrades: 0, closedTrades: 0, partialTrades: 0, statusFilter, dateRange: "", tickerFilter: false },
        } as TimeperiodStats));
    });

    // Stream results: update state as each month resolves
    const results: TimeperiodStats[] = new Array(12);
    let resolved = 0;

    monthPromises.forEach((p, idx) => {
      p.then((result) => {
        results[idx] = result;
        resolved++;

        // Update state progressively — every few results or when all done
        if (resolved % 4 === 0 || resolved === 12) {
          const snapshot = [...results];
          setMonthlyStats((prev) => ({ ...prev, [yearStr]: snapshot }));
        }

        if (resolved === 12) {
          setLoadingMonths((prev) => {
            const next = new Set(prev);
            next.delete(yearStr);
            return next;
          });
        }
      });
    });
  };

  // Toggle expanded year and fetch monthly data
  const toggleYearExpansion = async (year: string) => {
    const newExpanded = new Set(expandedYears);

    if (expandedYears.has(year)) {
      newExpanded.delete(year);
      setExpandedYears(newExpanded);
      return;
    }

    newExpanded.add(year);
    setExpandedYears(newExpanded);
    fetchMonthlyDataForYear(year);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Loading statistics by time period...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10">
        <CardContent className="py-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Trading Statistics By Time Period</span>
          <div className="flex gap-2">
            {viewMode === "normalized" && (
              <Badge variant="outline" className="bg-primary/20 border-primary/50 text-primary">
                Normalized View
              </Badge>
            )}
            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
              {statusFilter === "closed-only" ? "Closed Only" : "Closed & Partial"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Trades</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Win/Loss</TableHead>
                <TableHead>Avg Win %</TableHead>
                <TableHead>Avg Loss %</TableHead>
                <TableHead>R-Ratio</TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {yearlyStats.map((yearData) => (
                <React.Fragment key={yearData.period}>
                  {/* Yearly Row */}
                  <TableRow
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggleYearExpansion(yearData.period)}
                  >
                    <TableCell className="font-medium flex items-center">
                      {expandedYears.has(yearData.period) ?
                        <ChevronDown className="h-4 w-4 mr-1" /> :
                        <ChevronRight className="h-4 w-4 mr-1" />
                      }
                      {yearData.periodLabel}
                    </TableCell>
                    <TableCell>
                      {yearData.metadata.totalTrades}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({yearData.stats.winningTrades}/{yearData.stats.losingTrades})
                      </span>
                    </TableCell>
                    <TableCell className={getColorClass(yearData.stats.battingAverage, 50)}>
                      {yearData.stats.battingAverage.toFixed(1)}%
                    </TableCell>
                    <TableCell className={getColorClass(
                      viewMode === "normalized"
                        ? yearData.stats.normalized.winLossRatio
                        : yearData.stats.winLossRatio,
                      1
                    )}>
                      {formatRatio(
                        viewMode === "normalized"
                          ? yearData.stats.normalized.winLossRatio
                          : yearData.stats.winLossRatio
                      )}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatPercent(
                        viewMode === "normalized"
                          ? yearData.stats.normalized.averageWinPercent
                          : yearData.stats.averageWinPercent
                      )}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {formatPercent(
                        viewMode === "normalized"
                          ? yearData.stats.normalized.averageLossPercent
                          : yearData.stats.averageLossPercent
                      )}
                    </TableCell>
                    <TableCell className={getColorClass(
                      viewMode === "normalized"
                        ? yearData.stats.normalized.averageRRatio
                        : yearData.stats.averageRRatio,
                      1
                    )}>
                      {formatRatio(
                        viewMode === "normalized"
                          ? yearData.stats.normalized.averageRRatio
                          : yearData.stats.averageRRatio
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Monthly Rows (when expanded) */}
                  {expandedYears.has(yearData.period) && (
                    <>
                      {!monthlyStats[yearData.period] ? (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={8} className="text-center py-4">
                            <div className="flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-muted-foreground">Loading monthly data...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : monthlyStats[yearData.period].filter(Boolean).length > 0 &&
                          monthlyStats[yearData.period].filter(Boolean).every(m => m.metadata.totalTrades === 0) &&
                          !loadingMonths.has(yearData.period) ? (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                            No trades recorded for this year
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                        {monthlyStats[yearData.period]
                          .filter((monthData) => monthData && monthData.metadata.totalTrades > 0)
                          .map(monthData => (
                            <TableRow
                              key={monthData.period}
                              className="bg-muted/20 hover:bg-muted/30"
                            >
                              <TableCell className="pl-8 font-normal">
                                {monthData.periodLabel}
                              </TableCell>
                              <TableCell>
                                {monthData.metadata.totalTrades}
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({monthData.stats.winningTrades}/{monthData.stats.losingTrades})
                                </span>
                              </TableCell>
                              <TableCell className={getColorClass(monthData.stats.battingAverage, 50)}>
                                {monthData.stats.battingAverage.toFixed(1)}%
                              </TableCell>
                              <TableCell className={getColorClass(
                                viewMode === "normalized"
                                  ? monthData.stats.normalized.winLossRatio
                                  : monthData.stats.winLossRatio,
                                1
                              )}>
                                {formatRatio(
                                  viewMode === "normalized"
                                    ? monthData.stats.normalized.winLossRatio
                                    : monthData.stats.winLossRatio
                                )}
                              </TableCell>
                              <TableCell className="text-green-600">
                                {formatPercent(
                                  viewMode === "normalized"
                                    ? monthData.stats.normalized.averageWinPercent
                                    : monthData.stats.averageWinPercent
                                )}
                              </TableCell>
                              <TableCell className="text-red-600">
                                {formatPercent(
                                  viewMode === "normalized"
                                    ? monthData.stats.normalized.averageLossPercent
                                    : monthData.stats.averageLossPercent
                                )}
                              </TableCell>
                              <TableCell className={getColorClass(
                                viewMode === "normalized"
                                  ? monthData.stats.normalized.averageRRatio
                                  : monthData.stats.averageRRatio,
                                1
                              )}>
                                {formatRatio(
                                  viewMode === "normalized"
                                    ? monthData.stats.normalized.averageRRatio
                                    : monthData.stats.averageRRatio
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        {loadingMonths.has(yearData.period) && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={8} className="text-center py-2">
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                <span className="text-muted-foreground text-xs">Loading remaining months...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}

              {yearlyStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    No yearly statistics available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
