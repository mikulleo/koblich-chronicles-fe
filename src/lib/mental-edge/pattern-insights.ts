/**
 * Derives non-obvious findings from AI pattern tags.
 *
 * Frequency counts alone tell the trader what they already ticked in their own
 * check-in ("you overtraded on 5 days"). The findings here only exist by
 * *crossing* three independent sources that no single screen shows together:
 *
 *   1. what the AI observed   (evaluation patternTags)
 *   2. what the trader admitted (check-in traps + behavior checkboxes)
 *   3. what the day was worth  (evaluation overallScore)
 *
 * That produces things a person genuinely cannot see by eye: the gap between
 * self-perception and evidence, which habit actually costs the most points,
 * which two habits are really one, and what tomorrow inherits from today.
 *
 * Every finding carries its support count so a 3-day coincidence is never
 * presented as a law.
 */

import { getPattern, matchLegacyPattern, type PatternCategory } from "./pattern-taxonomy";
import type { CheckInTrendDay, MindsetEvaluation } from "@/lib/types";

/** Below this many evaluated days, nothing here is worth trusting. */
export const MIN_DAYS_FOR_INSIGHTS = 6;
/** A finding needs at least this many supporting days to be shown at all. */
const MIN_SUPPORT = 3;

export interface PatternDay {
  date: string;
  codes: string[];
  score: number | null;
  /** Self-reported traps + behaviors from the check-in for the same day. */
  selfReported: Set<string>;
  hasCheckIn: boolean;
}

export interface PatternSummary {
  code: string;
  label: string;
  category: PatternCategory;
  days: number;
  evidence: { date: string; text: string }[];
}

export type InsightKind = "blind_spot" | "over_judged" | "cost" | "pair" | "carryover" | "momentum";

export interface PatternInsight {
  kind: InsightKind;
  /** Short, specific claim — the thing the trader didn't know. */
  headline: string;
  /** The numbers behind the claim. */
  detail: string;
  /** What to do with it. */
  soWhat: string;
  supportDays: number;
  confidence: "tentative" | "moderate" | "strong";
  /** Internal ranking score; not rendered. */
  strength: number;
}

/**
 * Maps a taxonomy code to the check-in fields the trader would have ticked for
 * the same thing. Only codes with a genuine self-report equivalent are listed —
 * the rest cannot be compared and are skipped by the perception-gap findings.
 */
const SELF_REPORT_EQUIVALENTS: Record<string, { traps?: string[]; behaviors?: string[] }> = {
  overtrading: { traps: ["overtrading"] },
  fomo_entries: { traps: ["fomo_entries"], behaviors: ["feltFomo"] },
  revenge_trading: { traps: ["revenge_trading"], behaviors: ["reactiveAfterLoss"] },
  moving_stops: { traps: ["moving_stops"] },
  oversizing: { traps: ["oversizing"] },
  not_taking_setups: { traps: ["not_taking_setups"] },
  chasing: { traps: ["chasing"] },
  impatience: { traps: ["impatience"] },
  forced_trades: { behaviors: ["forcedTrades"] },
  overconfidence_after_wins: { behaviors: ["carelessAfterWin"] },
};

function dateKey(iso: string): string {
  return iso.split("T")[0] ?? iso;
}

