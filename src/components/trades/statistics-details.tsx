"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TradeStats, StatsMetadata } from "./trade-statistics";

interface StatisticsDetailsProps {
  stats: TradeStats;
  metadata: StatsMetadata;
  viewMode: "standard" | "normalized";
}

export function StatisticsDetails({ stats, metadata, viewMode }: StatisticsDetailsProps) {
  const isNormalized = viewMode === "normalized";
  
  // Format percentage values
  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Format ratio values
  const formatRatio = (value: number): string => {
    return value.toFixed(2);
  };
  
  // Format monetary values (commented out as per requirement)
  // const formatMoney = (value: number): string => {
  //   return new Intl.NumberFormat('en-US', {
  //     style: 'currency',
  //     currency: 'USD'
  //   }).format(value);
  // };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Detailed Statistics
          {isNormalized && (
            <Badge variant="outline" className="bg-primary/20 border-primary/50 text-primary ml-2">
              Normalized View
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="performance">
          {/* Performance Metrics */}
          <AccordionItem value="performance">
            <AccordionTrigger>Performance Metrics</AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Profit Factor</TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.profitFactor : stats.profitFactor, 1)}>
                        {formatRatio(isNormalized ? stats.normalized.profitFactor : stats.profitFactor)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Gross profits divided by gross losses. Values above 1 indicate profitable trading.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Expectancy</TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.expectancy : stats.expectancy, 0)}>
                        {formatPercent(isNormalized ? stats.normalized.expectancy : stats.expectancy)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Expected P/L per trade. Formula: (Win% × Avg Win%) + ((1-Win%) × Avg Loss%)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total P/L %</TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.totalProfitLossPercent : stats.totalProfitLossPercent, 0)}>
                        {formatPercent(isNormalized ? stats.normalized.totalProfitLossPercent : stats.totalProfitLossPercent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Cumulative percentage profit/loss across all trades.
                      </TableCell>
                    </TableRow>
                    {/* Profit/Loss $ is intentionally excluded as per requirements */}
                    {/* <TableRow>
                      <TableCell className="font-medium">Total P/L $</TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.totalProfitLoss : stats.totalProfitLoss, 0)}>
                        {formatMoney(isNormalized ? stats.normalized.totalProfitLoss : stats.totalProfitLoss)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Cumulative dollar profit/loss across all trades.
                      </TableCell>
                    </TableRow> */}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Win/Loss Analysis */}
          <AccordionItem value="winloss">
            <AccordionTrigger>Win/Loss Analysis</AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Win Rate</TableCell>
                      <TableCell className={getColorClass(stats.battingAverage, 50, "percent")}>
                        {stats.battingAverage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Percentage of winning trades out of all trades.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Average Win</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatPercent(isNormalized ? stats.normalized.averageWinPercent : stats.averageWinPercent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Average percentage gain on winning trades.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Average Loss</TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.averageLossPercent : stats.averageLossPercent, 0, "loss")}>
                        {formatPercent(isNormalized ? stats.normalized.averageLossPercent : stats.averageLossPercent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Average percentage loss on losing trades.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          Win/Loss Ratio
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Ratio between average winning percentage and average losing percentage.</p>
                                <p className="mt-1 text-xs font-mono">Formula: AverageWin% ÷ |AverageLoss%|</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio, 1, "ratio")}>
                        {formatRatio(isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Ratio between average win percentage and average loss percentage.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          Adjusted Win/Loss
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Win/loss ratio adjusted by win rate.</p>
                                <p className="mt-1 text-xs font-mono">Formula: (WinRate × AvgWin%) ÷ ((1-WinRate) × |AvgLoss%|)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.adjustedWinLossRatio : stats.adjustedWinLossRatio, 1)}>
                        {formatRatio(isNormalized ? stats.normalized.adjustedWinLossRatio : stats.adjustedWinLossRatio)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Win/loss ratio adjusted by win rate, accounting for frequency of wins vs losses.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Risk Metrics */}
          <AccordionItem value="risk">
            <AccordionTrigger>Risk Metrics</AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          Average R-Ratio
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Average reward-to-risk ratio across all trades.</p>
                                <p className="mt-1 text-xs font-mono">Formula: Profit/Loss ÷ Initial Risk</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio, 1)}>
                        {formatRatio(isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Average profit/loss relative to initial risk.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Max Gain %</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatPercent(isNormalized ? stats.normalized.maxGainPercent : stats.maxGainPercent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Largest percentage gain in a single trade.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Max Loss %</TableCell>
                      <TableCell className="text-red-600 font-medium">
                        {formatPercent(isNormalized ? stats.normalized.maxLossPercent : stats.maxLossPercent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Largest percentage loss in a single trade.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Max Gain/Loss Ratio</TableCell>
                      <TableCell className={getColorClass(isNormalized ? stats.normalized.maxGainLossRatio : stats.maxGainLossRatio, 1)}>
                        {formatRatio(isNormalized ? stats.normalized.maxGainLossRatio : stats.maxGainLossRatio)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Ratio between maximum gain and maximum loss.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Time Metrics */}
          <AccordionItem value="time">
            <AccordionTrigger>Time Metrics</AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Avg Days Held (Winners)</TableCell>
                      <TableCell>{stats.averageDaysHeldWinners.toFixed(1)} days</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Average number of days winning trades were held.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Avg Days Held (Losers)</TableCell>
                      <TableCell>{stats.averageDaysHeldLosers.toFixed(1)} days</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Average number of days losing trades were held.
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Hold Time Ratio (Win:Loss)</TableCell>
                      <TableCell>
                        {stats.averageDaysHeldLosers 
                          ? (stats.averageDaysHeldWinners / stats.averageDaysHeldLosers).toFixed(2) 
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        Ratio of how long winners are held compared to losers.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// Helper function to determine text color class based on value
function getColorClass(value: number, threshold: number, metric: string = ""): string {
    // Special handling for different metric types
    if (metric === "loss") {
      // For loss metrics, we expect negative values, so use neutral or muted colors
      return value < -5 ? "text-red-600 font-medium" : // Only truly bad losses are bright red
             value < 0 ? "text-red-400 font-medium" :   // Normal losses are muted red
             "text-gray-600 font-medium";               // Positive values (unusual for losses)
    }
    
    // For ratio metrics (typically good when > 1)
    if (metric === "ratio") {
      return value >= 1.5 ? "text-green-600 font-medium" : // Strong performance
             value >= 1.0 ? "text-green-500 font-medium" : // Good performance
             value >= 0.8 ? "text-amber-500 font-medium" : // Close to good
             value >= 0.5 ? "text-amber-600 font-medium" : // Need improvement
             "text-red-500 font-medium";                   // Poor performance
    }
    
    // For percentage metrics (typically good when > 0)
    if (metric === "percent") {
      return value >= 1.0 ? "text-green-600 font-medium" : // Good positive value
             value > 0 ? "text-green-500 font-medium" :    // Any positive is good
             value === 0 ? "text-gray-600 font-medium" :   // Neutral
             value > -1.0 ? "text-amber-600 font-medium" : // Small negative
             "text-red-500 font-medium";                   // Significant negative
    }
    
    // Default behavior with more nuance
    if (value > threshold * 1.5) return "text-green-600 font-medium"; // Significantly above threshold
    if (value > threshold) return "text-green-500 font-medium";       // Above threshold
    if (value === threshold) return "";                               // At threshold
    if (value > threshold * 0.8) return "text-amber-500 font-medium"; // Slightly below threshold
    if (value > threshold * 0.5) return "text-amber-600 font-medium"; // Below threshold but not terrible
    return "text-red-500 font-medium";                                // Significantly below threshold
  }