"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Area,
  ComposedChart,
  Cell,
  ReferenceLine,
} from "recharts";
import { useChartColors, tooltipStyle } from "@/hooks/use-chart-colors";
import apiClient from "@/lib/api/client";
import type { DisciplineStreaks, DisciplineAnalytics } from "@/lib/types";

export function DisciplineAnalyticsView() {
  const c = useChartColors();
  const [streaks, setStreaks] = useState<DisciplineStreaks | null>(null);
  const [analytics, setAnalytics] = useState<DisciplineAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streaksRes, analyticsRes] = await Promise.all([
          apiClient.get("/discipline-log/streaks", { params: { depth: 0 } }),
          apiClient.get("/discipline-log/analytics", { params: { depth: 0 } }),
        ]);
        setStreaks(streaksRes.data);
        setAnalytics(analyticsRes.data);
      } catch {
        // Silently handle - data may not exist yet
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!streaks || !analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No discipline data yet. Start logging daily compliance to see analytics.
        </CardContent>
      </Card>
    );
  }

  const mentalStateData = Object.entries(analytics.violationsByMentalState)
    .map(([state, count]) => ({
      state: state.replace(/_/g, " "),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const complianceData = analytics.dailyCompliance
    .slice(-30)
    .reverse()
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rate: d.complianceRate,
    }));

  const avgCompliance = complianceData.length > 0
    ? Math.round(complianceData.reduce((s, d) => s + d.rate, 0) / complianceData.length)
    : 0;

  const maxViolations = mentalStateData[0]?.count ?? 1;

  return (
    <div className="space-y-4">
      {/* Streak cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
            <div className="text-3xl font-bold">{streaks.currentStreak}</div>
            <div className="text-xs text-muted-foreground">Current Streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
            <div className="text-3xl font-bold">{streaks.bestStreak}</div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <div className="text-3xl font-bold">{streaks.averageCompliance}%</div>
            <div className="text-xs text-muted-foreground">Avg Compliance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold">{streaks.totalDays}</div>
            <div className="text-xs text-muted-foreground">Days Tracked</div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance trend */}
      {complianceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Compliance Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={complianceData}>
                  <defs>
                    <linearGradient id="complianceGrad" x1="0" y1="0" x2="0" y2="1">
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
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: c.text }}
                    axisLine={{ stroke: c.grid }}
                    tickLine={{ stroke: c.grid }}
                  />
                  <Tooltip contentStyle={tooltipStyle(c)} />
                  <ReferenceLine
                    y={avgCompliance}
                    stroke={c.text}
                    strokeDasharray="5 5"
                    strokeOpacity={0.4}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    fill="url(#complianceGrad)"
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke={c.success}
                    strokeWidth={2.5}
                    name="Compliance %"
                    dot={false}
                    activeDot={{ r: 5, stroke: c.success, strokeWidth: 2, fill: c.tooltipBg }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Violations by mental state */}
      {mentalStateData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Violations by Mental State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mentalStateData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: c.text }}
                    axisLine={{ stroke: c.grid }}
                    tickLine={{ stroke: c.grid }}
                  />
                  <YAxis
                    type="category"
                    dataKey="state"
                    tick={{ fontSize: 10, fill: c.text }}
                    width={100}
                    axisLine={{ stroke: c.grid }}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle(c)} cursor={{ fill: c.grid, opacity: 0.3 }} />
                  <Bar dataKey="count" name="Violations" radius={[0, 6, 6, 0]}>
                    {mentalStateData.map((entry, i) => {
                      const ratio = entry.count / maxViolations;
                      const color = ratio > 0.7 ? c.danger : ratio > 0.4 ? c.warning : c.series[2];
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most violated rules */}
      {analytics.violationsByRule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Most Violated Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.violationsByRule.slice(0, 5).map((rule, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{rule.title}</span>
                  <Badge variant="destructive">{rule.count}x</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