function formatDay(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function confidenceFor(support: number): PatternInsight["confidence"] {
  if (support >= 6) return "strong";
  if (support >= 4) return "moderate";
  return "tentative";
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * One record per evaluated day, newest first. A day can hold up to 3
 * evaluations (regenerations); only the newest reflects the current read of it.
 */
export function buildPatternDays(
  evaluations: MindsetEvaluation[],
  trends: CheckInTrendDay[] = [],
): { days: PatternDay[]; summaries: PatternSummary[]; unmatched: string[] } {
  const newestPerDay = new Map<string, MindsetEvaluation>();
  for (const ev of evaluations) {
    const key = dateKey(ev.date);
    const existing = newestPerDay.get(key);
    if (!existing || new Date(ev.createdAt) > new Date(existing.createdAt)) {
      newestPerDay.set(key, ev);
    }
  }

  const trendByDate = new Map(trends.map((t) => [dateKey(t.date), t]));

  const days: PatternDay[] = [];
  const buckets = new Map<string, { days: Set<string>; evidence: { date: string; text: string }[] }>();
  const unmatched: string[] = [];

  const sortedKeys = [...newestPerDay.keys()].sort((a, b) => b.localeCompare(a));

  for (const key of sortedKeys) {
    const ev = newestPerDay.get(key)!;
    const seenToday = new Set<string>();

    const record = (code: string, text: string) => {
      if (seenToday.has(code)) return;
      seenToday.add(code);
      const bucket = buckets.get(code) ?? { days: new Set<string>(), evidence: [] };
      bucket.days.add(key);
      if (text) bucket.evidence.push({ date: key, text });
      buckets.set(code, bucket);
    };

    const tags = ev.aiAnalysis?.patternTags;
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        if (!getPattern(tag.code)) continue;
        record(tag.code, tag.evidence?.trim() || "");
      }
    } else {
      // Legacy evaluation: derive codes from free text so old days still count.
      for (const text of ev.aiAnalysis?.patternsIdentified || []) {
        const code = matchLegacyPattern(text);
        if (code) record(code, text);
        else unmatched.push(text);
      }
    }

    const trend = trendByDate.get(key);
    const selfReported = new Set<string>();
    if (trend) {
      for (const trap of trend.traps || []) selfReported.add(`trap:${trap}`);
      for (const [name, value] of Object.entries(trend.behaviors || {})) {
        if (value === true) selfReported.add(`behavior:${name}`);
      }
    }

    days.push({
      date: key,
      codes: [...seenToday],
      score: ev.aiAnalysis?.overallScore ?? null,
      selfReported,
      hasCheckIn: Boolean(trend),
    });
  }

  const summaries: PatternSummary[] = [];
  for (const [code, bucket] of buckets) {
    const definition = getPattern(code);
    if (!definition) continue;
    summaries.push({
      code,
      label: definition.label,
      category: definition.category,
      days: bucket.days.size,
      evidence: bucket.evidence.sort((a, b) => b.date.localeCompare(a.date)),
    });
  }
  summaries.sort((a, b) => b.days - a.days || a.label.localeCompare(b.label));

  return { days, summaries, unmatched };
}

/** True when the trader themselves flagged the equivalent of `code` that day. */
function selfReportedSameThing(day: PatternDay, code: string): boolean {
  const equivalents = SELF_REPORT_EQUIVALENTS[code];
  if (!equivalents) return false;
  return (
    (equivalents.traps || []).some((t) => day.selfReported.has(`trap:${t}`)) ||
    (equivalents.behaviors || []).some((b) => day.selfReported.has(`behavior:${b}`))
  );
}

