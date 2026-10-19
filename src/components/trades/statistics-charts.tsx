// src/components/trades/statistics-charts.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, PieChartIcon, Info } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { TradeStats, StatsMetadata } from "./trade-statistics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChartColors, tooltipStyle as makeTooltipStyle } from "@/hooks/use-chart-colors";

interface StatisticsChartsProps {
  stats: TradeStats;
  metadata: StatsMetadata;
  viewMode: "standard" | "normalized";
}

export function StatisticsCharts({ stats, metadata, viewMode }: StatisticsChartsProps) {
  const isNormalized = viewMode === "normalized";
  const [chartError, setChartError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("winloss");
  const chartColors = useChartColors();

  // Modern color palette
  const colors = {
    // Vibrant modern palette
    winningTrades: "#06b6d4", // Cyan
    losingTrades: "#8b5cf6",  // Violet
    breakEven: "#d1d5db",     // Gray
    
    // Bar chart colors
    avgWin: "#0ea5e9",        // Sky blue
    avgLoss: "#f97316",       // Orange
    maxGain: "#0284c7",       // Darker sky blue
    maxLoss: "#ea580c",       // Darker orange
    
    // Radar chart
    radar: {
      stroke: "#14b8a6",      // Teal
      fill: "#14b8a6",        // Teal
    }
  };

  const ttStyle = makeTooltipStyle(chartColors);

  // Validate data to avoid chart errors
  const validateData = () => {
    try {
      if (!stats) {
        throw new Error("Statistics data is missing");
      }

      // Make sure all required numeric values exist and are numbers
      const requiredNumericValues = [
        stats.battingAverage,
        isNormalized ? stats.normalized.averageWinPercent : stats.averageWinPercent,
        isNormalized ? stats.normalized.averageLossPercent : stats.averageLossPercent,
      ];

      if (requiredNumericValues.some(val => val === undefined || val === null || isNaN(val))) {
        throw new Error("Some required statistics values are missing or invalid");
      }

      // Check that we have at least one trade 
      if (stats.winningTrades === 0 && stats.losingTrades === 0 && stats.breakEvenTrades === 0) {
        throw new Error("No trade data available for visualizations");
      }

      setChartError(null);
      return true;
    } catch (error) {
      console.error("Chart data validation error:", error);
      setChartError(error instanceof Error ? error.message : "Unknown error with chart data");
      return false;
    }
  };

  // Validate data on component mount and when stats change
  useEffect(() => {
    validateData();
  }, [stats, viewMode]);

  // Win/Loss breakdown data for pie chart
  const winLossData = [
    { name: "Winning Trades", value: stats.winningTrades, color: colors.winningTrades },
    { name: "Losing Trades", value: stats.losingTrades, color: colors.losingTrades },
    { name: "Break Even", value: stats.breakEvenTrades, color: colors.breakEven },
  ].filter(item => item.value > 0); // Only include segments with values

  // Metrics data with modern colors
  const metricsData = [
    {
      name: "Metrics",
      "Avg Win %": isNormalized ? stats.normalized.averageWinPercent : stats.averageWinPercent,
      "Avg Loss %": Math.abs(isNormalized ? stats.normalized.averageLossPercent : stats.averageLossPercent),
      "Max Gain %": isNormalized ? stats.normalized.maxGainPercent : stats.maxGainPercent,
      "Max Loss %": Math.abs(isNormalized ? stats.normalized.maxLossPercent : stats.maxLossPercent),
    }
  ];

  // Colors for metrics bars
  const metricColors = {
    "Avg Win %": colors.avgWin,
    "Avg Loss %": colors.avgLoss,
    "Max Gain %": colors.maxGain,
    "Max Loss %": colors.maxLoss
  };

  // Strategy metrics for radar chart.
  // Every axis is scored 0-100 with break-even at 50, so the dashed break-even ring is
  // directly comparable across axes: outside the ring = good, inside = bad.
  // Ratios (Win/Loss, Profit Factor) use a log2 scale so 0.5x and 2x sit equally far from 1.0.
  const toScore = (value: number) => (Number.isNaN(value) ? 0 : Math.min(100, Math.max(0, value)));
  const logRatioScore = (ratio: number) => toScore(50 + 25 * Math.log2(Math.max(ratio, 0)));

  const winRate = stats.battingAverage;
  const winLossRatio = isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio;
  const averageRRatio = isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio;
  const profitFactor = isNormalized ? stats.normalized.profitFactor : stats.profitFactor;
  const expectancy = isNormalized ? stats.normalized.expectancy : stats.expectancy;

  const strategyMetrics = [
    {
      metric: "Win Rate",
      value: toScore(winRate),
      breakEven: 50,
      actual: `${winRate.toFixed(1)}%`,
      breakEvenLabel: "50%",
      description: "Percentage of winning trades. Plotted as-is (edge = 100%)"
    },
    {
      metric: "Win/Loss",
      value: logRatioScore(winLossRatio),
      breakEven: 50,
      actual: winLossRatio.toFixed(2),
      breakEvenLabel: "1.00",
      description: "Avg win% ÷ avg loss%. Log scale: ring = 1.0, 2.0 halfway to edge, edge = 4.0"
    },
    {
      metric: "R-Ratio",
      value: toScore(50 + 25 * averageRRatio),
      breakEven: 50,
      actual: `${averageRRatio >= 0 ? "+" : ""}${averageRRatio.toFixed(2)}R`,
      breakEvenLabel: "0R",
      description: "Average R per trade. Ring = 0R, each 1R = a quarter of the axis, edge = +2R"
    },
    {
      metric: "Profit Factor",
      value: logRatioScore(profitFactor),
      breakEven: 50,
      actual: Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞",
      breakEvenLabel: "1.00",
      description: "Gross profit ÷ gross loss. Log scale: ring = 1.0, 2.0 halfway to edge, edge = 4.0"
    },
    {
      metric: "Expectancy",
      value: toScore(50 + 20 * expectancy),
      breakEven: 50,
      actual: `${expectancy >= 0 ? "+" : ""}${expectancy.toFixed(2)}%`,
      breakEvenLabel: "0%",
      description: "Expected P/L per trade. Ring = 0%, edge = +2.5%"
    },
  ];

  // Custom tooltip formatter for percentage values
  const percentFormatter = (value: number) => `${value.toFixed(2)}%`;

  // Custom pie chart label renderer to display values inside the chart
  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    // Only render label if the segment is large enough
    if (percent < 0.05) return null;
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${value} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  // If we have a validation error, show an alert
  if (chartError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Performance Visualizations
            {isNormalized && (
              <Badge variant="outline" className="bg-primary/20 border-primary/50 text-primary ml-2">
                Normalized View
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No data for the selected filters: {chartError}
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4 items-center justify-center h-60 bg-muted/30 rounded-lg">
            <PieChartIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Performance Visualizations
          {isNormalized && (
            <Badge variant="outline" className="bg-primary/20 border-primary/50 text-primary ml-2">
              Normalized View
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="winloss">Win/Loss</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>
          
          {/* Win/Loss Tab */}
          <TabsContent value="winloss" className="min-h-[300px]">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Distribution of winning and losing trades during the selected period.
              </p>
              <div className="w-full h-[300px]">
                {winLossData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedPieLabel}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {winLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={ttStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Not enough data for win/loss breakdown</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Metrics Tab */}
          <TabsContent value="metrics" className="min-h-[300px]">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Average and maximum gain/loss percentages for your trades. All values shown as positive percentages for easier comparison.
              </p>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={metricsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis type="number" tick={{ fill: chartColors.text }} />
                    <YAxis dataKey="name" type="category" hide />
                    <RechartsTooltip formatter={percentFormatter} contentStyle={ttStyle} />
                    <Legend />
                    <Bar dataKey="Avg Win %" name="Avg Win %" fill={metricColors["Avg Win %"]} />
                    <Bar dataKey="Avg Loss %" name="Avg Loss %" fill={metricColors["Avg Loss %"]} />
                    <Bar dataKey="Max Gain %" name="Max Gain %" fill={metricColors["Max Gain %"]} />
                    <Bar dataKey="Max Loss %" name="Max Loss %" fill={metricColors["Max Loss %"]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          {/* Strategy Tab */}
          <TabsContent value="strategy" className="min-h-[300px]">
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Strategy Radar Chart Explanation</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  This radar chart shows how your trading strategy performs across five key metrics. The dashed ring marks break-even on every axis (50% win rate, 1.0 ratio, 0R, 0% expectancy) &mdash; anything outside the ring is working for you, anything inside is working against you. Values beyond the edge are capped there; hover for the actual numbers.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {strategyMetrics.map((metric, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <span className="font-medium min-w-24">{metric.metric}:</span>
                      <span>
                        {metric.description}.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={strategyMetrics}>
                    <PolarGrid stroke={chartColors.grid} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: chartColors.text }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Strategy Performance"
                      dataKey="value"
                      stroke={colors.radar.stroke}
                      fill={colors.radar.fill}
                      fillOpacity={0.4}
                    />
                    <Radar
                      name="Break-even"
                      dataKey="breakEven"
                      stroke={chartColors.text}
                      strokeDasharray="4 4"
                      fill="none"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <RechartsTooltip
                      contentStyle={ttStyle}
                      formatter={(_value: any, name: string, props: any) =>
                        name === "Break-even"
                          ? [props.payload.breakEvenLabel, "Break-even"]
                          : [props.payload.actual, "Actual Value"]
                      }
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}