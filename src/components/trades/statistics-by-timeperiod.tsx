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
import { TradeStats, StatsMetadata } from "./trade-statistics";

interface TimeperiodStats {
  period: string;
  periodLabel: string;
  stats: TradeStats;
  metadata: StatsMetadata;
}

interface PeriodStatsResponse extends TimeperiodStats {
  months: TimeperiodStats[];
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

  // One request returns precomputed yearly + monthly stats for every year
  useEffect(() => {
    let cancelled = false;

    const fetchPeriodStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("statusFilter", statusFilter);
        const data = await cachedFetch<{ years: PeriodStatsResponse[] }>("/trades/stats/periods", params);
        if (cancelled) return;

        // Current and previous year (temporarily excluding 2023 as requested)
        const shownYears = [year, year - 1].filter(y => y !== 2023).map(String);
        const years = shownYears
          .map(y => data.years.find(entry => entry.period === y))
          .filter((entry): entry is PeriodStatsResponse => Boolean(entry));

        setYearlyStats(years);
        setMonthlyStats(Object.fromEntries(years.map(entry => [entry.period, entry.months])));

        // Auto-expand the current year
        if (years.length > 0) {
          setExpandedYears(new Set([years[0].period]));
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching period statistics:", error);
        setError("Failed to load yearly statistics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPeriodStats();

    return () => { cancelled = true; };
  }, [year, statusFilter]);

  // Toggle expanded year (monthly rows are already loaded)
  const toggleYearExpansion = (year: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
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
                      0
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
                      {!monthlyStats[yearData.period]?.some(m => m.metadata.totalTrades > 0) ? (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                            No trades recorded for this year
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                        {monthlyStats[yearData.period]
                          .filter((monthData) => monthData.metadata.totalTrades > 0)
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
                                0
                              )}>
                                {formatRatio(
                                  viewMode === "normalized"
                                    ? monthData.stats.normalized.averageRRatio
                                    : monthData.stats.averageRRatio
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
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
