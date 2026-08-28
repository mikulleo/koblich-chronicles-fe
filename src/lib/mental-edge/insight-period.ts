/**
 * Analysis windows for the Insights dashboard.
 *
 * Every period resolves to a pair of bare `YYYY-MM-DD` strings built from the
 * user's *local* calendar — using `toISOString()` would shift the boundary a day
 * for anyone west of UTC and quietly drop the first/last day of the window.
 */

export type InsightPeriodId =
  | "all"
  | "week"
  | "mtd"
  | "last30"
  | "last90"
  | "ytd"
  | "custom";

export interface InsightPeriodRange {
  startDate?: string;
  endDate?: string;
}

export interface CustomRange {
  from?: Date;
  to?: Date;
}

export const INSIGHT_PERIOD_OPTIONS: Array<{ id: InsightPeriodId; label: string }> = [
  { id: "all", label: "All time" },
  { id: "week", label: "This week" },
  { id: "mtd", label: "Month to date" },
  { id: "last30", label: "Last 30 days" },
  { id: "last90", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
  { id: "custom", label: "Custom range" },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Build a "YYYY-MM-DD" string from a Date in local time (no UTC shift). */
export function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parse a "YYYY-MM-DD" string as local noon, safe for display formatting. */
export function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

const daysAgo = (today: Date, n: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);

/**
 * Turn a period selection into the query window sent to the API.
 * "All time" and an incomplete custom range both resolve to no bounds.
 */
export function resolveInsightPeriod(
  period: InsightPeriodId,
  custom?: CustomRange,
  now: Date = new Date(),
): InsightPeriodRange {
  if (period === "all") return {};

  if (period === "custom") {
    if (!custom?.from || !custom?.to) return {};
    const [from, to] =
      custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
    return { startDate: toLocalISODate(from), endDate: toLocalISODate(to) };
  }

  const endDate = toLocalISODate(now);
  let start: Date;

  switch (period) {
    case "week": {
      // Week starts Monday, matching the rest of the app's period filters.
      const day = now.getDay();
      const offset = day === 0 ? 6 : day - 1;
      start = daysAgo(now, offset);
      break;
    }
    case "mtd":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last30":
      start = daysAgo(now, 29);
      break;
    case "last90":
      start = daysAgo(now, 89);
      break;
    case "ytd":
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { startDate: toLocalISODate(start), endDate };
}

export function periodLabel(period: InsightPeriodId): string {
  return INSIGHT_PERIOD_OPTIONS.find((o) => o.id === period)?.label ?? "All time";
}

/** True when the user picked "custom" but hasn't finished choosing both dates. */
export function isIncompleteCustom(period: InsightPeriodId, custom?: CustomRange): boolean {
  return period === "custom" && !(custom?.from && custom?.to);
}
