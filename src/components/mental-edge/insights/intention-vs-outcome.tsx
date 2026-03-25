"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { useChartColors, tooltipStyle } from "@/hooks/use-chart-colors";
import type { CheckInTrends } from "@/lib/types";

interface IntentionVsOutcomeProps {
  trends: CheckInTrends["trends"];
}

export function IntentionVsOutcome({ trends }: IntentionVsOutcomeProps) {
  const c = useChartColors();

  const adherenceData = trends
    .filter((d) => d.intentionAdherence !== undefined)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      adherence: d.intentionAdherence || 0,
    }));

  const totalDaysWithIntentions = adherenceData.length;
  const avgAdherence =
    totalDaysWithIntentions > 0
      ? Math.round(
          adherenceData.reduce((sum, d) => sum + d.adherence, 0) / totalDaysWithIntentions
        )
      : 0;
  const perfectDays = adherenceData.filter((d) => d.adherence === 100).length;

  if (adherenceData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Intention vs Outcome</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm py-8">
          Need at least 2 days of complete check-ins with intentions set
        </CardContent>
      </Card>
    );
  }

  const getBarColor = (value: number) => {
    if (value >= 80) return c.success;
    if (value >= 50) return c.warning;
    return c.danger;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Intention Adherence Over Time</CardTitle>
        <CardDescription className="text-xs">
          How well do your stated intentions translate to actual behavior?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{avgAdherence}%</div>
            <div className="text-xs text-muted-foreground">Average</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{perfectDays}</div>
            <div className="text-xs text-muted-foreground">Perfect Days</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalDaysWithIntentions}</div>
            <div className="text-xs text-muted-foreground">Days Tracked</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={adherenceData.slice(-30)}>
              <defs>
                <linearGradient id="adherenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.success} stopOpacity={1} />
                  <stop offset="100%" stopColor={c.success} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: c.text }}
                axisLine={{ stroke: c.grid }}
                tickLine={{ stroke: c.grid }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: c.text }}
                axisLine={{ stroke: c.grid }}
                tickLine={{ stroke: c.grid }}
              />
              <Tooltip contentStyle={tooltipStyle(c)} />
              <ReferenceLine
                y={avgAdherence}
                stroke={c.text}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
                label={{ value: "avg", position: "right", fill: c.text, fontSize: 10 }}
              />
              <Bar dataKey="adherence" name="Adherence %" radius={[4, 4, 0, 0]}>
                {adherenceData.slice(-30).map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.adherence)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
