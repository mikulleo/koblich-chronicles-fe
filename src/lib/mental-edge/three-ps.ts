import type { ThreePKey, ThreePsData } from "@/lib/types";

/**
 * Pre-market 3Ps alignment (Steven Goldstein): Purpose, Presence, Process.
 * Shown to Action Journal users only (isActionJournalUser).
 *
 * Keep the shape in sync with the BE copy in
 * koblich_chronicles_be/koblich-chronicles-be/src/utilities/threePs.ts
 */
export const THREE_PS: {
  key: ThreePKey;
  label: string;
  question: string;
  labels: [string, string];
  placeholder: string;
}[] = [
  {
    key: "purpose",
    label: "Purpose",
    question: "Am I connected to why I trade — beyond today's P&L?",
    labels: ["Disconnected", "Clear & anchored"],
    placeholder: "Today I'm trading to…",
  },
  {
    key: "presence",
    label: "Presence",
    question: "Am I here, now — or replaying yesterday and projecting into outcomes?",
    labels: ["Elsewhere", "Fully present"],
    placeholder: "What could pull me out of the moment, and how will I come back?",
  },
  {
    key: "process",
    label: "Process",
    question: "Do I know exactly what executing my process well looks like today?",
    labels: ["Fuzzy", "Crystal clear"],
    placeholder: "Setups I'll take, risk per trade, what I won't do…",
  },
];

/** Always returns all three Ps so the form can render fixed slots. */
export function normalizeThreePs(value?: Partial<ThreePsData> | null): ThreePsData {
  const entry = (k: ThreePKey) => ({
    rating: value?.[k]?.rating ?? 3,
    note: value?.[k]?.note ?? "",
  });
  return { purpose: entry("purpose"), presence: entry("presence"), process: entry("process") };
}
