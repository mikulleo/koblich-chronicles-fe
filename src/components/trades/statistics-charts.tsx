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

interface StatisticsChartsProps {
  stats: TradeStats;
  metadata: StatsMetadata;
  viewMode: "standard" | "normalized";
}

export function StatisticsCharts({ stats, metadata, viewMode }: StatisticsChartsProps) {
  const isNormalized = viewMode === "normalized";
  const [chartError, setChartError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("winloss");

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

  // Strategy metrics for radar chart - with safety checks
  const strategyMetrics = [
    {
      metric: "Win Rate",
      value: Math.min(100, Math.max(0, stats.battingAverage)),
      fullMark: 100,
      description: "Percentage of winning trades"
    },
    {
      metric: "Win/Loss",
      value: Math.min(100, Math.max(0, (isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio) * 25)),
      fullMark: 100,
      description: "Ratio of avg win% to avg loss%"
    },
    {
      metric: "R-Ratio",
      value: Math.min(100, Math.max(0, (isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio) * 25)),
      fullMark: 100,
      description: "Profit relative to initial risk"
    },
    {
      metric: "Profit Factor",
      value: Math.min(100, Math.max(0, (isNormalized ? stats.normalized.profitFactor : stats.profitFactor) * 20)),
      fullMark: 100,
      description: "Gross profit ÷ gross loss"
    },
    {
      metric: "Expectancy",
      value: Math.min(100, Math.max(0, (isNormalized ? stats.normalized.expectancy : stats.expectancy) * 20 + 50)),
      fullMark: 100,
      description: "Expected P/L per trade"
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
                      <RechartsTooltip />
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
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" hide />
                    <RechartsTooltip formatter={percentFormatter} />
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
                  This radar chart shows how your trading strategy performs across five key metrics. Each axis represents a different aspect of performance, with higher values (farther from center) being better.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {strategyMetrics.map((metric, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <span className="font-medium min-w-24">{metric.metric}:</span>
                      <span>
                        {metric.description}.
                        {metric.metric === "Win Rate" && ` Actual percentage shown.`}
                        {metric.metric === "Win/Loss" && ` Values multiplied by 25 for visibility.`}
                        {metric.metric === "R-Ratio" && ` Values multiplied by 25 for visibility.`}
                        {metric.metric === "Profit Factor" && ` Values multiplied by 20 for visibility.`}
                        {metric.metric === "Expectancy" && ` Values shifted and scaled for visibility.`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={strategyMetrics}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name="Strategy Performance"
                      dataKey="value"
                      stroke={colors.radar.stroke}
                      fill={colors.radar.fill}
                      fillOpacity={0.4}
                    />
                    <RechartsTooltip 
                      formatter={(value: any, name: string, props: any) => {
                        const metric = props.payload.metric;
                        let displayValue = value;
                        let unit = "";
                        
                        // Format based on metric
                        if (metric === "Win Rate") {
                          unit = "%";
                        } else if (metric === "Win/Loss") {
                          displayValue = (displayValue / 25).toFixed(2);
                        } else if (metric === "R-Ratio") {
                          displayValue = (displayValue / 25).toFixed(2);
                        } else if (metric === "Profit Factor") {
                          displayValue = (displayValue / 20).toFixed(2);
                        } else if (metric === "Expectancy") {
                          displayValue = ((displayValue - 50) / 20).toFixed(2);
                          unit = "%";
                        }
                        
                        return [`${displayValue}${unit}`, "Actual Value"];
                      }}
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