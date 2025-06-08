// src/components/trades/statistics-histogram.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Info } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import apiClient from "@/lib/api/client";
import { StatsFilters } from "./trade-statistics";

interface Trade {
  id: string;
  profitLossPercent: number;
  status: string;
  entryDate: string;
  exits?: Array<{
    date: string;
    price: number;
    shares: number;
  }>;
  normalizedMetrics?: {
    profitLossPercent: number;
  };
}

interface HistogramBucket {
  range: string;
  count: number;
  lowerBound: number;
  upperBound: number;
  rangeIndex: number; // For sorting and reference line positioning
  color: string; // Color based on positive/negative
  isNegative: boolean; // To determine coloring
}

interface TradeDataSummary {
  totalFetched: number;
  totalWithPLData: number;
  totalInHistogram: number;
}

interface StatisticsHistogramProps {
  filters: StatsFilters;
  viewMode: "standard" | "normalized";
}

export function StatisticsHistogram({ filters, viewMode }: StatisticsHistogramProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [histogramData, setHistogramData] = useState<HistogramBucket[]>([]);
  const [tradeDataSummary, setTradeDataSummary] = useState<TradeDataSummary>({
    totalFetched: 0,
    totalWithPLData: 0,
    totalInHistogram: 0,
  });

  // Create buckets from -40% to 40%+ in 2% increments
  const createBuckets = (): HistogramBucket[] => {
    const buckets: HistogramBucket[] = [];
    let rangeIndex = 0;
    
    // Create buckets from -40% to 38% in 2% increments
    for (let i = -40; i < 40; i += 2) {
      // Anything with upper bound <= 0 should be red (negative/loss)
      const isNegative = (i + 2) <= 0;
      buckets.push({
        range: i < 0 ? `${i}% to ${i + 2}%` : `${i}% to ${i + 2}%`,
        count: 0,
        lowerBound: i,
        upperBound: i + 2,
        rangeIndex: rangeIndex++,
        color: isNegative ? "#dc2626" : "#16a34a", // Dark red for negative, dark green for positive
        isNegative: isNegative,
      });
    }
    
    // Add 40%+ bucket
    buckets.push({
      range: "40%+",
      count: 0,
      lowerBound: 40,
      upperBound: Infinity,
      rangeIndex: rangeIndex++,
      color: "#16a34a", // Dark green for positive
      isNegative: false,
    });
    
    return buckets;
  };

  // Helper function to get completion date for a trade
  const getTradeCompletionDate = (trade: Trade): Date => {
    // For open trades, use entry date
    if (trade.status === 'open') {
      return new Date(trade.entryDate);
    }
    
    // For closed and partial trades, use the last exit date
    if (trade.exits && trade.exits.length > 0) {
      // Find the most recent exit date
      const lastExitDate = trade.exits.reduce((latest: string, exit: any) => {
        const exitDate = new Date(exit.date);
        const latestDate = new Date(latest);
        return exitDate > latestDate ? exit.date : latest;
      }, trade.exits[0].date);
      
      return new Date(lastExitDate);
    }
    
    // Fallback to entry date if no exits
    return new Date(trade.entryDate);
  };

  // Helper function to filter trades by completion date AND status
  const filterTrades = (trades: Trade[], filters: StatsFilters) => {
    return trades.filter(trade => {
      // Apply status filter first
      if (filters.statusFilter === "closed-only") {
        if (trade.status !== "closed") {
          return false;
        }
      } else {
        // Default: include both closed and partial trades
        if (!["closed", "partial"].includes(trade.status)) {
          return false;
        }
      }

      // Then apply date filtering
      const completionDate = getTradeCompletionDate(trade);
      
      // Get the target date range based on filters
      let targetStartDate: Date | undefined;
      let targetEndDate: Date | undefined;
      
      if (filters.timePeriod === "custom" && filters.startDate && filters.endDate) {
        targetStartDate = new Date(filters.startDate);
        targetEndDate = new Date(filters.endDate);
        targetEndDate.setHours(23, 59, 59, 999); // End of day
      } else if (filters.timePeriod !== "all") {
        const today = new Date();
        
        if (filters.timePeriod === "year") {
          // This year: January 1st of current year to TODAY
          targetStartDate = new Date(today.getFullYear(), 0, 1);
          targetEndDate = new Date(today);
          targetEndDate.setHours(23, 59, 59, 999);
        } else if (filters.timePeriod === "month") {
          // This month: 1st day of current month to TODAY
          targetStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
          targetEndDate = new Date(today);
          targetEndDate.setHours(23, 59, 59, 999);
        } else if (filters.timePeriod === "week") {
          // This week: Monday of current week to TODAY
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1);
          targetStartDate = new Date(today.getFullYear(), today.getMonth(), diff);
          targetEndDate = new Date(today);
          targetEndDate.setHours(23, 59, 59, 999);
        }
      }
      
      // Apply date filtering
      if (targetStartDate && completionDate < targetStartDate) {
        return false;
      }
      
      if (targetEndDate && completionDate > targetEndDate) {
        return false;
      }
      
      return true;
    });
  };

  useEffect(() => {
    const fetchTradeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build the where clause as an object (more reliable than URL params)
        const whereClause: any = {};
        
        // Add ticker filter if selected
        if (filters.tickerId) {
          whereClause.ticker = { equals: filters.tickerId };
        }
        
        // For status filter, we'll apply it client-side to ensure consistency
        // But we can still optimize the API call by excluding 'open' trades if we only want closed
        if (filters.statusFilter === "closed-only") {
          whereClause.status = { equals: "closed" };
        } else {
          // Fetch both closed and partial trades
          whereClause.status = { in: ["closed", "partial"] };
        }
        
        // For date filtering, fetch a wider range to capture trades that might have exits in target period
        if (filters.timePeriod !== "all") {
          const today = new Date();
          let fetchStartDate;
          
          if (filters.timePeriod === "year") {
            // Fetch from beginning of previous year to cover all possible exits in current year
            fetchStartDate = new Date(today.getFullYear() - 1, 0, 1);
          } else if (filters.timePeriod === "month") {
            // Fetch from 3 months ago to cover trades that might exit this month
            fetchStartDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
          } else if (filters.timePeriod === "week") {
            // Fetch from 1 month ago to cover trades that might exit this week
            fetchStartDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
          } else if (filters.timePeriod === "custom" && filters.startDate) {
            // For custom range, fetch from 3 months before start date
            const customStart = new Date(filters.startDate);
            fetchStartDate = new Date(customStart.getFullYear(), customStart.getMonth() - 3, 1);
          }
          
          if (fetchStartDate) {
            whereClause.entryDate = { 
              greater_than_equal: fetchStartDate.toISOString().split("T")[0] 
            };
          }
        }
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append("limit", "1000");
        params.append("depth", "1");
        
        // Convert where clause to URL parameters
        const encodeWhereClause = (obj: any, prefix = "where") => {
          for (const [key, value] of Object.entries(obj)) {
            if (value && typeof value === "object") {
              if (Array.isArray(value)) {
                // Handle arrays (for 'in' operations)
                params.append(`${prefix}[${key}][in]`, value.join(","));
              } else {
                // Handle nested objects
                for (const [nestedKey, nestedValue] of Object.entries(value)) {
                  params.append(`${prefix}[${key}][${nestedKey}]`, String(nestedValue));
                }
              }
            } else {
              params.append(`${prefix}[${key}]`, String(value));
            }
          }
        };
        
        encodeWhereClause(whereClause);
        
        // Fetch trades
        const response = await apiClient.get(`/trades`);
        
        if (response.data && response.data.docs) {
          const allTrades: Trade[] = response.data.docs;
          
          // Apply comprehensive filtering (status + date)
          const filteredTrades = filterTrades(allTrades, filters);
          
          // Create buckets and populate with filtered trade data
          const buckets = createBuckets();
          
          // Process only the filtered trades
          filteredTrades.forEach(trade => {
            let profitLossPercent: number | undefined;
            let hasValidPLData = false;
            
            // Try to get P/L data based on view mode
            if (viewMode === "normalized" && trade.normalizedMetrics?.profitLossPercent !== undefined) {
              profitLossPercent = trade.normalizedMetrics.profitLossPercent;
              hasValidPLData = !isNaN(profitLossPercent);
            } else if (trade.profitLossPercent !== null && trade.profitLossPercent !== undefined) {
              profitLossPercent = trade.profitLossPercent;
              hasValidPLData = !isNaN(profitLossPercent);
            }
            
            if (hasValidPLData) {
              // Find the appropriate P/L bucket
              const bucket = buckets.find(b => {
                if (profitLossPercent === undefined) return false;
                if (b.upperBound === Infinity) {
                  return profitLossPercent >= b.lowerBound;
                }
                return profitLossPercent >= b.lowerBound && profitLossPercent < b.upperBound;
              });
              
              if (bucket) {
                bucket.count++;
              }
            }
          });
          
          // Calculate summary data - using filtered trades
          const tradesWithPLData = filteredTrades.filter(trade => {
            if (viewMode === "normalized" && trade.normalizedMetrics?.profitLossPercent !== undefined) {
              return !isNaN(trade.normalizedMetrics.profitLossPercent);
            }
            return trade.profitLossPercent !== null && 
                   trade.profitLossPercent !== undefined && 
                   !isNaN(trade.profitLossPercent);
          });
          
          const summary: TradeDataSummary = {
            totalFetched: filteredTrades.length,
            totalWithPLData: tradesWithPLData.length,
            totalInHistogram: tradesWithPLData.length, // Only trades with P/L data are shown
          };
          
          setHistogramData(buckets);
          setTradeDataSummary(summary);
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (error) {
        console.error("Error fetching trade data for histogram:", error);
        setError("Failed to load trade data for histogram. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTradeData();
  }, [filters, viewMode]);

  // Custom tooltip for the histogram
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.range}</p>
          <p className="text-primary">
            Count: {data.count} trades
          </p>
          <p className="text-muted-foreground text-sm">
            {tradeDataSummary.totalInHistogram > 0 ? ((data.count / tradeDataSummary.totalInHistogram) * 100).toFixed(1) : 0}% of all trades
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Loading histogram data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10">
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (tradeDataSummary.totalFetched === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Trade Distribution Histogram
            {viewMode === "normalized" && (
              <Badge variant="outline" className="bg-primary/20 border-primary/50 text-primary">
                Normalized View
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No trade data available for the selected filters.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Trade Distribution Histogram
          {viewMode === "normalized" && (
            <Badge variant="outline" className="bg-primary/20 border-primary/50 text-primary">
              Normalized View
            </Badge>
          )}
        </CardTitle>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Distribution showing {filters.statusFilter === "closed-only" ? "CLOSED" : "CLOSED & PARTIAL"} trades by profit/loss percentages in 2% increments. Red bars = losses, green bars = gains.
          </p>
          
          {/* Data Summary */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {filters.statusFilter === "closed-only" ? "Closed trades:" : "Closed & partial trades:"}
              </span>
              <span className="text-primary">{tradeDataSummary.totalFetched}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Shown in histogram:</span>
              <span className="text-primary">{tradeDataSummary.totalInHistogram}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={histogramData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="range" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={10}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                label={{ value: 'Number of Trades', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              
              <Bar 
                dataKey="count" 
                name="Number of Trades"
                radius={[2, 2, 0, 0]}
              >
                {histogramData.map((bucket, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={bucket.color}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
        
      </CardContent>
    </Card>
  );
}