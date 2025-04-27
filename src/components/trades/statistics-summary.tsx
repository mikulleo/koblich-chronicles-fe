"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { InfoIcon } from "lucide-react";
import { TradeStats, StatsMetadata } from "./trade-statistics";

interface StatisticsCardProps {
  title: string;
  value: string | number;
  info?: string;
  className?: string;
  positive?: boolean;
  negative?: boolean;
}

function StatisticsCard({ 
  title, 
  value, 
  info, 
  className = "",
  positive = false,
  negative = false,
}: StatisticsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            {title}
            {info && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{info}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h3>
        </div>
        <div className={`text-2xl font-bold ${positive ? 'text-green-600' : ''} ${negative ? 'text-red-600' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatisticsSummaryProps {
  stats: TradeStats;
  metadata: StatsMetadata;
  viewMode: "standard" | "normalized";
}

export function StatisticsSummary({ stats, metadata, viewMode }: StatisticsSummaryProps) {
  const isNormalized = viewMode === "normalized";
  
  // Format percentage values
  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Format ratio values
  const formatRatio = (value: number): string => {
    return value.toFixed(2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Performance Summary</h2>
        
        {/* Filter indicators */}
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-muted/50">
            {metadata.statusFilter}
          </Badge>
          <Badge variant="outline" className="bg-muted/50">
            {metadata.dateRange}
          </Badge>
          {metadata.tickerFilter && (
            <Badge variant="outline" className="bg-muted/50">
              Filtered by ticker
            </Badge>
          )}
          {isNormalized && (
            <Badge variant="outline" className="bg-primary/20 border-primary/50 text-primary">
              Normalized View
            </Badge>
          )}
        </div>
      </div>
      
      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Batting Average */}
        <StatisticsCard
          title="Batting Average"
          value={`${stats.battingAverage.toFixed(1)}%`}
          info="Percentage of winning trades out of all trades."
          positive={stats.battingAverage > 50}
          negative={stats.battingAverage < 50}
        />
        
        {/* Win/Loss Ratio */}
        <StatisticsCard
          title="Win/Loss Ratio"
          value={formatRatio(isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio)}
          info="Ratio between average winning percentage and average losing percentage. Formula: AverageWin% ÷ |AverageLoss%|"
          positive={(isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio) > 1}
          negative={(isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio) < 1}
        />
        
        {/* Adjusted Win/Loss Ratio */}
        <StatisticsCard
          title="Adjusted Win/Loss"
          value={formatRatio(isNormalized ? stats.normalized.adjustedWinLossRatio : stats.adjustedWinLossRatio)}
          info="Win/Loss ratio adjusted by batting average. Formula: (WinRate × AverageWin%) ÷ ((1-WinRate) × |AverageLoss%|)"
          positive={(isNormalized ? stats.normalized.adjustedWinLossRatio : stats.adjustedWinLossRatio) > 1}
          negative={(isNormalized ? stats.normalized.adjustedWinLossRatio : stats.adjustedWinLossRatio) < 1}
        />
        
        {/* R-Ratio */}
        <StatisticsCard
          title="Average R-Ratio"
          value={formatRatio(isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio)}
          info="Average reward-to-risk ratio across all trades. Formula: Average(Profit/Loss ÷ Initial Risk)"
          positive={(isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio) > 1}
          negative={(isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio) < 1}
        />
        
        {/* Trade Count */}
        <StatisticsCard
          title="Total Trades"
          value={metadata.totalTrades}
          info={`${metadata.closedTrades} closed trades, ${metadata.partialTrades} partial trades`}
        />
        
        {/* Win Rate Breakdown */}
        <StatisticsCard
          title="Win/Loss/Break-Even Count"
          value={`${stats.winningTrades} / ${stats.losingTrades} / ${stats.breakEvenTrades}`}
          info="Count of winning trades, losing trades, and break-even trades."
        />
        
        {/* Average Win % */}
        <StatisticsCard
          title="Average Win %"
          value={formatPercent(isNormalized ? stats.normalized.averageWinPercent : stats.averageWinPercent)}
          info="Average percentage gain on winning trades."
          positive={true}
        />
        
        {/* Average Loss % */}
        <StatisticsCard
          title="Average Loss %"
          value={formatPercent(isNormalized ? stats.normalized.averageLossPercent : stats.averageLossPercent)}
          info="Average percentage loss on losing trades."
          negative={true}
        />
      </div>
    </div>
  );
}