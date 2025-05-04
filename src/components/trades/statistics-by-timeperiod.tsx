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
import apiClient from "@/lib/api/client";
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
  statusFilter: "all" | "closed-only"; // Add statusFilter prop
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

  // Fetch yearly statistics
  useEffect(() => {
    const fetchYearlyStats = async () => {
      try {
        setLoading(true);
        
        // Get current year and previous 2 years
        const thisYear = year;
        
        // Temporarily exclude 2023 as requested
        const years = [thisYear, thisYear - 1].filter(y => y !== 2023);
        
        const yearlyStatsPromises = years.map(async (year) => {
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          
          // Include statusFilter in the API request
          const response = await apiClient.get(`/trades/stats?startDate=${startDate}&endDate=${endDate}&statusFilter=${statusFilter}`);
          
          return {
            period: year.toString(),
            periodLabel: year.toString(),
            stats: response.data.stats,
            metadata: response.data.metadata
          };
        });
        
        const results = await Promise.all(yearlyStatsPromises);
        setYearlyStats(results);
        
        // Set the current year as expanded by default
        if (results.length > 0) {
          const defaultExpandedYear = results[0].period;
          setExpandedYears(new Set([defaultExpandedYear]));
          
          // Proactively fetch monthly data for the initially expanded year
          fetchMonthlyDataForYear(defaultExpandedYear);
        }
        
      } catch (error) {
        console.error("Error fetching yearly statistics:", error);
        setError("Failed to load yearly statistics");
      } finally {
        setLoading(false);
      }
    };
    
    fetchYearlyStats();
    
    // Clear monthly stats when statusFilter changes to force a refresh
    setMonthlyStats({});
    
  }, [year, statusFilter]); // Add statusFilter as dependency

  // Function to fetch monthly data for a year
  const fetchMonthlyDataForYear = async (year: string) => {
    // Skip if we already have the data
    if (monthlyStats[year]) return;
    
    try {
      const months = Array.from({ length: 12 }, (_, i) => i);
      
      const monthlyStatsPromises = months.map(async (month) => {
        const startDate = startOfMonth(new Date(parseInt(year), month));
        const endDate = endOfMonth(new Date(parseInt(year), month));
        
        // Format dates as YYYY-MM-DD for API
        const formattedStartDate = format(startDate, "yyyy-MM-dd");
        const formattedEndDate = format(endDate, "yyyy-MM-dd");
        
        // Include statusFilter in the API request
        const response = await apiClient.get(
          `/trades/stats?startDate=${formattedStartDate}&endDate=${formattedEndDate}&statusFilter=${statusFilter}`
        );
        
        return {
          period: `${year}-${month + 1}`,
          periodLabel: format(startDate, "MMMM"),
          stats: response.data.stats,
          metadata: response.data.metadata
        };
      });
      
      const results = await Promise.all(monthlyStatsPromises);
      
      // Update monthly stats
      setMonthlyStats(prev => ({
        ...prev,
        [year]: results
      }));
      
    } catch (error) {
      console.error(`Error fetching monthly statistics for ${year}:`, error);
    }
  };

  // Toggle expanded year and fetch monthly data
  const toggleYearExpansion = async (year: string) => {
    const newExpanded = new Set(expandedYears);
    
    if (expandedYears.has(year)) {
      newExpanded.delete(year);
      setExpandedYears(newExpanded);
      return;
    }
    
    // Add to expanded set
    newExpanded.add(year);
    setExpandedYears(newExpanded);
    
    // Fetch monthly data if needed
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
                <TableHead>P/L %</TableHead>
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
                    <TableCell className={getColorClass(
                      viewMode === "normalized"
                        ? yearData.stats.normalized.totalProfitLossPercent
                        : yearData.stats.totalProfitLossPercent
                    )}>
                      {formatPercent(
                        viewMode === "normalized"
                          ? yearData.stats.normalized.totalProfitLossPercent
                          : yearData.stats.totalProfitLossPercent
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
                      ) : monthlyStats[yearData.period].every(m => m.metadata.totalTrades === 0) ? (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                            No trades recorded for this year
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthlyStats[yearData.period]
                          .filter(monthData => monthData.metadata.totalTrades > 0)
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
                              <TableCell className={getColorClass(
                                viewMode === "normalized"
                                  ? monthData.stats.normalized.totalProfitLossPercent
                                  : monthData.stats.totalProfitLossPercent
                              )}>
                                {formatPercent(
                                  viewMode === "normalized"
                                    ? monthData.stats.normalized.totalProfitLossPercent
                                    : monthData.stats.totalProfitLossPercent
                                )}
                              </TableCell>
                            </TableRow>
                          ))
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