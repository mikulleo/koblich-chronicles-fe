"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  EyeOff,
  Lightbulb,
  Link2,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  type PatternCategory,
} from "@/lib/mental-edge/pattern-taxonomy";
import {
  buildPatternDays,
  deriveInsights,
  MIN_DAYS_FOR_INSIGHTS,
  type InsightKind,
  type PatternInsight,
  type PatternSummary,
} from "@/lib/mental-edge/pattern-insights";
import type { CheckInTrendDay, MindsetEvaluation } from "@/lib/types";

/** How often a pattern must appear before it counts as recurring. */
const RECURRING_MIN_DAYS = 2;

const INSIGHT_STYLES: Record<
  InsightKind,
  { icon: LucideIcon; tint: string; accent: string; kicker: string }
> = {
  blind_spot: {
    icon: EyeOff,
    tint: "bg-rose-500/5 border-rose-500/20",
    accent: "text-rose-600 [[data-theme=dark]_&]:text-rose-400",
    kicker: "Blind spot",
  },
  over_judged: {
    icon: Scale,
    tint: "bg-blue-500/5 border-blue-500/20",
    accent: "text-blue-600 [[data-theme=dark]_&]:text-blue-400",
    kicker: "Self-judgement",
  },
  cost: {
    icon: TrendingDown,
    tint: "bg-amber-500/5 border-amber-500/20",
    accent: "text-amber-600 [[data-theme=dark]_&]:text-amber-400",
    kicker: "Biggest drag",
  },
  pair: {
    icon: Link2,
    tint: "bg-violet-500/5 border-violet-500/20",
    accent: "text-violet-600 [[data-theme=dark]_&]:text-violet-400",
    kicker: "Linked habits",
  },
  carryover: {
    icon: Repeat,
    tint: "bg-orange-500/5 border-orange-500/20",
    accent: "text-orange-600 [[data-theme=dark]_&]:text-orange-400",
    kicker: "Next-day effect",
  },
  momentum: {
    icon: TrendingUp,
    tint: "bg-green-500/5 border-green-500/20",
    accent: "text-green-600 [[data-theme=dark]_&]:text-green-400",
    kicker: "Momentum",
  },
};

const CONFIDENCE_LABELS: Record<PatternInsight["confidence"], string> = {
  tentative: "early signal",
  moderate: "holding up",
  strong: "well established",
};

export function RecurringPatterns({
  evaluations,
  trends = [],
}: {
  evaluations: MindsetEvaluation[];
  trends?: CheckInTrendDay[];
}) {
  const { days, summaries, unmatched, insights } = useMemo(() => {
    const built = buildPatternDays(evaluations, trends);
    return { ...built, insights: deriveInsights(built.days, built.summaries) };
  }, [evaluations, trends]);

  const totalDays = days.length;
  if (totalDays === 0 || summaries.length === 0) return null;

  return (
    <div className="space-y-4">
      <InsightsCard insights={insights} totalDays={totalDays} />
      <FrequencyCard
        summaries={summaries}
        unmatched={unmatched}
        totalDays={totalDays}
        collapsed={insights.length > 0}
      />
    </div>
  );
}

function InsightsCard({
  insights,
  totalDays,
}: {
  insights: PatternInsight[];
  totalDays: number;
}) {
  const short = totalDays < MIN_DAYS_FOR_INSIGHTS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          What you might not know about yourself
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Found by cross-referencing what the AI observed, what you reported about yourself, and how
          each day scored — none of it visible from a single day.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {short ? (
          <p className="text-sm text-muted-foreground">
            Unlocks at {MIN_DAYS_FOR_INSIGHTS} evaluated days — you have {totalDays}. Below that,
            anything found here would be coincidence dressed up as a pattern.
          </p>
        ) : insights.length === 0 ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Nothing stands out across your {totalDays} evaluated days — your patterns aren&apos;t
              clustering, repeating across days, or hitting your scores hard enough to call out. That
              is a good sign, not a missing feature.
            </span>
          </div>
        ) : (
          insights.map((insight, i) => <InsightCard key={i} insight={insight} />)
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }: { insight: PatternInsight }) {
  const style = INSIGHT_STYLES[insight.kind];
  const Icon = style.icon;

  return (
    <div className={`rounded-lg border p-3 ${style.tint}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.accent}`} />
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-medium uppercase tracking-wide ${style.accent}`}
            >
              {style.kicker}
            </span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {insight.supportDays} days · {CONFIDENCE_LABELS[insight.confidence]}
            </Badge>
          </div>
          <p className="text-sm font-medium leading-snug">{insight.headline}</p>
          <p className="text-xs text-muted-foreground">{insight.detail}</p>
          <p className="text-xs">
            <span className="font-medium">So what: </span>
            <span className="text-muted-foreground">{insight.soWhat}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FrequencyCard({
  summaries,
  unmatched,
  totalDays,
  collapsed,
}: {
  summaries: PatternSummary[];
  unmatched: string[];
  totalDays: number;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);

  const recurring = summaries.filter((s) => s.days >= RECURRING_MIN_DAYS);
  const oneOff = summaries.filter((s) => s.days < RECURRING_MIN_DAYS);
  const maxDays = recurring[0]?.days ?? 1;

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Pattern frequency
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                The raw counts behind the findings above — {totalDays} evaluated{" "}
                {totalDays === 1 ? "day" : "days"}.
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {recurring.length > 0 ? (
              <div className="space-y-2">
                {recurring.map((row) => (
                  <PatternBar key={row.code} row={row} totalDays={totalDays} maxDays={maxDays} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing has repeated across {totalDays} evaluated{" "}
                {totalDays === 1 ? "day" : "days"} yet.
              </p>
            )}

            {oneOff.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronDown className="h-3 w-3" />
                  Seen once ({oneOff.length})
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {oneOff.map((row) => (
                      <Badge
                        key={row.code}
                        variant="outline"
                        className={`text-xs font-normal ${CATEGORY_STYLES[row.category].badge}`}
                      >
                        {row.label}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {unmatched.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronDown className="h-3 w-3" />
                  Older one-off observations ({unmatched.length})
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-1 pl-4 list-disc text-xs text-muted-foreground">
                    {unmatched.map((text, i) => (
                      <li key={i}>{text}</li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function PatternBar({
  row,
  totalDays,
  maxDays,
}: {
  row: PatternSummary;
  totalDays: number;
  maxDays: number;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((row.days / totalDays) * 100);
  const style = CATEGORY_STYLES[row.category as PatternCategory];

  const formatDay = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left rounded p-2 hover:bg-muted/50">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{row.label}</span>
            <Badge variant="outline" className={`text-[10px] font-normal shrink-0 ${style.badge}`}>
              {CATEGORY_LABELS[row.category]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums">
              {row.days}/{totalDays} days · {pct}%
            </span>
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        {/* Bars are scaled to the most frequent pattern so the ranking stays readable
            even when every pattern sits at a low percentage of days. */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${style.bar}`}
            style={{ width: `${Math.max(4, (row.days / maxDays) * 100)}%` }}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 mb-2 ml-2 space-y-1 border-l-2 border-border pl-3 text-xs text-muted-foreground">
          {row.evidence.length > 0 ? (
            row.evidence.map((item, i) => (
              <li key={i}>
                <span className="text-foreground/70 font-medium">{formatDay(item.date)}:</span>{" "}
                {item.text}
              </li>
            ))
          ) : (
            <li>No evidence recorded for this pattern.</li>
          )}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
