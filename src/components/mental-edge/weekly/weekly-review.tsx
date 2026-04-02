"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Calendar, Target, AlertTriangle, TrendingUp, Brain, Sparkles, Loader2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import type { WeeklySummary, MindsetEvaluation } from "@/lib/types";
import { useMindsetEvaluation } from "@/hooks/use-mindset-evaluation";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function WeeklyReview() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { evaluation: weeklyEvaluation, generating: weeklyGenerating, error: weeklyError, fetchLatestEvaluation, generate: generateWeekly } = useMindsetEvaluation();

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/mental-check-ins/weekly-summary", {
          params: { weekStart, depth: 0 },
        });
        setSummary(response.data);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
    fetchLatestEvaluation(weekStart);
  }, [weekStart, fetchLatestEvaluation]);

  const navigateWeek = (direction: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Weekly Mindset Review</h2>
        <p className="text-muted-foreground text-sm">
          Aggregated insights from your daily check-ins across the week.
        </p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4" />
          {formatDate(weekStart)} — {formatDate(
            new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString()
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateWeek(1)}
          disabled={getWeekStart(new Date()) === weekStart}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !summary || summary.daysLogged === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No check-in data for this week.</p>
            <p className="text-sm mt-1">Complete daily check-ins to generate weekly summaries.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold">{summary.daysLogged}/5</div>
                <div className="text-xs text-muted-foreground">Days Logged</div>
              </CardContent>
            </Card>
            {summary.averageIntentionAdherence !== null && (
              <Card>
                <CardContent className="py-4 text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <div className="text-3xl font-bold">{summary.averageIntentionAdherence}%</div>
                  <div className="text-xs text-muted-foreground">Avg Intention Adherence</div>
                </CardContent>
              </Card>
            )}
            {summary.averageStateConsistency !== null && (
              <Card>
                <CardContent className="py-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <div className="text-3xl font-bold">{summary.averageStateConsistency}</div>
                  <div className="text-xs text-muted-foreground">Avg State Drift</div>
                </CardContent>
              </Card>
            )}
            {summary.riskPredictionRate !== null && (
              <Card>
                <CardContent className="py-4 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                  <div className="text-3xl font-bold">{summary.riskPredictionRate}%</div>
                  <div className="text-xs text-muted-foreground">Positive Risk Outcomes</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Traps this week */}
          {Object.keys(summary.trapCounts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Traps This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.trapCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([trap, count]) => (
                      <Badge key={trap} variant="destructive">
                        {trap.replace(/_/g, " ")} ({count}x)
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Behaviors this week */}
          {Object.keys(summary.behaviorCounts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Negative Behaviors This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(summary.behaviorCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([behavior, count]) => (
                      <div key={behavior} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{behavior.replace(/([A-Z])/g, " $1").trim()}</span>
                        <Badge variant="outline">{count} days</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drift patterns */}
          {Object.keys(summary.driftPatterns).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Emotional Drift Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.driftPatterns)
                    .sort((a, b) => b[1] - a[1])
                    .map(([pattern, count]) => (
                      <Badge key={pattern} variant="secondary">
                        {pattern} ({count}x)
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.dailyData.map((day) => (
                  <div key={day.date} className="flex items-center gap-4 text-sm">
                    <span className="w-20 text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      {day.analysis?.intentionAdherence !== undefined && day.analysis.intentionAdherence !== null && (
                        <Badge variant="outline" className="text-xs">
                          {day.analysis.intentionAdherence}% adherence
                        </Badge>
                      )}
                      {day.traps.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {day.traps.length} traps
                        </Badge>
                      )}
                      {day.traps.length === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Clean day
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Weekly Summary */}
          {!weeklyEvaluation ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Weekly Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Get an AI-powered analysis of your week&apos;s mental performance.
                </p>
                {weeklyError && (
                  <p className="text-sm text-destructive">{weeklyError}</p>
                )}
                <Button
                  variant="outline"
                  onClick={() => generateWeekly("weekly_summary", weekStart)}
                  disabled={weeklyGenerating}
                >
                  {weeklyGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Get AI Weekly Summary
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : weeklyEvaluation.aiAnalysis ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Weekly Summary
                  </CardTitle>
                  {weeklyEvaluation.aiAnalysis.overallScore && (
                    <Badge
                      variant={weeklyEvaluation.aiAnalysis.overallScore >= 7 ? "default" : weeklyEvaluation.aiAnalysis.overallScore >= 4 ? "secondary" : "destructive"}
                    >
                      Score: {weeklyEvaluation.aiAnalysis.overallScore}/10
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {weeklyEvaluation.aiAnalysis.coachingFeedback && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {weeklyEvaluation.aiAnalysis.coachingFeedback}
                  </p>
                )}
                {weeklyEvaluation.aiAnalysis.riskAlerts && weeklyEvaluation.aiAnalysis.riskAlerts.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {weeklyEvaluation.aiAnalysis.riskAlerts.map((alert, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">{alert}</Badge>
                    ))}
                  </div>
                )}
                {weeklyEvaluation.aiAnalysis.actionableInsights && weeklyEvaluation.aiAnalysis.actionableInsights.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Key Insights:</span>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground pl-4 list-disc">
                      {weeklyEvaluation.aiAnalysis.actionableInsights.map((insight, i) => (
                        <li key={i}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {weeklyEvaluation.aiAnalysis.focusForTomorrow && (
                  <div className="rounded bg-primary/5 p-2 text-sm">
                    <span className="font-medium">Focus for next week: </span>
                    {weeklyEvaluation.aiAnalysis.focusForTomorrow}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
