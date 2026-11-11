"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2, MessageSquareQuote, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

interface CoachingPrepTopic {
  title: string;
  whyNow: string;
  questionForCoach: string;
}

interface CoachingPrepResponse {
  prep: {
    periodSummary: string;
    mainTopic: CoachingPrepTopic;
    supportingTopics: CoachingPrepTopic[];
    actionStepFollowThrough: string;
    progressToShare: string[];
  };
  period: { startDate: string | null; endDate: string };
  coverage: {
    checkIns: number;
    journals: number;
    evaluations: number;
    coachingSessions: number;
    firstDate: string | null;
    lastDate: string | null;
  };
  generatedAt: string;
}

interface CoachingPrepCardProps {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
}

const storageKey = (startDate?: string, endDate?: string) =>
  `coaching-prep:${startDate ?? "all"}:${endDate ?? "today"}`;

function readCache(key: string): CoachingPrepResponse | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CoachingPrepResponse) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: CoachingPrepResponse) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota — the brief still shows, it just won't survive a reload.
  }
}

function formatDay(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toPlainText(data: CoachingPrepResponse, periodLabel: string): string {
  const { prep } = data;
  const lines = [
    `Coaching prep — ${periodLabel} (${formatDay(data.coverage.firstDate)} – ${formatDay(data.coverage.lastDate)})`,
    "",
    prep.periodSummary,
    "",
    `BRING TO THE SESSION: ${prep.mainTopic.title}`,
    prep.mainTopic.whyNow,
    `Question: ${prep.mainTopic.questionForCoach}`,
  ];
  for (const t of prep.supportingTopics) {
    lines.push("", `If time allows: ${t.title}`, t.whyNow, `Question: ${t.questionForCoach}`);
  }
  if (prep.actionStepFollowThrough) lines.push("", `Action-step follow-through: ${prep.actionStepFollowThrough}`);
  if (prep.progressToShare.length > 0) {
    lines.push("", "Progress to share:", ...prep.progressToShare.map((p) => `- ${p}`));
  }
  return lines.join("\n");
}

/**
 * "Prepare for coaching" — one brief across the selected Insights period,
 * instead of a coaching suggestion tacked onto every daily evaluation.
 * Action Journal users only (the endpoint 403s for everyone else).
 */
export function CoachingPrepCard({ startDate, endDate, periodLabel }: CoachingPrepCardProps) {
  const key = storageKey(startDate, endDate);
  const [data, setData] = useState<CoachingPrepResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Show the last brief generated for this exact period, if any.
  useEffect(() => {
    setData(readCache(key));
    setError(null);
  }, [key]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<CoachingPrepResponse>("/mindset-evaluations/coaching-prep", {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
      setData(res.data);
      writeCache(key, res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; details?: string } } };
      setError(e.response?.data?.details || e.response?.data?.error || "Failed to prepare coaching brief.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(toPlainText(data, periodLabel));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquareQuote className="h-4 w-4" />
              Prepare for your next coaching session
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              One brief across {periodLabel.toLowerCase()}: the single thing most worth bringing, built
              from your check-ins, journal, discipline logs and coaching notes.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {data && (
              <Button variant="outline" size="sm" onClick={copy} className="text-xs">
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
            <Button size="sm" onClick={generate} disabled={loading} className="text-xs">
              {loading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : data ? (
                <RefreshCw className="h-3 w-3 mr-1" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1" />
              )}
              {loading ? "Preparing…" : data ? "Regenerate" : "Prepare brief"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {(error || data) && (
        <CardContent className="space-y-4 text-sm">
          {error && (
            <div className="p-3 rounded bg-red-500/10 text-red-600 [[data-theme=dark]_&]:text-red-400">{error}</div>
          )}

          {data && (
            <>
              <p className="text-muted-foreground">{data.prep.periodSummary}</p>

              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                <div className="text-[10px] font-medium uppercase tracking-wide text-primary">
                  Bring to the session
                </div>
                <div className="font-semibold">{data.prep.mainTopic.title}</div>
                <p className="text-muted-foreground">{data.prep.mainTopic.whyNow}</p>
                <p className="italic">&ldquo;{data.prep.mainTopic.questionForCoach}&rdquo;</p>
              </div>

              {data.prep.supportingTopics.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    If time allows
                  </div>
                  {data.prep.supportingTopics.map((t, i) => (
                    <div key={i} className="rounded border bg-muted/30 p-2.5 space-y-1">
                      <div className="font-medium">{t.title}</div>
                      <p className="text-muted-foreground text-xs">{t.whyNow}</p>
                      <p className="italic text-xs">&ldquo;{t.questionForCoach}&rdquo;</p>
                    </div>
                  ))}
                </div>
              )}

              {data.prep.actionStepFollowThrough && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Action-step follow-through
                  </div>
                  <p>{data.prep.actionStepFollowThrough}</p>
                </div>
              )}

              {data.prep.progressToShare.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Progress to share
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {data.prep.progressToShare.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/70">
                Based on {data.coverage.checkIns} check-ins, {data.coverage.journals} journal entries
                {data.coverage.coachingSessions > 0 ? ` (${data.coverage.coachingSessions} coaching notes)` : ""} and{" "}
                {data.coverage.evaluations} AI evaluations · {formatDay(data.coverage.firstDate)} –{" "}
                {formatDay(data.coverage.lastDate)} · generated{" "}
                {new Date(data.generatedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
