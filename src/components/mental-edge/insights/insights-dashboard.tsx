"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StateConsistencyChart } from "./state-consistency-chart";
import { IntentionVsOutcome } from "./intention-vs-outcome";
import { DayEvaluation } from "./day-evaluation";
import {
  TrendingUp,
  TrendingDown,
  Brain,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Info,
  Repeat,
  Zap,
  CalendarDays,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import type { CheckInTrends, DeterministicInsights } from "@/lib/types";
import { AIInsightsSection } from "./ai-insights-section";
import { InsightsPeriodFilter } from "./insights-period-filter";
import {
  isIncompleteCustom,
  periodLabel,
  resolveInsightPeriod,
  type CustomRange,
  type InsightPeriodId,
} from "@/lib/mental-edge/insight-period";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InsightsDashboard() {
  const [period, setPeriod] = useState<InsightPeriodId>("all");
  const [customRange, setCustomRange] = useState<CustomRange>({});
  const [trends, setTrends] = useState<CheckInTrends | null>(null);
  const [insights, setInsights] = useState<DeterministicInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // A half-picked custom range would silently read as "all time", so hold the
  // previous window until both ends are chosen.
  const awaitingCustom = isIncompleteCustom(period, customRange);
  const { startDate, endDate } = useMemo(
    () => (awaitingCustom ? {} : resolveInsightPeriod(period, customRange)),
    [period, customRange, awaitingCustom],
  );

  useEffect(() => {
    if (awaitingCustom) return;

    let cancelled = false;
    const range: Record<string, string> = {};
    if (startDate) range.startDate = startDate;
    if (endDate) range.endDate = endDate;

    const fetchData = async () => {
      setRefreshing(true);
      try {
        const [trendsRes, insightsRes] = await Promise.all([
          apiClient.get("/mental-check-ins/trends", { params: { depth: 0, ...range } }),
          apiClient.get("/mental-check-ins/insights", { params: range }).catch(() => null),
        ]);
        if (cancelled) return;
        setTrends(trendsRes.data);
        // The endpoint 400s when the window holds fewer than 2 check-ins —
        // clear stale insights rather than showing the previous period's.
        setInsights(
          insightsRes?.data && !insightsRes.data.error ? insightsRes.data : null,
        );
      } catch {
        if (!cancelled) {
          setTrends(null);
          setInsights(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, awaitingCustom]);

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold mb-2">Insights Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          Deep analysis of your mental state patterns, consistency, and growth areas.
        </p>
      </div>
      <InsightsPeriodFilter
        period={period}
        customRange={customRange}
        onPeriodChange={setPeriod}
        onCustomRangeChange={setCustomRange}
        busy={refreshing && !loading}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (awaitingCustom) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Pick a start and end date to analyse a custom period.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!trends || trends.totalDays < 2) {
    const scoped = Boolean(startDate || endDate);
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {scoped ? (
              <>
                <p>
                  Not enough check-ins in {periodLabel(period).toLowerCase()}
                  {startDate ? ` (${formatDate(startDate)} – ${formatDate(endDate ?? startDate)})` : ""}.
                </p>
                <p className="text-sm mt-1">
                  At least 2 days are needed — try a wider period.
                </p>
              </>
            ) : (
              <>
                <p>Need at least 2 days of complete check-ins to generate insights.</p>
                <p className="text-sm mt-1">Complete your daily pre and post market check-ins.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const coverageLabel = insights
    ? `${periodLabel(period)} · based on ${insights.completeDays} complete day${insights.completeDays !== 1 ? "s" : ""}${insights.oldestDate ? ` (${formatDate(insights.oldestDate)} – ${formatDate(insights.latestDate)})` : ""}`
    : `${periodLabel(period)} · ${trends.totalDays} day${trends.totalDays !== 1 ? "s" : ""} recorded`;

  return (
    <div className={`space-y-6 ${refreshing ? "opacity-60 transition-opacity" : ""}`}>
      {header}
      <p className="text-xs text-muted-foreground/70 -mt-3 flex items-center gap-1">
        <CalendarDays className="h-3 w-3" />
        {coverageLabel}
      </p>

      {/* Browsable Day Review */}
      {trends && <DayEvaluation trends={trends.trends} />}

      {/* Key Metrics — rolling averages */}
      {insights && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>
              These metrics are <strong>rolling averages</strong> across the {insights.completeDays} complete days in this period — not a single day&apos;s value. They update whenever you save a check-in.
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.metrics.stateConsistency.currentAverage !== null && (
              <MetricCard
                label={insights.metrics.stateConsistency.label}
                value={insights.metrics.stateConsistency.currentAverage}
                description={insights.metrics.stateConsistency.description}
                interpretation={insights.metrics.stateConsistency.currentInterpretation}
                period={`avg over ${insights.completeDays} days in period`}
              />
            )}
            {insights.metrics.intentionAdherence.currentAverage !== null && (
              <MetricCard
                label={insights.metrics.intentionAdherence.label}
                value={`${insights.metrics.intentionAdherence.currentAverage}%`}
                description={insights.metrics.intentionAdherence.description}
                interpretation={insights.metrics.intentionAdherence.currentInterpretation}
                period={`avg over ${insights.completeDays} days in period`}
              />
            )}
          </div>
        </>
      )}

      {/* Fallback stats if no insights endpoint */}
      {!insights && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold">{trends.totalDays}</div>
              <div className="text-xs text-muted-foreground">Total Check-Ins</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold">
                {trends.trends.filter((d) => d.stateConsistency !== undefined).length}
              </div>
              <div className="text-xs text-muted-foreground">Complete Days</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recurring Patterns */}
      {insights && (insights.recurringPatterns.issues.length > 0 || insights.recurringPatterns.strengths.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Recurring Patterns
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Behaviors that appear in 25%+ of your tracked days in this period
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.recurringPatterns.issues.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recurring issues</div>
                {insights.recurringPatterns.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                    <span className="text-sm">{issue}</span>
                  </div>
                ))}
              </div>
            )}
            {insights.recurringPatterns.strengths.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your strengths</div>
                {insights.recurringPatterns.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conditional Correlations */}
      {insights && insights.conditionalInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Patterns &amp; Correlations
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Connections between your pre-market state/context and actual outcomes
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.conditionalInsights.map((ci, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded border bg-muted/30">
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">{ci.condition}</span>
                  <span className="text-muted-foreground">, {ci.outcome} </span>
                  <Badge variant="outline" className="text-xs ml-1">
                    {ci.rate}% of the time ({ci.occurrences}/{ci.total})
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trend Insights */}
      {insights && insights.trendInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trend Analysis
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              How your performance is changing over time (recent 7 days vs earlier)
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.trendInsights.map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-blue-500/10">
                {t.includes('improved') || t.includes('fewer') || t.includes('progress') ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                )}
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts — per-day data */}
      <div>
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          Charts below show individual daily values — each point is one day&apos;s check-in.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StateConsistencyChart trends={trends.trends} />
          <IntentionVsOutcome trends={trends.trends} />
        </div>
      </div>

      {/* AI Insights — trends are passed down so the AI's read of a day can be
          compared against what the trader reported about that same day. */}
      <AIInsightsSection trends={trends.trends} startDate={startDate} endDate={endDate} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  interpretation,
  period,
}: {
  label: string;
  value: string | number;
  description: string;
  interpretation: string | null;
  period?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-3xl font-bold">{value}</div>
            <CollapsibleTrigger className="p-1 rounded hover:bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
          </div>
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          {period && (
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">{period}</div>
          )}
          {interpretation && (
            <div className="text-xs text-primary mt-1">{interpretation}</div>
          )}
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground leading-relaxed">
              {description}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
