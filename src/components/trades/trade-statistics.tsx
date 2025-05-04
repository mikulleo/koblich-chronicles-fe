// trade-statistics.tsx

"use client";

import React, { useState, useEffect } from "react";
import { StatisticsFilters } from "./statistics-filter";
import { StatisticsSummary } from "./statistics-summary";
import { StatisticsDetails } from "./statistics-details";
import { StatisticsCharts } from "./statistics-charts";
import { StatisticsByTimeperiod } from "./statistics-by-timeperiod";
import { MetricCalculationsInfo } from "./metric-calculation-info";
import apiClient from "@/lib/api/client";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filters
  const [filters, setFilters] = useState<StatsFilters>({
    timePeriod: "month",
    statusFilter: "all",
    viewMode: "standard",
  });

  // Fetch statistics data based on filters
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        
        // Handle time period filters
        if (filters.timePeriod === "custom" && filters.startDate && filters.endDate) {
          params.append("startDate", filters.startDate);
          params.append("endDate", filters.endDate);
        } else if (filters.timePeriod !== "all") {
          // Set date range based on selected time period
          const endDate = new Date();
          const startDate = new Date();
          
          if (filters.timePeriod === "year") {
            startDate.setFullYear(startDate.getFullYear() - 1);
          } else if (filters.timePeriod === "month") {
            startDate.setMonth(startDate.getMonth() - 1);
          } else if (filters.timePeriod === "week") {
            startDate.setDate(startDate.getDate() - 7);
          }
          
          params.append("startDate", startDate.toISOString().split("T")[0]);
          params.append("endDate", endDate.toISOString().split("T")[0]);
        }
        
        // Add ticker filter if selected
        if (filters.tickerId) {
          params.append("tickerId", filters.tickerId);
        }
        
        // Add status filter
        if (filters.statusFilter === "closed-only") {
          params.append("statusFilter", "closed-only");
        }
        
        // Fetch data
        const response = await apiClient.get(`/trades/stats?${params.toString()}`);
        
        if (response.data) {
          setStats(response.data.stats);
          setMetadata(response.data.metadata);
        } else {
          throw new Error("Unexpected response format");
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
        setError("Failed to load statistics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatistics();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<StatsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats || !metadata) {
    return (
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
    );
  }

  // Show stats or no data message
  return (
    <div className="space-y-6">
      {/* Filters */}
      <StatisticsFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />
      
      {/* Summary statistics */}
      <StatisticsSummary 
        stats={stats} 
        metadata={metadata}
        viewMode={filters.viewMode}
      />
      
      {/* Time-period based statistics */}
      <StatisticsByTimeperiod 
        viewMode={filters.viewMode}
        statusFilter={filters.statusFilter}
      />
      
      {/* Visualizations */}
      <StatisticsCharts 
        stats={stats} 
        metadata={metadata}
        viewMode={filters.viewMode}
      />
      
      {/* Detailed statistics */}
      <StatisticsDetails 
        stats={stats} 
        metadata={metadata}
        viewMode={filters.viewMode}
      />
      
      {/* Calculation formulas info */}
      <MetricCalculationsInfo />
    </div>
  );
}