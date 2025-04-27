"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
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
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { TradeStats, StatsMetadata } from "./trade-statistics";

interface StatisticsChartsProps {
  stats: TradeStats;
  metadata: StatsMetadata;
  viewMode: "standard" | "normalized";
}

export function StatisticsCharts({ stats, metadata, viewMode }: StatisticsChartsProps) {
  const isNormalized = viewMode === "normalized";

  // Win/Loss breakdown data for pie chart
  const winLossData = [
    { name: "Winning Trades", value: stats.winningTrades, color: "#4ade80" },
    { name: "Losing Trades", value: stats.losingTrades, color: "#f87171" },
    { name: "Break Even", value: stats.breakEvenTrades, color: "#94a3b8" },
  ];

  // Performance metrics data for bar chart
  const performanceData = [
    {
      name: "Win Rate",
      value: stats.battingAverage,
      fill: stats.battingAverage > 50 ? "#4ade80" : "#f87171",
    },
    {
      name: "Avg Win %",
      value: isNormalized ? stats.normalized.averageWinPercent : stats.averageWinPercent,
      fill: "#4ade80",
    },
    {
      name: "Avg Loss %",
      value: Math.abs(isNormalized ? stats.normalized.averageLossPercent : stats.averageLossPercent),
      fill: "#f87171",
    },
    {
      name: "Win/Loss Ratio",
      value: (isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio) * 25, // Scale for visibility
      fill: (isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio) > 1 ? "#4ade80" : "#f87171",
    },
    {
      name: "R-Ratio",
      value: (isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio) * 25, // Scale for visibility
      fill: (isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio) > 1 ? "#4ade80" : "#f87171",
    },
  ];

  // Strategy metrics for radar chart
  const strategyMetrics = [
    {
      metric: "Win Rate",
      value: Math.min(100, stats.battingAverage),
      fullMark: 100,
    },
    {
      metric: "Win/Loss",
      value: Math.min(100, (isNormalized ? stats.normalized.winLossRatio : stats.winLossRatio) * 25),
      fullMark: 100,
    },
    {
      metric: "R-Ratio",
      value: Math.min(100, (isNormalized ? stats.normalized.averageRRatio : stats.averageRRatio) * 25),
      fullMark: 100, 
    },
    {
      metric: "Profit Factor",
      value: Math.min(100, (isNormalized ? stats.normalized.profitFactor : stats.profitFactor) * 20),
      fullMark: 100,
    },
    {
      metric: "Expectancy",
      value: Math.min(100, Math.max(0, (isNormalized ? stats.normalized.expectancy : stats.expectancy) * 20)),
      fullMark: 100,
    },
  ];

  // Custom tooltip formatter for percentage values
  const percentFormatter = (value: number) => `${value.toFixed(2)}%`;
  
  // Custom tooltip formatter for ratio values
  const ratioFormatter = (value: number, name: string) => {
    if (name === "Win/Loss Ratio" || name === "R-Ratio") {
      return (value / 25).toFixed(2); // Unscale for display
    }
    return value.toFixed(2);
  };

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
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="winloss">Win/Loss</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={performanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                />
                <YAxis 
                  label={{ 
                    value: 'Value (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }} 
                />
                <RechartsTooltip 
                  formatter={ratioFormatter}
                />
                <Legend wrapperStyle={{ bottom: 0 }} />
                <Bar 
                  dataKey="value" 
                  name="Value" 
                  isAnimationActive={true}
                >
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          {/* Win/Loss Tab */}
          <TabsContent value="winloss" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
          
          {/* Metrics Tab */}
          <TabsContent value="metrics" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: "Metrics",
                    "Avg Win %": isNormalized ? stats.normalized.averageWinPercent : stats.averageWinPercent,
                    "Avg Loss %": isNormalized ? stats.normalized.averageLossPercent : stats.averageLossPercent,
                    "Max Gain %": isNormalized ? stats.normalized.maxGainPercent : stats.maxGainPercent,
                    "Max Loss %": isNormalized ? stats.normalized.maxLossPercent : stats.maxLossPercent,
                  },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" hide />
                <RechartsTooltip formatter={percentFormatter} />
                <Legend />
                <Bar dataKey="Avg Win %" name="Avg Win %" fill="#4ade80" />
                <Bar dataKey="Avg Loss %" name="Avg Loss %" fill="#f87171" />
                <Bar dataKey="Max Gain %" name="Max Gain %" fill="#22c55e" />
                <Bar dataKey="Max Loss %" name="Max Loss %" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          {/* Strategy Tab */}
          <TabsContent value="strategy" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={strategyMetrics}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Strategy Performance"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}