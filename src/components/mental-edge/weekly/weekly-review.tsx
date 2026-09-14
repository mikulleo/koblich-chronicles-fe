"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Calendar, Target, AlertTriangle, TrendingUp, Brain, Sparkles, Loader2, RefreshCw, Trash2, BookOpen } from "lucide-react";
import apiClient from "@/lib/api/client";
import type { WeeklySummary, JournalEntryType } from "@/lib/types";
import { useMindsetEvaluation } from "@/hooks/use-mindset-evaluation";

const JOURNAL_TYPE_LABELS: Record<JournalEntryType, string> = {
  pre_market_note: "Pre-Market Note",
  post_market_reflection: "Post-Market Reflection",
  mistake_review: "Mistake Review",
  trigger_review: "Trigger Review",
  weekly_review: "Weekly Review",
  rule_violation_review: "Rule Violation Review",
};

const JOURNAL_TYPE_COLORS: Record<JournalEntryType, string> = {
  pre_market_note: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  post_market_reflection: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  mistake_review: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  trigger_review: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  weekly_review: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rule_violation_review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

interface RemainingInfo {
  used: number;
  limit: number;
  remaining: number;
}

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
  const { evaluation: weeklyEvaluation, generating: weeklyGenerating, deleting: weeklyDeleting, error: weeklyError, fetchLatestEvaluation, generate: generateWeekly, deleteEvaluation: deleteWeekly } = useMindsetEvaluation();
  const [remaining, setRemaining] = useState<RemainingInfo | null>(null);

  const refreshRemaining = useCallback((date: string) => {
    apiClient.get("/mindset-evaluations/remaining", { params: { date } })
      .then((res) => setRemaining(res.data))
      .catch(() => {});
  }, []);

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
    refreshRemaining(weekStart);
  }, [weekStart, fetchLatestEvaluation, refreshRemaining]);

  const canRegenerate = !remaining || remaining.remaining > 0;

  const handleGenerateWeekly = async () => {
    await generateWeekly("weekly_summary", weekStart);
    refreshRemaining(weekStart);
  };

  const handleRegenerateWeekly = async () => {
    if (remaining && remaining.remaining <= 0) return;
    await generateWeekly("weekly_summary", weekStart, true);
    refreshRemaining(weekStart);
  };

  const handleDeleteWeekly = async () => {
    if (!weeklyEvaluation) return;
    const success = await deleteWeekly(weeklyEvaluation.id);
    if (success) refreshRemaining(weekStart);
  };

  const navigateWeek = (direction: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // The week's journal notes count as data even when no check-in was logged.
  const journalEntries = summary?.journal?.entries ?? [];
  const journalCount = summary?.journal?.count ?? journalEntries.length;
  const hasCheckInData = (summary?.daysLogged ?? 0) > 0;
  const hasAnyData = hasCheckInData || journalCount > 0;
  // Traps from check-ins and journal entries alike; falls back to the
  // check-in-only counts if the backend hasn't got the combined field yet.
  const trapCounts = summary?.combinedTrapCounts ?? summary?.trapCounts ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Weekly Mindset Review</h2>
        <p className="text-muted-foreground text-sm">
          Aggregated insights from your daily check-ins and journal notes across the week.
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
      ) : !summary || !hasAnyData ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No check-in or journal data for this week.</p>
            <p className="text-sm mt-1">
              Complete daily check-ins or write journal notes to generate weekly summaries.
            </p>
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
            <Card>
              <CardContent className="py-4 text-center">
                <BookOpen className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
                <div className="text-3xl font-bold">{journalCount}</div>
                <div className="text-xs text-muted-foreground">Journal Notes</div>
              </CardContent>
            </Card>
          </div>

          {/* Traps this week — from check-ins and journal entries */}
          {Object.keys(trapCounts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Traps This Week</CardTitle>
                <CardDescription className="text-xs">
                  Counted across daily check-ins and journal entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(trapCounts)
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
          {hasCheckInData && Object.keys(summary.behaviorCounts).length > 0 && (
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
          {hasCheckInData && Object.keys(summary.driftPatterns).length > 0 && (
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
          {hasCheckInData && (
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
          )}

          {/* Journal notes written this week */}
          {journalEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Journal Notes This Week ({journalEntries.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Every journal entry dated in this week, not just pre/post-market notes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {journalEntries.map((entry, idx) => (
                  <div key={entry.id} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Badge variant="secondary" className={JOURNAL_TYPE_COLORS[entry.entryType]}>
                        {JOURNAL_TYPE_LABELS[entry.entryType]}
                      </Badge>
                      <span className="text-sm font-medium">{entry.title}</span>
                    </div>
                    {entry.answeredPrompts.slice(0, 2).map((prompt, i) => (
                      <div key={i} className="pl-20 text-sm">
                        <div className="text-xs font-medium text-muted-foreground">
                          {prompt.prompt}
                        </div>
                        <div className="line-clamp-2">{prompt.response}</div>
                      </div>
                    ))}
                    {entry.answeredPrompts.length > 2 && (
                      <div className="pl-20 text-xs text-muted-foreground">
                        +{entry.answeredPrompts.length - 2} more responses
                      </div>
                    )}
                    {entry.freeContent && (
                      <p className="pl-20 text-sm text-muted-foreground line-clamp-3">
                        {entry.freeContent}
                      </p>
                    )}
                    {entry.linkedTraps.length > 0 && (
                      <div className="pl-20 flex flex-wrap gap-1">
                        {entry.linkedTraps.map((trap) => (
                          <Badge key={trap} variant="outline" className="text-xs">
                            {trap.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {idx < journalEntries.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
                  Get an AI-powered analysis of your week&apos;s mental performance, drawn
                  from your check-ins, journal notes and discipline log.
                </p>
                {weeklyError && (
                  <p className="text-sm text-destructive">{weeklyError}</p>
                )}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerateWeekly}
                    disabled={weeklyGenerating || !canRegenerate}
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
                  {remaining && (
                    <p className="text-xs text-muted-foreground">
                      {remaining.remaining}/{remaining.limit} generations remaining for this week
                    </p>
                  )}
                </div>
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
                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateWeekly}
                    disabled={weeklyGenerating || !canRegenerate}
                    className="text-xs"
                  >
                    {weeklyGenerating ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {weeklyGenerating ? "Regenerating..." : "Regenerate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteWeekly}
                    disabled={weeklyDeleting}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    {weeklyDeleting ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    {weeklyDeleting ? "Deleting..." : "Delete"}
                  </Button>
                  {remaining && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {remaining.remaining}/{remaining.limit} regenerations left
                    </span>
                  )}
                </div>
                {weeklyError && (
                  <p className="text-xs text-destructive">{weeklyError}</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
