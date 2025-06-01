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

  // Create buckets from -40% to 40%+ in 2% increments, plus a bucket for trades without P/L data
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
    
    // Add bucket for trades without P/L data (open trades, incomplete data, etc.)
    buckets.push({
      range: "No P/L Data",
      count: 0,
      lowerBound: -999, // Special value to identify this bucket
      upperBound: -999,
      rangeIndex: rangeIndex,
      color: "#6b7280", // Gray for unknown/incomplete data
      isNegative: false,
    });
    
    return buckets;
  };

  // Fetch trade data and create histogram
  useEffect(() => {
    const fetchTradeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        
        // Handle time period filters
        if (filters.timePeriod === "custom" && filters.startDate && filters.endDate) {
          params.append("where[entryDate][greater_than_equal]", filters.startDate);
          params.append("where[entryDate][less_than_equal]", filters.endDate);
        } else if (filters.timePeriod !== "all") {
          // Set date range based on selected time period
          const endDate = new Date();
          const today = new Date();
          let startDate;
          
          if (filters.timePeriod === "year") {
            // This year: January 1st of current year to today
            startDate = new Date(today.getFullYear(), 0, 1);
          } else if (filters.timePeriod === "month") {
            // This month: 1st day of current month to today
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          } else if (filters.timePeriod === "week") {
            // This week: Monday of current week to today
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            startDate = new Date(today.getFullYear(), today.getMonth(), diff);
          }
          
          if (startDate) {
            params.append("where[entryDate][greater_than_equal]", startDate.toISOString().split("T")[0]);
          }
          params.append("where[entryDate][less_than_equal]", endDate.toISOString().split("T")[0]);
        }
        
        // Add ticker filter if selected
        if (filters.tickerId) {
          params.append("where[ticker][equals]", filters.tickerId);
        }
        
        // Add status filter - get all trades (same as stats)
        if (filters.statusFilter === "closed-only") {
          params.append("where[status][equals]", "closed");
        } else {
          params.append("where[status][in]", "closed,partial");
        }
        
        // Fetch trades with profit/loss data
        const response = await apiClient.get(`/trades?${params.toString()}`);
        
        if (response.data && response.data.docs) {
          const allTrades: Trade[] = response.data.docs;
          
          // Create buckets and populate with ALL trade data
          const buckets = createBuckets();
          
          // Process every single trade
          allTrades.forEach(trade => {
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
                if (b.range === "No P/L Data") return false; // Skip the no-data bucket
                if (b.upperBound === Infinity) {
                  return profitLossPercent >= b.lowerBound;
                }
                return profitLossPercent >= b.lowerBound && profitLossPercent < b.upperBound;
              });
              
              if (bucket) {
                bucket.count++;
              }
            } else {
              // Trade has no valid P/L data - put it in the "No P/L Data" bucket
              const noPLBucket = buckets.find(b => b.range === "No P/L Data");
              if (noPLBucket) {
                noPLBucket.count++;
              }
            }
          });
          
          // Calculate summary data - now all trades are included
          const tradesWithPLData = allTrades.filter(trade => {
            if (viewMode === "normalized" && trade.normalizedMetrics?.profitLossPercent !== undefined) {
              return !isNaN(trade.normalizedMetrics.profitLossPercent);
            }
            return trade.profitLossPercent !== null && 
                   trade.profitLossPercent !== undefined && 
                   !isNaN(trade.profitLossPercent);
          });
          
          const summary: TradeDataSummary = {
            totalFetched: allTrades.length,
            totalWithPLData: tradesWithPLData.length,
            totalInHistogram: allTrades.length, // NOW ALL TRADES ARE IN THE HISTOGRAM
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
            Distribution showing ALL trades by profit/loss percentages in 2% increments. Red bars = losses, green bars = gains, gray = trades without P/L data.
          </p>
          
          {/* Data Summary */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-medium">Total trades:</span>
              <span className="text-primary">{tradeDataSummary.totalFetched}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">All shown in histogram:</span>
              <span className="text-primary">{tradeDataSummary.totalInHistogram}</span>
            </div>
            {tradeDataSummary.totalWithPLData < tradeDataSummary.totalFetched && (
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {tradeDataSummary.totalFetched - tradeDataSummary.totalWithPLData} trades in "No P/L Data" bucket
                </span>
              </div>
            )}
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
        
        {/* Additional Info - only show if there are trades without P/L data */}
        {tradeDataSummary.totalWithPLData < tradeDataSummary.totalFetched && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> {tradeDataSummary.totalFetched - tradeDataSummary.totalWithPLData} trade{tradeDataSummary.totalFetched - tradeDataSummary.totalWithPLData === 1 ? '' : 's'} 
              {tradeDataSummary.totalFetched - tradeDataSummary.totalWithPLData === 1 ? ' is' : ' are'} shown in the "No P/L Data" bucket because 
              {tradeDataSummary.totalFetched - tradeDataSummary.totalWithPLData === 1 ? ' it lacks' : ' they lack'} profit/loss data. 
              This typically happens with open trades that haven't been exited or trades with incomplete data.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}