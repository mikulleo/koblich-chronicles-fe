"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { useChartColors, tooltipStyle } from "@/hooks/use-chart-colors";

interface TrapFrequencyChartProps {
  trapCounts: Record<string, number>;
}

export function TrapFrequencyChart({ trapCounts }: TrapFrequencyChartProps) {
  const c = useChartColors();

  const data = Object.entries(trapCounts)
    .map(([trap, count]) => ({
      trap: trap.replace(/_/g, " "),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trap Frequency</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm py-8">
          No trap data yet
        </CardContent>
      </Card>
    );
  }

  // Gradient from danger to warning based on frequency
  const maxCount = data[0]?.count ?? 1;
  const getBarColor = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return c.danger;
    if (ratio > 0.4) return c.warning;
    return c.series[2];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Most Common Traps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: c.text }}
                axisLine={{ stroke: c.grid }}
                tickLine={{ stroke: c.grid }}
              />
              <YAxis
                type="category"
                dataKey="trap"
                tick={{ fontSize: 10, fill: c.text }}
                width={120}
                axisLine={{ stroke: c.grid }}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle(c)} cursor={{ fill: c.grid, opacity: 0.3 }} />
              <defs>
                {data.map((entry, i) => (
                  <linearGradient key={`grad-${i}`} id={`trapGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={getBarColor(entry.count)} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={getBarColor(entry.count)} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <Bar dataKey="count" name="Occurrences" radius={[0, 6, 6, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={`url(#trapGrad-${i})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
