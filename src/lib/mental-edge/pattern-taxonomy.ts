/**
 * Frontend mirror of the backend pattern taxonomy
 * (koblich_chronicles_be/src/utilities/mindsetPatterns.ts). Keep both in sync.
 *
 * Evaluations created before pattern tagging existed only have free-text
 * `patternsIdentified`, which never repeats verbatim. `matchLegacyPattern` maps
 * that text onto the same codes with keyword rules so historical days still
 * count toward the recurring-pattern ranking instead of being thrown away.
 */

export type PatternCategory = "execution" | "emotional" | "process" | "context" | "strength";

export interface PatternDefinition {
  code: string;
  label: string;
  category: PatternCategory;
}

export const PATTERN_TAXONOMY: PatternDefinition[] = [
  // Execution
  { code: "overtrading", label: "Overtrading", category: "execution" },
  { code: "fomo_entries", label: "FOMO entries", category: "execution" },
  { code: "revenge_trading", label: "Revenge trading", category: "execution" },
  { code: "chasing", label: "Chasing extended moves", category: "execution" },
  { code: "moving_stops", label: "Moving stops", category: "execution" },
  { code: "oversizing", label: "Oversizing", category: "execution" },
  { code: "undersizing", label: "Undersizing A+ setups", category: "execution" },
  { code: "not_taking_setups", label: "Missing valid setups", category: "execution" },
  { code: "cutting_winners_early", label: "Cutting winners early", category: "execution" },
  { code: "holding_losers", label: "Holding losers too long", category: "execution" },
  { code: "forced_trades", label: "Forcing trades", category: "execution" },
  // Emotional
  { code: "impatience", label: "Impatience", category: "emotional" },
  { code: "urgency_to_make_money", label: "Urgency to make money", category: "emotional" },
  { code: "frustration_spiral", label: "Frustration spiral", category: "emotional" },
  { code: "fear_hesitation", label: "Fear / hesitation", category: "emotional" },
  { code: "overconfidence_after_wins", label: "Overconfidence after wins", category: "emotional" },
  { code: "pnl_fixation", label: "P&L fixation", category: "emotional" },
  { code: "emotional_carryover", label: "Emotional carryover", category: "emotional" },
  // Process
  { code: "skipped_prep", label: "Skipped pre-market prep", category: "process" },
  { code: "plan_not_followed", label: "Plan written but not followed", category: "process" },
  { code: "weak_review", label: "Shallow post-market review", category: "process" },
  { code: "repeat_rule_violation", label: "Repeating a known rule violation", category: "process" },
  { code: "too_many_intentions", label: "Too many intentions at once", category: "process" },
  // Context
  { code: "poor_sleep_impact", label: "Poor sleep affecting decisions", category: "context" },
  { code: "external_stress", label: "External stress bleeding in", category: "context" },
  { code: "blind_spot_risk", label: "Blind spot on the real risk", category: "context" },
  // Strengths
  { code: "disciplined_no_trade", label: "Disciplined no-trade day", category: "strength" },
  { code: "strong_risk_management", label: "Strong risk management", category: "strength" },
  { code: "high_intention_adherence", label: "Stuck to stated intentions", category: "strength" },
  { code: "fast_emotional_reset", label: "Fast emotional reset", category: "strength" },
  { code: "honest_self_reflection", label: "Honest self-reflection", category: "strength" },
];

const BY_CODE = new Map(PATTERN_TAXONOMY.map((p) => [p.code, p]));

export function getPattern(code: string): PatternDefinition | undefined {
  return BY_CODE.get(code);
}

export const CATEGORY_LABELS: Record<PatternCategory, string> = {
  execution: "Execution",
  emotional: "Emotional",
  process: "Process",
  context: "Context",
  strength: "Strength",
};

/** Tailwind classes per category — strengths read green, everything else neutral-to-warm. */
export const CATEGORY_STYLES: Record<PatternCategory, { bar: string; badge: string }> = {
  execution: {
    bar: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 [[data-theme=dark]_&]:text-amber-400",
  },
  emotional: {
    bar: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-700 [[data-theme=dark]_&]:text-rose-400",
  },
  process: {
    bar: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-700 [[data-theme=dark]_&]:text-blue-400",
  },
  context: {
    bar: "bg-violet-500",
    badge: "bg-violet-500/10 text-violet-700 [[data-theme=dark]_&]:text-violet-400",
  },
  strength: {
    bar: "bg-green-500",
    badge: "bg-green-500/10 text-green-700 [[data-theme=dark]_&]:text-green-400",
  },
};