export function deriveInsights(days: PatternDay[], summaries: PatternSummary[]): PatternInsight[] {
  if (days.length < MIN_DAYS_FOR_INSIGHTS) return [];

  const insights: PatternInsight[] = [];
  const totalDays = days.length;
  const byCode = new Map(summaries.map((s) => [s.code, s]));
  const daysWithCheckIn = days.filter((d) => d.hasCheckIn);

  // ===== 1. Perception gaps — comparable codes only, and only on days where a
  // check-in actually exists (no check-in is not the same as "didn't admit it").
  for (const code of Object.keys(SELF_REPORT_EQUIVALENTS)) {
    const label = getPattern(code)?.label ?? code;

    const aiDays = daysWithCheckIn.filter((d) => d.codes.includes(code));
    const selfDays = daysWithCheckIn.filter((d) => selfReportedSameThing(d, code));

    // Blind spot: the coach keeps seeing it, the trader rarely writes it down.
    const unacknowledged = aiDays.filter((d) => !selfReportedSameThing(d, code));
    if (aiDays.length >= MIN_SUPPORT && unacknowledged.length >= MIN_SUPPORT) {
      const ratio = unacknowledged.length / aiDays.length;
      if (ratio >= 0.7) {
        insights.push({
          kind: "blind_spot",
          headline: `${label} is your blind spot`,
          detail: `The AI read ${label.toLowerCase()} in your data on ${aiDays.length} ${aiDays.length === 1 ? "day" : "days"}, but you only flagged it yourself on ${aiDays.length - unacknowledged.length}. Most recently ${formatDay(unacknowledged[0]!.date)}.`,
          soWhat: `It isn't on your radar while it's happening — which is exactly why it keeps happening. Add it to your pre-market "biggest risk" and check it explicitly in your review.`,
          supportDays: unacknowledged.length,
          confidence: confidenceFor(unacknowledged.length),
          strength: 1.0 * ratio * Math.min(1, unacknowledged.length / 5),
        });
      }
    }

    // The inverse: the trader indicts themselves for something the evidence
    // doesn't support. Worth knowing — it's a confidence tax, not a habit.
    const unsupported = selfDays.filter((d) => !d.codes.includes(code));
    if (selfDays.length >= MIN_SUPPORT && unsupported.length >= MIN_SUPPORT) {
      const ratio = unsupported.length / selfDays.length;
      if (ratio >= 0.75) {
        insights.push({
          kind: "over_judged",
          headline: `You're harder on yourself about ${label.toLowerCase()} than the data is`,
          detail: `You flagged ${label.toLowerCase()} on ${selfDays.length} days, but on ${unsupported.length} of them nothing in the day's evidence supported it.`,
          soWhat: `Check whether you're labelling a normal, planned trade as a mistake. Mislabelled "errors" quietly push you toward under-trading good setups.`,
          supportDays: unsupported.length,
          confidence: confidenceFor(unsupported.length),
          strength: 0.85 * ratio * Math.min(1, unsupported.length / 5),
        });
      }
    }
  }

  // ===== 2. What each pattern actually costs, in score points.
  const scored = days.filter((d) => typeof d.score === "number");
  const costFindings: { insight: PatternInsight; gap: number }[] = [];
  if (scored.length >= MIN_DAYS_FOR_INSIGHTS) {
    for (const summary of summaries) {
      if (summary.category === "strength") continue;
      const withPattern = scored.filter((d) => d.codes.includes(summary.code));
      const withoutPattern = scored.filter((d) => !d.codes.includes(summary.code));
      if (withPattern.length < MIN_SUPPORT || withoutPattern.length < MIN_SUPPORT) continue;

      const avg = (list: PatternDay[]) =>
        list.reduce((sum, d) => sum + (d.score ?? 0), 0) / list.length;
      const withAvg = avg(withPattern);
      const withoutAvg = avg(withoutPattern);
      const gap = withoutAvg - withAvg;
      if (gap < 1.0) continue;

      costFindings.push({
        gap,
        insight: {
          kind: "cost",
          headline: `${summary.label} costs you ${gap.toFixed(1)} points a day`,
          detail: `Days with it score ${withAvg.toFixed(1)} on average; days without score ${withoutAvg.toFixed(1)}. Measured over ${withPattern.length} affected and ${withoutPattern.length} clean days.`,
          soWhat: "",
          supportDays: withPattern.length,
          confidence: confidenceFor(Math.min(withPattern.length, withoutPattern.length)),
          strength: 1.1 * Math.min(1, gap / 3) * Math.min(1, withPattern.length / 5),
        },
      });
    }
  }

  // Only the costliest habit gets to claim the superlative.
  costFindings.sort((a, b) => b.gap - a.gap);
  costFindings.forEach(({ insight }, index) => {
    insight.soWhat =
      index === 0
        ? `Of everything you're working on, this has the largest measured drag on your day. Fix it before the smaller stuff.`
        : `A smaller but real cost. Worth taking on once the bigger drag above is under control.`;
    insights.push(insight);
  });

  // ===== 3. Two habits that are really one.
  for (let i = 0; i < summaries.length; i++) {
    for (let j = i + 1; j < summaries.length; j++) {
      const a = summaries[i]!;
      const b = summaries[j]!;
      if (a.category === "strength" || b.category === "strength") continue;

      const together = days.filter((d) => d.codes.includes(a.code) && d.codes.includes(b.code));
      if (together.length < MIN_SUPPORT) continue;

      const rarer = a.days <= b.days ? a : b;
      const commoner = rarer === a ? b : a;
      const rate = together.length / rarer.days;
      if (rate < 0.75) continue;

      insights.push({
        kind: "pair",
        headline: `${rarer.label} almost never shows up alone`,
        detail: `${together.length} of its ${rarer.days} days also carry ${commoner.label.toLowerCase()} — ${Math.round(rate * 100)}% overlap.`,
        soWhat: `Treat these as one problem with one trigger, not two separate fixes. Whichever comes first in the day is the one to interrupt.`,
        supportDays: together.length,
        confidence: confidenceFor(together.length),
        strength: 0.95 * rate * Math.min(1, together.length / 4),
      });
    }
  }

  // ===== 4. What tomorrow inherits from today.
  const ascending = [...days].sort((a, b) => a.date.localeCompare(b.date));
  for (const source of summaries) {
    for (const target of summaries) {
      // A pattern predicting its own repeat is a real and useful finding, so
      // same-code pairs are deliberately allowed here.
      const transitions = ascending
        .map((day, index) => ({ day, next: ascending[index + 1] }))
        .filter(
          ({ day, next }) =>
            next !== undefined &&
            daysBetween(day.date, next.date) <= 4 &&
            day.codes.includes(source.code),
        );
      if (transitions.length < MIN_SUPPORT) continue;

      const followed = transitions.filter(({ next }) => next!.codes.includes(target.code));
      if (followed.length < MIN_SUPPORT) continue;

      const rate = followed.length / transitions.length;
      const baseRate = (byCode.get(target.code)?.days ?? 0) / totalDays;
      if (rate < 0.6 || baseRate === 0 || rate / baseRate < 1.6) continue;

      const sameCode = source.code === target.code;
      insights.push({
        kind: "carryover",
        headline: sameCode
          ? `${source.label} doesn't end with the session`
          : `${source.label} today sets up ${target.label.toLowerCase()} tomorrow`,
        detail: `After a day with ${source.label.toLowerCase()}, the next session showed ${target.label.toLowerCase()} ${followed.length} of ${transitions.length} times (${Math.round(rate * 100)}%), against a ${Math.round(baseRate * 100)}% baseline.`,
        soWhat: sameCode
          ? `Once it starts it runs in streaks. Breaking the second day matters more than the first — treat a bad day as a reason to size down tomorrow.`
          : `The damage lands the day after. Add a reset routine the evening it happens, not the morning after.`,
        supportDays: followed.length,
        confidence: confidenceFor(followed.length),
        strength: 0.9 * Math.min(1, rate / baseRate / 3) * Math.min(1, followed.length / 4),
      });
    }
  }

  // ===== 5. What's fading and what's creeping in.
  if (totalDays >= 8) {
    const half = Math.floor(totalDays / 2);
    const recent = ascending.slice(-half);
    const earlier = ascending.slice(0, half);

    for (const summary of summaries) {
      const recentCount = recent.filter((d) => d.codes.includes(summary.code)).length;
      const earlierCount = earlier.filter((d) => d.codes.includes(summary.code)).length;
      const delta = earlierCount - recentCount;

      if (delta >= 3 && recentCount <= 1) {
        insights.push({
          kind: "momentum",
          headline: `You've beaten ${summary.label.toLowerCase()}`,
          detail: `${earlierCount} occurrences in your earlier ${earlier.length} days, ${recentCount} in the last ${recent.length}.`,
          soWhat: `Whatever you changed, it worked. Write down what you're doing differently before you forget it — that's the repeatable part.`,
          supportDays: earlierCount,
          confidence: confidenceFor(earlierCount),
          strength: 0.8 * Math.min(1, delta / 4),
        });
      } else if (-delta >= 3 && earlierCount <= 1 && summary.category !== "strength") {
        insights.push({
          kind: "momentum",
          headline: `${summary.label} is new and growing`,
          detail: `Absent from your earlier ${earlier.length} days (${earlierCount}), it appeared ${recentCount} times in the last ${recent.length}.`,
          soWhat: `This isn't an old habit — something changed recently. Look at what's different about the last couple of weeks.`,
          supportDays: recentCount,
          confidence: confidenceFor(recentCount),
          strength: 0.85 * Math.min(1, -delta / 4),
        });
      }
    }
  }

  // Rank by strength, but cap each kind so one noisy dimension can't fill the card.
  const perKind = new Map<InsightKind, number>();
  return insights
    .sort((a, b) => b.strength - a.strength)
    .filter((insight) => {
      const used = perKind.get(insight.kind) ?? 0;
      if (used >= 2) return false;
      perKind.set(insight.kind, used + 1);
      return true;
    })
    .slice(0, 5);
}
