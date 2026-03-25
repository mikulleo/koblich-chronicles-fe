"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Brain, ChevronDown, TrendingUp, RefreshCw, Trash2, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";
import { useChartColors, tooltipStyle } from "@/hooks/use-chart-colors";
import apiClient from "@/lib/api/client";
import type { MindsetEvaluation } from "@/lib/types";

interface RemainingInfo {
  date: string;
  used: number;
  limit: number;
  remaining: number;
}

export function AIInsightsSection() {
  const c = useChartColors();
  const [evaluations, setEvaluations] = useState<MindsetEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [remainingMap, setRemainingMap] = useState<Record<string, RemainingInfo>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async () => {
    try {
      const response = await apiClient.get("/mindset-evaluations", {
        params: {
          where: {
            status: { equals: "completed" },
          },
          sort: "-date",
          limit: 14,
        },
      });
      setEvaluations(response.data.docs || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  // Fetch remaining counts for visible dates
  useEffect(() => {
    if (evaluations.length === 0) return;

    const dates = [...new Set(evaluations.map((e) => e.date.split("T")[0]))];
    Promise.all(
      dates.map(async (date) => {
        try {
          const res = await apiClient.get("/mindset-evaluations/remaining", {
            params: { date },
          });
          return { date: date!, data: res.data as RemainingInfo };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      const map: Record<string, RemainingInfo> = {};
      for (const r of results) {
        if (r) map[r.date] = r.data;
      }
      setRemainingMap(map);
    });
  }, [evaluations]);

  const handleRegenerate = async (ev: MindsetEvaluation) => {
    const dateKey = ev.date.split("T")[0]!;
    const remaining = remainingMap[dateKey];
    if (remaining && remaining.remaining <= 0) {
      setError(`Regeneration limit reached for ${dateKey} (max ${remaining.limit})`);
      return;
    }

    setRegeneratingId(ev.id);
    setError(null);
    try {
      const response = await apiClient.post("/mindset-evaluations/evaluate", {
        type: ev.evaluationType,
        date: dateKey,
        force: true,
      });
      if (response.data) {
        await fetchEvaluations();
        // Update remaining
        try {
          const remRes = await apiClient.get("/mindset-evaluations/remaining", {
            params: { date: dateKey },
          });
          setRemainingMap((prev) => ({ ...prev, [dateKey]: remRes.data }));
        } catch {
          // Silent
        }
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosError.response?.status === 429) {
        setError(axiosError.response.data?.error || "Regeneration limit reached.");
      } else {
        setError("Failed to regenerate evaluation.");
      }
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDelete = async (ev: MindsetEvaluation) => {
    setDeletingId(ev.id);
    setError(null);
    try {
      await apiClient.post("/mindset-evaluations/remove", { id: ev.id });
      setEvaluations((prev) => prev.filter((e) => e.id !== ev.id));
      // Update remaining
      const dateKey = ev.date.split("T")[0]!;
      try {
        const remRes = await apiClient.get("/mindset-evaluations/remaining", {
          params: { date: dateKey },
        });
        setRemainingMap((prev) => ({ ...prev, [dateKey]: remRes.data }));
      } catch {
        // Silent
      }
    } catch {
      setError("Failed to delete evaluation.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (evaluations.length === 0) {
    return null;
  }

  // Prepare chart data (chronological order)
  const chartData = [...evaluations]
    .reverse()
    .filter((e) => e.aiAnalysis?.overallScore)
    .map((e) => ({
      date: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: e.aiAnalysis?.overallScore || 0,
    }));

  // Aggregate pattern frequency
  const patternCounts: Record<string, number> = {};
  for (const ev of evaluations) {
    for (const pattern of ev.aiAnalysis?.patternsIdentified || []) {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    }
  }
  const sortedPatterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Coaching Insights
        </h3>
        <p className="text-muted-foreground text-sm">
          Trends and patterns from your AI evaluations.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-500/10 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Score trend chart */}
      {chartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overall Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c.primary} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={c.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tick={{ fill: c.text }}
                  axisLine={{ stroke: c.grid }}
                  tickLine={{ stroke: c.grid }}
                />
                <YAxis
                  domain={[1, 10]}
                  fontSize={12}
                  tick={{ fill: c.text }}
                  axisLine={{ stroke: c.grid }}
                  tickLine={{ stroke: c.grid }}
                />
                <Tooltip contentStyle={tooltipStyle(c)} />
                <Area
                  type="monotone"
                  dataKey="score"
                  fill="url(#scoreGrad)"
                  stroke="none"
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={c.primary}
                  strokeWidth={2.5}
                  dot={{ fill: c.primary, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: c.primary, strokeWidth: 2, fill: c.tooltipBg }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Aggregated patterns */}
      {sortedPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recurring Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sortedPatterns.map(([pattern, count]) => (
                <Badge key={pattern} variant="outline">
                  {pattern} ({count}x)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent evaluations list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent AI Evaluations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {evaluations.slice(0, 7).map((ev) => {
            const dateKey = ev.date.split("T")[0]!;
            const remaining = remainingMap[dateKey];
            const isRegenerating = regeneratingId === ev.id;
            const isDeleting = deletingId === ev.id;
            const canRegenerate = !remaining || remaining.remaining > 0;

            return (
              <Collapsible
                key={ev.id}
                open={expandedId === ev.id}
                onOpenChange={(open) => setExpandedId(open ? ev.id : null)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-24">
                      {new Date(ev.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <Badge
                      variant={
                        (ev.aiAnalysis?.overallScore || 0) >= 7
                          ? "default"
                          : (ev.aiAnalysis?.overallScore || 0) >= 4
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-xs"
                    >
                      Score: {ev.aiAnalysis?.overallScore || "N/A"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ev.evaluationType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandedId === ev.id ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 text-sm space-y-3 border-l-2 border-primary/20 ml-2">
                    {ev.aiAnalysis?.coachingFeedback && (
                      <p className="text-muted-foreground whitespace-pre-line">
                        {ev.aiAnalysis.coachingFeedback}
                      </p>
                    )}
                    {ev.aiAnalysis?.focusForTomorrow && (
                      <div className="rounded bg-primary/5 p-2">
                        <span className="font-medium">Focus: </span>
                        {ev.aiAnalysis.focusForTomorrow}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerate(ev);
                        }}
                        disabled={isRegenerating || !canRegenerate}
                        className="text-xs"
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        {isRegenerating ? "Regenerating..." : "Regenerate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ev);
                        }}
                        disabled={isDeleting}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                      {remaining && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {remaining.remaining}/{remaining.limit} regenerations left
                        </span>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
