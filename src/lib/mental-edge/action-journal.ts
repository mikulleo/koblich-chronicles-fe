import type { ActionJournalData, ActionJournalItem, ActionJournalPillar } from "@/lib/types";

/**
 * 3-3-1 Action Journal — currently enabled per user email. Everyone else keeps
 * the original post-market reflection / journal prompts.
 *
 * Keep in sync with the BE copy in
 * koblich_chronicles_be/koblich-chronicles-be/src/utilities/actionJournal.ts
 * (the BE list gates the AI coaching instruction).
 */
export const ACTION_JOURNAL_EMAILS = ["mikulkal@atlas.cz"];

export function isActionJournalUser(user: { email?: string | null } | null | undefined): boolean {
  const email = user?.email?.trim().toLowerCase();
  return !!email && ACTION_JOURNAL_EMAILS.includes(email);
}

export const PILLARS: {
  value: ActionJournalPillar;
  label: string;
  short: string;
  question: string;
}[] = [
  {
    value: "self_state",
    label: "Self-State (Being)",
    short: "Self-State",
    question: "Was I operating from cognitive clarity, or was I reactive, fatigued or emotionally hijacked?",
  },
  {
    value: "process",
    label: "Process Adherence",
    short: "Process",
    question: 'Did I understand my edge and stick to it, or did I "freestyle" outside my proven framework?',
  },
  {
    value: "market",
    label: "Market Engagement (Behaviours)",
    short: "Market",
    question: "Did I maintain agency, or did the market's volatility dictate my behavioural response?",
  },
];

const PILLAR_LONG: Record<ActionJournalPillar, string> = {
  self_state: "Self-State",
  process: "Process Adherence",
  market: "Market Engagement",
};

// Prompt labels written into journal guidedPrompts. Must match the BE
// ACTION_JOURNAL_PROMPTS in hooks/populateJournalPrompts.ts.
export const ACTION_JOURNAL_PROMPTS = {
  didWell: "3 Things I Did Well",
  improvement: "3 Things for Improvement",
  actionStep: "1 Action Step Forward",
  context: "Market & week context",
} as const;

const emptyItems = (): ActionJournalItem[] =>
  Array.from({ length: 3 }, () => ({ text: "", pillar: null }));

export function emptyActionJournal(): ActionJournalData {
  return { didWell: emptyItems(), improvement: emptyItems(), actionStep: "", context: "" };
}

/** Always returns exactly 3 + 3 items so the form can render fixed slots. */
export function normalizeActionJournal(value?: Partial<ActionJournalData> | null): ActionJournalData {
  const pad = (items?: ActionJournalItem[]) => {
    const out = emptyItems();
    (items ?? []).slice(0, 3).forEach((item, i) => {
      out[i] = { text: item?.text ?? "", pillar: item?.pillar ?? null };
    });
    return out;
  };
  return {
    didWell: pad(value?.didWell),
    improvement: pad(value?.improvement),
    actionStep: value?.actionStep ?? "",
    context: value?.context ?? "",
  };
}

/** "1. [Process Adherence] text" lines — the mirrored, human-readable copy. */
export function formatItems(items: ActionJournalItem[]): string {
  return items
    .filter((i) => i.text.trim())
    .map((i, idx) => `${idx + 1}. ${i.pillar ? `[${PILLAR_LONG[i.pillar]}] ` : ""}${i.text.trim()}`)
    .join("\n");
}

/** Mirrors the structured 3-3-1 into the legacy check-in reflection fields. */
export function actionJournalToReflections(aj: ActionJournalData) {
  return {
    whatWentWell: formatItems(aj.didWell),
    whatWentPoorly: formatItems(aj.improvement),
    tomorrowFocus: aj.actionStep.trim(),
  };
}

/** Mirrors the structured 3-3-1 into journal guidedPrompts. */
export function actionJournalToGuidedPrompts(aj: ActionJournalData) {
  return [
    { prompt: ACTION_JOURNAL_PROMPTS.didWell, response: formatItems(aj.didWell) },
    { prompt: ACTION_JOURNAL_PROMPTS.improvement, response: formatItems(aj.improvement) },
    { prompt: ACTION_JOURNAL_PROMPTS.actionStep, response: aj.actionStep.trim() },
    { prompt: ACTION_JOURNAL_PROMPTS.context, response: aj.context.trim() },
  ];
}

export function hasActionJournalContent(aj: ActionJournalData): boolean {
  return (
    aj.didWell.some((i) => i.text.trim()) ||
    aj.improvement.some((i) => i.text.trim()) ||
    !!aj.actionStep.trim() ||
    !!aj.context.trim()
  );
}
