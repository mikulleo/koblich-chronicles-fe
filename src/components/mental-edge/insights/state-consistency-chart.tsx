"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import { useChartColors, tooltipStyle } from "@/hooks/use-chart-colors";
import type { CheckInTrends } from "@/lib/types";

interface StateConsistencyChartProps {
  trends: CheckInTrends["trends"];
}

export function StateConsistencyChart({ trends }: StateConsistencyChartProps) {
  const c = useChartColors();

  const data = trends
    .filter((d) => d.stateConsistency !== undefined)
    .map((d) => {
      const preAvg =
        Object.entries(d.preMarket)
          .filter(([key]) => ["focus", "patience", "confidence", "calmness"].includes(key))
          .reduce((sum, [, v]) => sum + v, 0) / 4 || 0;
      const postAvg =
        Object.entries(d.postMarket)
          .reduce((sum, [, v]) => sum + v, 0) /
          Math.max(Object.keys(d.postMarket).length, 1) || 0;

      return {
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        preMarket: Math.round(preAvg * 100) / 100,
        postMarket: Math.round(postAvg * 100) / 100,
        drift: d.stateConsistency,
      };
    });

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">State Consistency</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm py-8">
          Need at least 2 days of complete check-ins
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Pre vs Post Market State</CardTitle>
        <CardDescription className="text-xs">
          Compare your morning mental state to end-of-day performance ratings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="preGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.series[1]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={c.series[1]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.success} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={c.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: c.text }}
                axisLine={{ stroke: c.grid }}
                tickLine={{ stroke: c.grid }}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fontSize: 10, fill: c.text }}
                axisLine={{ stroke: c.grid }}
                tickLine={{ stroke: c.grid }}
              />
              <Tooltip contentStyle={tooltipStyle(c)} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: c.text }}
              />
              <Area
                type="monotone"
                dataKey="preMarket"
                fill="url(#preGrad)"
                stroke="none"
                name="Pre-Market Avg"
              />
              <Area
                type="monotone"
                dataKey="postMarket"
                fill="url(#postGrad)"
                stroke="none"
                name="Post-Market Avg"
              />
              <Line
                type="monotone"
                dataKey="preMarket"
                stroke={c.series[1]}
                strokeWidth={2.5}
                name="Pre-Market Avg"
                dot={{ fill: c.series[1], r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: c.series[1], strokeWidth: 2, fill: c.tooltipBg }}
              />
              <Line
                type="monotone"
                dataKey="postMarket"
                stroke={c.success}
                strokeWidth={2.5}
                name="Post-Market Avg"
                dot={{ fill: c.success, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: c.success, strokeWidth: 2, fill: c.tooltipBg }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
