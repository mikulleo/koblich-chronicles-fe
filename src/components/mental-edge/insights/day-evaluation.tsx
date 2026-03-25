"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import type { CheckInTrendDay } from "@/lib/types";

interface DayEvaluationProps {
  trends: CheckInTrendDay[];
}

const TRAP_LABELS: Record<string, string> = {
  overtrading: "overtrading",
  fomo_entries: "FOMO entries",
  revenge_trading: "revenge trading",
  moving_stops: "moving stops",
  oversizing: "oversizing",
  not_taking_setups: "not taking setups",
  chasing: "chasing",
  impatience: "impatience",
};

function evaluateDay(day: CheckInTrendDay): {
  strengths: string[];
  issues: string[];
} {
  const strengths: string[] = [];
  const issues: string[] = [];

  const post = day.postMarket;
  const pre = day.preMarket;
  const behaviors = day.behaviors;

  // Strengths
  if ((post.planAdherence ?? 0) >= 4)
    strengths.push("You stuck to your trading plan well");
  if ((post.emotionalStability ?? 0) >= 4)
    strengths.push("You maintained strong emotional stability");
  if ((post.selectivity ?? 0) >= 4)
    strengths.push("You were selective with your entries");
  if (
    !behaviors.forcedTrades &&
    !behaviors.feltFomo &&
    !behaviors.reactiveAfterLoss &&
    !behaviors.carelessAfterWin
  ) {
    strengths.push("You avoided all negative behavioral traps");
  }
  if (day.intentionAdherence === 100)
    strengths.push(
      "Perfect intention adherence — you followed through on every intention"
    );
  else if (day.intentionAdherence !== undefined && day.intentionAdherence >= 75)
    strengths.push(
      `You followed through on ${day.intentionAdherence}% of your stated intentions`
    );
  if (day.riskPredictionAccuracy === true)
    strengths.push("Your risk prediction was accurate — good self-awareness");

  if (day.stateConsistency !== undefined && day.stateConsistency !== null) {
    const abs = Math.abs(day.stateConsistency);
    if (abs < 0.5)
      strengths.push(
        "Your mental state was very consistent from pre-market to post-market"
      );
    else if (day.stateConsistency > 0.5)
      strengths.push(
        "Your execution improved over your pre-market state — you performed better than you started"
      );
  }

  // Issues
  if (behaviors.forcedTrades)
    issues.push("You forced trades — this often leads to unnecessary losses");
  if (behaviors.feltFomo) issues.push("FOMO influenced your decisions");
  if (behaviors.reactiveAfterLoss)
    issues.push(
      "You reacted emotionally after a loss — a pattern worth addressing"
    );
  if (behaviors.carelessAfterWin)
    issues.push(
      "You became careless after winning — overconfidence may have crept in"
    );
  if ((post.planAdherence ?? 5) <= 2)
    issues.push(
      "Plan adherence was low — what pulled you off your plan?"
    );
  if ((post.emotionalStability ?? 5) <= 2)
    issues.push("Emotional stability was a challenge");
  if (
    day.intentionAdherence !== undefined &&
    day.intentionAdherence !== null &&
    day.intentionAdherence < 50
  ) {
    issues.push(
      `You only followed through on ${day.intentionAdherence}% of your intentions — consider setting fewer, more focused intentions`
    );
  }
  if ((pre.urgencyToMakeMoney ?? 0) >= 4)
    issues.push(
      "You started with high urgency to make money — this often leads to overtrading"
    );
  if ((pre.fomoLevel ?? 0) >= 4)
    issues.push("High FOMO level pre-market set a risky tone for the session");

  if (
    day.stateConsistency !== undefined &&
    day.stateConsistency !== null &&
    day.stateConsistency < -1.0
  ) {
    issues.push(
      "Your execution declined significantly from your pre-market state — something pulled you off track"
    );
  }

  const traps = day.traps || [];
  if (traps.length > 0) {
    const trapNames = traps.map((t) => TRAP_LABELS[t] || t);
    issues.push(`You fell into these traps: ${trapNames.join(", ")}`);
  }

  return { strengths, issues };
}

function formatDate(dateStr: string): string {
  // dateStr may be "YYYY-MM-DD" or a full ISO string like "2026-03-25T00:00:00.000Z"
  const dateOnly = dateStr.split("T")[0]!;
  return new Date(dateOnly + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DayEvaluation({ trends }: DayEvaluationProps) {
  // Filter to only complete days (have both pre and post market data)
  const completeDays = useMemo(
    () =>
      trends.filter(
        (d) =>
          Object.keys(d.postMarket).length > 0 &&
          Object.keys(d.preMarket).length > 0
      ),
    [trends]
  );

  const [selectedIndex, setSelectedIndex] = useState(completeDays.length - 1);

  if (completeDays.length === 0) {
    return null;
  }

  const currentDay = completeDays[selectedIndex];
  if (!currentDay) return null;

  const { strengths, issues } = evaluateDay(currentDay);
  const hasContent = strengths.length > 0 || issues.length > 0;

  if (!hasContent && completeDays.length === 1) return null;

  const canGoBack = selectedIndex > 0;
  const canGoForward = selectedIndex < completeDays.length - 1;
  const isLatest = selectedIndex === completeDays.length - 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Day Review
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedIndex((i) => i - 1)}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-[160px] justify-center">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-xs">{formatDate(currentDay.date)}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedIndex((i) => i + 1)}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            {!isLatest && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedIndex(completeDays.length - 1)}
              >
                Latest
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {isLatest ? "Your most recent complete check-in" : "Historical check-in review"} ({completeDays.length} complete day{completeDays.length !== 1 ? "s" : ""} total)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasContent ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No specific strengths or issues detected for this day.
          </p>
        ) : (
          <>
            {strengths.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  What went well
                </div>
                {strengths.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded bg-green-500/10"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
            )}
            {issues.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Areas to address
                </div>
                {issues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm">{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