/**
 * Keyword rules for mapping legacy free-text patterns onto codes. Order matters:
 * the first rule whose keywords all appear wins, so more specific rules come first.
 */
const LEGACY_RULES: { code: string; any: string[]; not?: string[] }[] = [
  { code: "revenge_trading", any: ["revenge"] },
  { code: "fomo_entries", any: ["fomo", "fear of missing"] },
  { code: "chasing", any: ["chasing", "chased", "extended entry"] },
  { code: "moving_stops", any: ["moving stop", "moved stop", "widening stop", "removed stop"] },
  { code: "oversizing", any: ["oversiz", "too much size", "size too large", "overleverag"] },
  { code: "undersizing", any: ["undersiz", "too little size", "small size on"] },
  {
    code: "cutting_winners_early",
    any: ["cutting winner", "cut winner", "exiting early", "exited early", "taking profit too"],
  },
  {
    code: "holding_losers",
    any: ["holding loser", "held loser", "hold losing", "hoping", "no stop out"],
  },
  { code: "not_taking_setups", any: ["missed setup", "not taking setup", "passed on", "missing valid"] },
  { code: "forced_trades", any: ["forc"] },
  { code: "overtrading", any: ["overtrad", "too many trades", "trade count"] },
  { code: "repeat_rule_violation", any: ["rule violation", "broke the rule", "broke rules", "violated rule"] },
  { code: "plan_not_followed", any: ["deviat", "not follow the plan", "abandoned the plan", "off plan", "ignored the plan"] },
  { code: "skipped_prep", any: ["pre-market prep", "premarket prep", "no plan", "without a plan", "skipped prep"] },
  { code: "weak_review", any: ["shallow review", "skipped review", "post-market review", "no review"] },
  { code: "too_many_intentions", any: ["too many intention", "many intentions"] },
  { code: "frustration_spiral", any: ["frustrat", "tilt", "spiral"] },
  { code: "urgency_to_make_money", any: ["urgency", "need to make", "pressure to make money"] },
  { code: "impatience", any: ["impatien", "patience"], not: ["patient and"] },
  { code: "fear_hesitation", any: ["hesitat", "fear of los", "froze", "paralys"] },
  { code: "overconfidence_after_wins", any: ["overconfiden", "complacen", "careless after"] },
  { code: "pnl_fixation", any: ["p&l", "pnl", "watching the number", "dollar amount"] },
  { code: "emotional_carryover", any: ["carryover", "carry over", "previous day", "yesterday"] },
  { code: "poor_sleep_impact", any: ["sleep", "fatigue", "tired", "exhaust"] },
  { code: "external_stress", any: ["personal stress", "external stress", "outside stress", "life stress"] },
  { code: "blind_spot_risk", any: ["blind spot", "unexpected risk", "different risk"] },
  { code: "disciplined_no_trade", any: ["no-trade", "no trade day", "sat out", "stayed flat", "sitting out"] },
  { code: "strong_risk_management", any: ["risk management", "stops honored", "kept losses small", "small losses"] },
  { code: "high_intention_adherence", any: ["intention adherence", "stuck to", "followed the plan", "adherence was"] },
  { code: "fast_emotional_reset", any: ["reset", "bounced back", "recovered quickly"] },
  { code: "honest_self_reflection", any: ["self-aware", "self aware", "honest reflection", "journaling"] },
];

/** Maps a free-text pattern string onto a taxonomy code, or null when nothing fits. */
export function matchLegacyPattern(text: string): string | null {
  const haystack = text.toLowerCase();
  for (const rule of LEGACY_RULES) {
    if (rule.not?.some((phrase) => haystack.includes(phrase))) continue;
    if (rule.any.some((keyword) => haystack.includes(keyword))) return rule.code;
  }
  return null;
}
