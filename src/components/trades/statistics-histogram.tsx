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
import { useChartColors } from "@/hooks/use-chart-colors";
import { StatsFilters } from "./trade-statistics";

interface Trade {
  id: string | number;
  profitLossPercent: number | null;
  status: string;
  normalizedMetrics?: {
    profitLossPercent: number | null;
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
  trades: Trade[];
}

export function StatisticsHistogram({ filters, viewMode, trades }: StatisticsHistogramProps) {
  const chartColors = useChartColors();
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

  useEffect(() => {
    const processTradeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Trades come from /trades/stats — already filtered by status, date and ticker
        // exactly like the stats themselves
        const filteredTrades = trades;
          
          // Create buckets and populate with filtered trade data
          const buckets = createBuckets();
          
          // Process only the filtered trades
          filteredTrades.forEach(trade => {
            let profitLossPercent: number | undefined;
            let hasValidPLData = false;
            
            // Try to get P/L data based on view mode
            if (viewMode === "normalized" && trade.normalizedMetrics?.profitLossPercent != null) {
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
            if (viewMode === "normalized" && trade.normalizedMetrics?.profitLossPercent != null) {
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
      } catch (error) {
        console.error("Error fetching trade data for histogram:", error);
        setError("Failed to load trade data for histogram. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    processTradeData();
  }, [viewMode, trades]);

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
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="range"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={10}
                tick={{ fontSize: 10, fill: chartColors.text }}
              />
              <YAxis
                label={{ value: 'Number of Trades', angle: -90, position: 'insideLeft', fill: chartColors.text }}
                tick={{ fontSize: 12, fill: chartColors.text }}
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