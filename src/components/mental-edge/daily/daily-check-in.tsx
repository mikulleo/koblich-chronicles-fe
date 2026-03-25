"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreMarketForm } from "./pre-market-form";
import { PostMarketForm } from "./post-market-form";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, TrendingUp, TrendingDown, Minus, AlertTriangle, Target, ChevronLeft, ChevronRight, Lightbulb, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import type { MentalCheckIn } from "@/lib/types";
import { AICoachingCard } from "./ai-coaching-card";
import { LettingGoDialog } from "./letting-go-dialog";

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + "T12:00:00").getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

function addTradingDays(dateStr: string, direction: number): string {
  const date = new Date(dateStr + "T12:00:00");
  do {
    date.setDate(date.getDate() + direction);
  } while (date.getDay() === 0 || date.getDay() === 6);
  return getDateString(date);
}

function snapToWeekday(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const day = date.getDay();
  if (day === 0) date.setDate(date.getDate() - 2); // Sunday → Friday
  if (day === 6) date.setDate(date.getDate() - 1); // Saturday → Friday
  return getDateString(date);
}

export function DailyCheckIn() {
  const [checkIn, setCheckIn] = useState<MentalCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showLettingGo, setShowLettingGo] = useState(false);

  const today = snapToWeekday(getDateString(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  const fetchCheckIn = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/mental-check-ins", {
        params: {
          where: {
            date: { equals: selectedDate },
          },
          limit: 1,
        },
      });
      const docs = response.data.docs;
      setCheckIn(docs.length > 0 ? docs[0] : null);
    } catch {
      toast.error("Failed to load check-in");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchCheckIn();
  }, [fetchCheckIn]);

  const handlePreMarketSubmit = async (preMarketData: {
    completedAt: string;
    ratings: Record<string, number>;
    contextFlags: string[];
    intentions: string[];
    biggestRisk: string | null;
  }) => {
    setSubmitting(true);
    try {
      if (checkIn) {
        await apiClient.patch(`/mental-check-ins/${checkIn.id}`, {
          preMarket: preMarketData,
        });
      } else {
        await apiClient.post("/mental-check-ins", {
          date: selectedDate,
          preMarket: preMarketData,
        });
      }
      toast.success("Pre-market check-in saved");
      await fetchCheckIn();
    } catch {
      toast.error("Failed to save pre-market check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostMarketSubmit = async (postMarketData: {
    completedAt: string;
    ratings: Record<string, number>;
    behaviors: Record<string, boolean>;
    reflections: Record<string, string>;
    actualTraps: string[];
  }) => {
    if (!checkIn) return;
    const isFirstCompletion = !checkIn.postMarket?.completedAt;
    setSubmitting(true);
    try {
      await apiClient.patch(`/mental-check-ins/${checkIn.id}`, {
        postMarket: postMarketData,
      });
      toast.success("Post-market review saved");
      await fetchCheckIn();
      if (isFirstCompletion) {
        setShowLettingGo(true);
      }
    } catch {
      toast.error("Failed to save post-market review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const preMarketCompleted = !!checkIn?.preMarket?.completedAt;
  const postMarketCompleted = !!checkIn?.postMarket?.completedAt;
  const analysis = checkIn?.analysis;

  return (
    <div className="space-y-6">
      <LettingGoDialog open={showLettingGo} onClose={() => setShowLettingGo(false)} />

      {/* Quick usage hints */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">How to use the Daily Check-In</span>
          <ChevronDown className="h-3.5 w-3.5 ml-auto transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 p-3 rounded-lg border bg-muted/30 text-sm text-muted-foreground space-y-2">
            <p>
              <strong>You don&apos;t have to fill everything out every day.</strong> The check-in is designed to be flexible — use what feels useful and skip the rest.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li><strong>Pre-market:</strong> Do this before you trade. Rate your mental state, note your context, and set intentions. Even just the ratings alone (30 seconds) give you valuable data over time.</li>
              <li><strong>Post-market:</strong> Reflect after the session. Rate how well you stuck to your plan and note any traps. The reflections (text fields) are optional but great for journaling.</li>
              <li><strong>Context flags &amp; intentions:</strong> Pick only what applies — no need to select any if nothing stands out.</li>
              <li><strong>Biggest Risk:</strong> Pick the one emotional trap you&apos;re most likely to fall into today. This trains your self-awareness over time.</li>
              <li><strong>Consistency matters more than completeness.</strong> A quick daily check-in beats a thorough one you only do once a week.</li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Date navigation & status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(addTradingDays(selectedDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(addTradingDays(selectedDate, 1))}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(today)}
            >
              Today
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Badge variant={preMarketCompleted ? "default" : "outline"}>
            Pre-Market {preMarketCompleted ? "Done" : "Pending"}
          </Badge>
          <Badge variant={postMarketCompleted ? "default" : "outline"}>
            Post-Market {postMarketCompleted ? "Done" : "Pending"}
          </Badge>
        </div>
      </div>

      {/* Analysis summary (if available) */}
      {analysis && (analysis.intentionAdherence !== undefined || analysis.stateConsistency !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isToday ? "Today's" : "Day's"} Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {analysis.stateConsistency !== undefined && analysis.stateConsistency !== null && (() => {
                const drift = analysis.stateConsistency!;
                const absDrift = Math.abs(drift);
                const improved = drift > 0.25;
                const declined = drift < -0.25;
                const DriftIcon = improved ? TrendingUp : declined ? TrendingDown : Minus;
                const driftColor = improved ? "text-green-500" : declined ? "text-red-500" : "text-muted-foreground";
                const driftLabel = improved ? "Improved" : declined ? "Declined" : "Consistent";
                const driftDesc = improved
                  ? "Post-market execution exceeded your pre-market state — you performed better than you started."
                  : declined
                    ? "Post-market execution fell below your pre-market state — something pulled you off track."
                    : "Your execution matched your pre-market mental state — you stayed consistent.";
                return (
                  <div className="text-center">
                    <DriftIcon className={`h-5 w-5 mx-auto mb-1 ${driftColor}`} />
                    <div className={`text-2xl font-bold ${driftColor}`}>{absDrift}</div>
                    <div className="text-xs font-medium text-muted-foreground">{driftLabel}</div>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {driftDesc}
                    </p>
                  </div>
                );
              })()}
              {analysis.intentionAdherence !== undefined && analysis.intentionAdherence !== null && (
                <div className="text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-2xl font-bold">{analysis.intentionAdherence}%</div>
                  <div className="text-xs font-medium text-muted-foreground">Intention Adherence</div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    How many of your pre-market intentions you actually followed through on. Higher is better.
                  </p>
                </div>
              )}
              {analysis.riskPredictionAccuracy !== undefined && (
                <div className="text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-2xl font-bold">
                    {analysis.riskPredictionAccuracy ? "Yes" : "No"}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">Risk Predicted</div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Did the &quot;Biggest Risk&quot; you identified pre-market actually show up in your traps? Tracks your self-awareness.
                  </p>
                </div>
              )}
              {analysis.emotionalDrift && analysis.emotionalDrift.length > 0 && (
                <div className="text-center">
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {analysis.emotionalDrift.map((drift) => (
                      <Badge key={drift} variant="destructive" className="text-xs">
                        {drift}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">Drift Patterns</div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Specific emotional patterns detected — e.g. revenge trading after a loss or FOMO-driven entries.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Coaching Card (after post-market completion) */}
      {postMarketCompleted && <AICoachingCard date={selectedDate} />}

      <Separator />

      {/* Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PreMarketForm
          initialData={checkIn?.preMarket}
          onSubmit={handlePreMarketSubmit}
          isSubmitting={submitting}
          isCompleted={preMarketCompleted}
        />
        <PostMarketForm
          initialData={checkIn?.postMarket}
          onSubmit={handlePostMarketSubmit}
          isSubmitting={submitting}
          isCompleted={postMarketCompleted}
          preMarketCompleted={preMarketCompleted}
        />
      </div>
    </div>
  );
}
