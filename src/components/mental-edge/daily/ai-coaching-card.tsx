"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Brain, ChevronDown, Sparkles, AlertTriangle, Trophy, Target, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useMindsetEvaluation } from "@/hooks/use-mindset-evaluation";
import apiClient from "@/lib/api/client";

interface AICoachingCardProps {
  date: string;
}

interface RemainingInfo {
  used: number;
  limit: number;
  remaining: number;
}

function getScoreColor(score: number): string {
  if (score <= 3) return "text-red-500";
  if (score <= 5) return "text-yellow-500";
  if (score <= 7) return "text-blue-500";
  if (score <= 9) return "text-green-500";
  return "text-emerald-500";
}

function getScoreBadgeVariant(score: number): "destructive" | "outline" | "default" | "secondary" {
  if (score <= 3) return "destructive";
  if (score <= 5) return "outline";
  if (score <= 7) return "secondary";
  return "default";
}

export function AICoachingCard({ date }: AICoachingCardProps) {
  const { evaluation, loading, generating, deleting, error, fetchLatestEvaluation, generate, deleteEvaluation } = useMindsetEvaluation();
  const [patternsOpen, setPatternsOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [remaining, setRemaining] = useState<RemainingInfo | null>(null);

  useEffect(() => {
    fetchLatestEvaluation(date);
    // Fetch remaining regenerations
    apiClient.get("/mindset-evaluations/remaining", { params: { date } })
      .then((res) => setRemaining(res.data))
      .catch(() => {});
  }, [date, fetchLatestEvaluation]);

  const handleGenerate = async () => {
    await generate("daily_post_market", date);
    // Refresh remaining count
    apiClient.get("/mindset-evaluations/remaining", { params: { date } })
      .then((res) => setRemaining(res.data))
      .catch(() => {});
  };

  const handleRegenerate = async () => {
    if (remaining && remaining.remaining <= 0) return;
    await generate("daily_post_market", date, true);
    apiClient.get("/mindset-evaluations/remaining", { params: { date } })
      .then((res) => setRemaining(res.data))
      .catch(() => {});
  };

  const handleDelete = async () => {
    if (!evaluation) return;
    const success = await deleteEvaluation(evaluation.id);
    if (success) {
      apiClient.get("/mindset-evaluations/remaining", { params: { date } })
        .then((res) => setRemaining(res.data))
        .catch(() => {});
    }
  };

  const canRegenerate = !remaining || remaining.remaining > 0;

  // Loading skeleton
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Coaching
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  // No evaluation yet — show CTA
  if (!evaluation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Coaching
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Get personalized AI coaching based on your check-in data and discipline logs.
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Button onClick={handleGenerate} disabled={generating || !canRegenerate}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Evaluation
                </>
              )}
            </Button>
            {remaining && (
              <p className="text-xs text-muted-foreground">
                {remaining.remaining}/{remaining.limit} generations remaining for this date
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const ai = evaluation.aiAnalysis;
  if (!ai) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Coaching
          </CardTitle>
          {ai.overallScore && (
            <Badge variant={getScoreBadgeVariant(ai.overallScore)} className="text-lg px-3 py-1">
              <span className={getScoreColor(ai.overallScore)}>{ai.overallScore}</span>
              <span className="text-xs ml-1 opacity-70">/10</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main coaching feedback */}
        {ai.coachingFeedback && (
          <div className="text-sm leading-relaxed whitespace-pre-line">
            {ai.coachingFeedback}
          </div>
        )}

        {/* Risk alerts */}
        {ai.riskAlerts && ai.riskAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Risk Alerts
            </div>
            <div className="flex flex-wrap gap-1">
              {ai.riskAlerts.map((alert, i) => (
                <Badge key={i} variant="destructive" className="text-xs">
                  {alert}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {ai.strengthsHighlighted && ai.strengthsHighlighted.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4 text-green-500" />
              Strengths
            </div>
            <div className="flex flex-wrap gap-1">
              {ai.strengthsHighlighted.map((strength, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Patterns identified — collapsible */}
        {ai.patternsIdentified && ai.patternsIdentified.length > 0 && (
          <Collapsible open={patternsOpen} onOpenChange={setPatternsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:underline">
              <ChevronDown className={`h-4 w-4 transition-transform ${patternsOpen ? "rotate-180" : ""}`} />
              Patterns Identified ({ai.patternsIdentified.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground pl-6 list-disc">
                {ai.patternsIdentified.map((pattern, i) => (
                  <li key={i}>{pattern}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Actionable insights — collapsible */}
        {ai.actionableInsights && ai.actionableInsights.length > 0 && (
          <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:underline">
              <ChevronDown className={`h-4 w-4 transition-transform ${insightsOpen ? "rotate-180" : ""}`} />
              Actionable Insights ({ai.actionableInsights.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground pl-6 list-disc">
                {ai.actionableInsights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Focus for tomorrow */}
        {ai.focusForTomorrow && (
          <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Target className="h-4 w-4 text-primary" />
              Focus for Tomorrow
            </div>
            <p className="text-sm text-muted-foreground">{ai.focusForTomorrow}</p>
          </div>
        )}

        {/* Regenerate / Delete actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={generating || !canRegenerate}
            className="text-xs"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {generating ? "Regenerating..." : "Regenerate"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-destructive hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3 mr-1" />
            )}
            {deleting ? "Deleting..." : "Delete"}
          </Button>
          {remaining && (
            <span className="text-xs text-muted-foreground ml-auto">
              {remaining.remaining}/{remaining.limit} regenerations left
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
